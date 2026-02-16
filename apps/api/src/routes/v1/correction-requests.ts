import { Router, Request, Response } from 'express';
import { and, eq, desc } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { correction_requests, time_entries, notifications, member } from '../../db/schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logTimeEntryAudit } from '../../services/audit.service.js';
import { ComplianceValidator } from '../../services/compliance-validator.js';

import type { TimeEntry, ValidationContext } from '../../services/compliance-validator.js';
import logger from '../../lib/logger.js';

const router = Router();

/**
 * Helper: Get user's role in organization
 */
async function getUserRole(userId: string, organizationId: string): Promise<string | null> {
  const memberResult = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, userId),
        eq(member.organizationId, organizationId)
      )
    )
    .limit(1);

  return memberResult.length > 0 ? memberResult[0]!.role : null;
}

/**
 * Helper: Validate corrected times are within same day
 */
function validateSameDay(clockIn: Date, clockOut: Date): boolean {
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  
  return (
    clockInDate.getFullYear() === clockOutDate.getFullYear() &&
    clockInDate.getMonth() === clockOutDate.getMonth() &&
    clockInDate.getDate() === clockOutDate.getDate()
  );
}

/**
 * POST /api/v1/org/:slug/corrections - Create correction request
 */
async function handleCreateCorrectionRequest(req: Request, res: Response) {
  try {
    const userId = req.session!.user.id;
    const organizationId = req.organizationId!;
    const { time_entry_id, requested_clock_in, requested_clock_out, reason } = req.body;

    // 1. Validate inputs
    if (!time_entry_id) {
      return res.status(400).json({ message: 'time_entry_id is required' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ message: 'reason is required and must be a non-empty string' });
    }
    if (!requested_clock_in && !requested_clock_out) {
      return res.status(400).json({ 
        message: 'At least one of requested_clock_in or requested_clock_out must be provided' 
      });
    }

    // 2. Verify time entry exists and belongs to user
    const timeEntryResult = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.id, time_entry_id as string),
          eq(time_entries.user_id, userId),
          eq(time_entries.organization_id, organizationId)
        )
      )
      .limit(1);

    if (timeEntryResult.length === 0) {
      return res.status(404).json({ message: 'Time entry not found or does not belong to you' });
    }

    const timeEntry = timeEntryResult[0]!;

    // 3. Parse and validate corrected times
    const requestedClockIn = requested_clock_in 
      ? new Date(requested_clock_in as string) 
      : timeEntry.clock_in;
    const requestedClockOut = requested_clock_out 
      ? new Date(requested_clock_out as string) 
      : timeEntry.clock_out;

    // Validate that clock_out exists
    if (!requestedClockOut) {
      return res.status(400).json({ 
        message: 'Cannot create correction request: time entry has no clock_out time' 
      });
    }

    // Validate corrected times are within same day
    if (!validateSameDay(requestedClockIn, requestedClockOut)) {
      return res.status(400).json({ 
        message: 'Corrected times must be within the same day' 
      });
    }

    // Validate chronological order
    if (requestedClockIn >= requestedClockOut) {
      return res.status(400).json({ 
        message: 'Clock-in time must be before clock-out time' 
      });
    }

    // 4. Create correction request with JSONB fields
    const originalData = {
      clock_in: timeEntry.clock_in.toISOString(),
      clock_out: timeEntry.clock_out?.toISOString() || null,
      break_minutes: timeEntry.break_minutes || 0,
    };

    const requestedData = {
      clock_in: requestedClockIn.toISOString(),
      clock_out: requestedClockOut.toISOString(),
      break_minutes: timeEntry.break_minutes || 0,
    };

    const [correctionRequest] = await db
      .insert(correction_requests)
      .values({
        organization_id: organizationId,
        time_entry_id: time_entry_id as string,
        requested_by: userId,
        original_data: originalData,
        requested_data: requestedData,
        reason: reason as string,
        status: 'pending',
      })
      .returning();

    // 5. Notify managers in organization
    const managers = await db
      .select({ user_id: member.userId })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.role, 'manager')
        )
      );

    for (const manager of managers) {
      await db.insert(notifications).values({
        organization_id: organizationId,
        user_id: manager.user_id,
        type: 'correction_request',
        title: 'Time Correction Request',
        message: `${req.session!.user.name} has requested a time correction`,
        link: `/corrections/${correctionRequest!.id}`,
        read: false,
      });
    }

    res.status(201).json({ 
      message: 'Correction request created',
      correction: correctionRequest,
    });
  } catch (error) {
    logger.error('Error creating correction request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * GET /api/v1/org/:slug/corrections - List correction requests
 */
async function handleListCorrectionRequests(req: Request, res: Response) {
  try {
    const userId = req.session!.user.id;
    const organizationId = req.organizationId!;
    const userRole = await getUserRole(userId, organizationId);

    // Managers see all, employees see only their own
    const isManagerOrHigher = ['manager', 'tenantAdmin', 'owner'].includes(userRole || '');

    let corrections;
    if (isManagerOrHigher) {
      corrections = await db
        .select()
        .from(correction_requests)
        .where(eq(correction_requests.organization_id, organizationId))
        .orderBy(desc(correction_requests.created_at));
    } else {
      corrections = await db
        .select()
        .from(correction_requests)
        .where(
          and(
            eq(correction_requests.organization_id, organizationId),
            eq(correction_requests.requested_by, userId)
          )
        )
        .orderBy(desc(correction_requests.created_at));
    }

    res.json({ 
      corrections,
      count: corrections.length,
    });
  } catch (error) {
    logger.error('Error listing correction requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * PATCH /api/v1/org/:slug/corrections/:id/approve - Approve correction request
 */
async function handleApproveCorrectionRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.session!.user.id;
    const organizationId = req.organizationId!;

    // 1. Fetch correction request
    const correctionRequestResult = await db
      .select()
      .from(correction_requests)
      .where(
        and(
          eq(correction_requests.id, id as string),
          eq(correction_requests.organization_id, organizationId)
        )
      )
      .limit(1);

    if (correctionRequestResult.length === 0) {
      return res.status(404).json({ message: 'Correction request not found' });
    }

    const correctionRequest = correctionRequestResult[0]!;

    if (correctionRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Correction request already processed (status: ${correctionRequest.status})` 
      });
    }

    // 2. Fetch time entry
    const timeEntryResult = await db
      .select()
      .from(time_entries)
      .where(eq(time_entries.id, correctionRequest.time_entry_id))
      .limit(1);

    if (timeEntryResult.length === 0) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    const timeEntry = timeEntryResult[0]!;

    // 3. Parse requested data
    const requestedData = correctionRequest.requested_data as any;
    const requestedClockIn = new Date(requestedData.clock_in);
    const requestedClockOut = new Date(requestedData.clock_out);

    // 4. Run compliance validation on corrected times
    const validator = new ComplianceValidator();
    
    // Create mock entry with corrected times
    const mockEntry: TimeEntry = {
      id: timeEntry.id,
      clock_in: requestedClockIn,
      clock_out: requestedClockOut,
      break_minutes: requestedData.break_minutes || 0,
      clock_in_location: timeEntry.clock_in_location as any,
      clock_out_location: timeEntry.clock_out_location as any,
    };

    // Fetch all time entries for the week to validate weekly limits
    const weekStart = new Date(requestedClockIn);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const allEntriesResult = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.user_id, timeEntry.user_id),
          eq(time_entries.organization_id, organizationId)
        )
      );

    // Convert to TimeEntry format and replace current entry with corrected version
    const allEntries: TimeEntry[] = allEntriesResult.map((entry) => {
      if (entry.id === timeEntry.id) {
        return mockEntry; // Use corrected data for this entry
      }
      return {
        id: entry.id,
        clock_in: entry.clock_in,
        clock_out: entry.clock_out || null,
        break_minutes: entry.break_minutes || 0,
        clock_in_location: entry.clock_in_location as any,
        clock_out_location: entry.clock_out_location as any,
      };
    });

    const validationContext: ValidationContext = {
      currentEntry: mockEntry,
      allEntries,
      breaks: [], // Simplified - would need to fetch breaks in production
      locationCoords: [0, 0], // Simplified - would need to fetch location coords
      userCoords: [0, 0], // Simplified
    };

    const validationResults = validator.validateAll(validationContext);

    // Check for critical violations
    const criticalViolations = validationResults.filter(
      (r) => !r.pass && r.severity === 'critical'
    );

    if (criticalViolations.length > 0) {
      return res.status(400).json({
        message: 'Corrected times violate compliance rules',
        violations: criticalViolations.map((v) => ({
          message: v.message,
          ruleReference: v.ruleReference,
          recommendedAction: v.recommendedAction,
        })),
      });
    }

    // 5. Update time entry, correction request, log audit, notify employee (transaction)
    await db.transaction(async (tx) => {
      // Update time entry
      await tx
        .update(time_entries)
        .set({
          clock_in: requestedClockIn,
          clock_out: requestedClockOut,
          break_minutes: requestedData.break_minutes || 0,
          total_minutes: Math.floor(
            (requestedClockOut.getTime() - requestedClockIn.getTime()) / (1000 * 60) -
              (requestedData.break_minutes || 0)
          ),
          updated_at: new Date(),
        })
        .where(eq(time_entries.id, timeEntry.id));

      // Update correction request
      await tx
        .update(correction_requests)
        .set({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date(),
        })
        .where(eq(correction_requests.id, id as string));

      // Log audit
      await logTimeEntryAudit({
        orgId: organizationId,
        userId: timeEntry.user_id,
        timeEntryId: timeEntry.id,
        clockIn: requestedClockIn,
        clockOut: requestedClockOut,
        breakMinutes: requestedData.break_minutes || 0,
        action: 'update',
      });

      // Notify employee
      await tx.insert(notifications).values({
        organization_id: organizationId,
        user_id: correctionRequest.requested_by,
        type: 'correction_approved',
        title: 'Time Correction Approved',
        message: 'Your time correction request has been approved',
        link: `/time-entries/${timeEntry.id}`,
        read: false,
      });
    });

    res.json({ 
      message: 'Correction request approved',
      warnings: validationResults
        .filter((r) => !r.pass && r.severity !== 'critical')
        .map((v) => v.message),
    });
  } catch (error) {
    logger.error('Error approving correction request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * PATCH /api/v1/org/:slug/corrections/:id/reject - Reject correction request
 */
async function handleRejectCorrectionRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = req.session!.user.id;
    const organizationId = req.organizationId!;

    if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length === 0) {
      return res.status(400).json({ message: 'rejection_reason is required and must be a non-empty string' });
    }

    // 1. Fetch correction request
    const correctionRequestResult = await db
      .select()
      .from(correction_requests)
      .where(
        and(
          eq(correction_requests.id, id as string),
          eq(correction_requests.organization_id, organizationId)
        )
      )
      .limit(1);

    if (correctionRequestResult.length === 0) {
      return res.status(404).json({ message: 'Correction request not found' });
    }

    const correctionRequest = correctionRequestResult[0]!;

    if (correctionRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Correction request already processed (status: ${correctionRequest.status})` 
      });
    }

    // 2. Update correction request and notify employee (transaction)
    await db.transaction(async (tx) => {
      // Update correction request with rejection reason
      const updatedRequestedData = {
        ...(correctionRequest.requested_data as any),
        rejection_reason: rejection_reason as string,
      };

      await tx
        .update(correction_requests)
        .set({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date(),
          requested_data: updatedRequestedData,
        })
        .where(eq(correction_requests.id, id as string));

      // Notify employee
      await tx.insert(notifications).values({
        organization_id: organizationId,
        user_id: correctionRequest.requested_by,
        type: 'correction_rejected',
        title: 'Time Correction Rejected',
        message: `Your time correction request was rejected: ${rejection_reason}`,
        link: `/corrections/${id}`,
        read: false,
      });
    });

    res.json({ message: 'Correction request rejected' });
  } catch (error) {
    logger.error('Error rejecting correction request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Route definitions
router.post('/', handleCreateCorrectionRequest);
router.get('/', handleListCorrectionRequests);
router.patch('/:id/approve', requireRole(['manager', 'tenantAdmin', 'owner']), handleApproveCorrectionRequest);
router.patch('/:id/reject', requireRole(['manager', 'tenantAdmin', 'owner']), handleRejectCorrectionRequest);

export default router;

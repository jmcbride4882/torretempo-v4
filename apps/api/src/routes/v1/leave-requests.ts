import { Router, Request, Response } from 'express';
import { and, eq, or, lte, gte, desc } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { leave_requests, employee_profiles, member, user } from '../../db/schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAudit } from '../../services/audit.service.js';

// Valid enum values
const VALID_LEAVE_TYPES = ['vacation', 'sick', 'personal', 'unpaid'] as const;
type LeaveType = typeof VALID_LEAVE_TYPES[number];

/**
 * Type guard to check if a value is a valid LeaveType
 */
function isValidLeaveType(value: unknown): value is LeaveType {
  return typeof value === 'string' && (VALID_LEAVE_TYPES as readonly string[]).includes(value);
}

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
 * Helper: Calculate working days between two dates (excludes weekends)
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Helper: Check for overlapping leave requests
 */
async function checkOverlappingLeave(
  userId: string,
  organizationId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string
): Promise<boolean> {
  const conditions = [
    eq(leave_requests.user_id, userId),
    eq(leave_requests.organization_id, organizationId),
    eq(leave_requests.status, 'approved'),
    or(
      // New request starts during existing leave
      and(
        lte(leave_requests.start_date, startDate),
        gte(leave_requests.end_date, startDate)
      ),
      // New request ends during existing leave
      and(
        lte(leave_requests.start_date, endDate),
        gte(leave_requests.end_date, endDate)
      ),
      // New request encompasses existing leave
      and(
        gte(leave_requests.start_date, startDate),
        lte(leave_requests.end_date, endDate)
      )
    )
  ];

  // Exclude current leave request if updating
  const query = db
    .select()
    .from(leave_requests)
    .where(and(...conditions));

  const overlapping = await query;

  // Filter out the excluded ID if provided
  const filtered = excludeId 
    ? overlapping.filter(req => req.id !== excludeId)
    : overlapping;

  return filtered.length > 0;
}

/**
 * Helper: Check leave balance
 */
async function checkLeaveBalance(
  userId: string,
  organizationId: string,
  daysRequested: number
): Promise<{ valid: boolean; available: number; message?: string }> {
  const profileResult = await db
    .select()
    .from(employee_profiles)
    .where(
      and(
        eq(employee_profiles.user_id, userId),
        eq(employee_profiles.organization_id, organizationId)
      )
    )
    .limit(1);

  if (profileResult.length === 0) {
    return { 
      valid: false, 
      available: 0, 
      message: 'Employee profile not found. Please complete your profile first.' 
    };
  }

  const profile = profileResult[0]!;
  const accrued = Number(profile.vacation_days_accrued) || 0;
  const used = Number(profile.vacation_days_used) || 0;
  const remaining = accrued - used;

  if (remaining < daysRequested) {
    return {
      valid: false,
      available: remaining,
      message: `Insufficient leave balance. Available: ${remaining} days, Requested: ${daysRequested} days`
    };
  }

  return { valid: true, available: remaining };
}

// GET /api/v1/org/:slug/leave-requests - List leave requests
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.session!.user.id;
    const userRole = await getUserRole(userId, organizationId);

    // Manager+ sees all, employee sees only their own
    const isManagerOrHigher = ['manager', 'tenantAdmin', 'owner'].includes(userRole || '');

    let requests;
    if (isManagerOrHigher) {
      // Fetch all leave requests with user info
      requests = await db
        .select({
          id: leave_requests.id,
          user_id: leave_requests.user_id,
          organization_id: leave_requests.organization_id,
          leave_type: leave_requests.leave_type,
          start_date: leave_requests.start_date,
          end_date: leave_requests.end_date,
          days_count: leave_requests.days_count,
          reason: leave_requests.reason,
          status: leave_requests.status,
          requested_at: leave_requests.requested_at,
          approved_by: leave_requests.approved_by,
          approved_at: leave_requests.approved_at,
          rejection_reason: leave_requests.rejection_reason,
          doctors_note_url: leave_requests.doctors_note_url,
          doctors_note_verified: leave_requests.doctors_note_verified,
          created_at: leave_requests.created_at,
          updated_at: leave_requests.updated_at,
          user_name: user.name,
          user_email: user.email,
        })
        .from(leave_requests)
        .leftJoin(user, eq(leave_requests.user_id, user.id))
        .where(eq(leave_requests.organization_id, organizationId))
        .orderBy(desc(leave_requests.requested_at));
    } else {
      // Fetch only own leave requests
      requests = await db
        .select({
          id: leave_requests.id,
          user_id: leave_requests.user_id,
          organization_id: leave_requests.organization_id,
          leave_type: leave_requests.leave_type,
          start_date: leave_requests.start_date,
          end_date: leave_requests.end_date,
          days_count: leave_requests.days_count,
          reason: leave_requests.reason,
          status: leave_requests.status,
          requested_at: leave_requests.requested_at,
          approved_by: leave_requests.approved_by,
          approved_at: leave_requests.approved_at,
          rejection_reason: leave_requests.rejection_reason,
          doctors_note_url: leave_requests.doctors_note_url,
          doctors_note_verified: leave_requests.doctors_note_verified,
          created_at: leave_requests.created_at,
          updated_at: leave_requests.updated_at,
          user_name: user.name,
          user_email: user.email,
        })
        .from(leave_requests)
        .leftJoin(user, eq(leave_requests.user_id, user.id))
        .where(
          and(
            eq(leave_requests.user_id, userId),
            eq(leave_requests.organization_id, organizationId)
          )
        )
        .orderBy(desc(leave_requests.requested_at));
    }

    res.json({ leave_requests: requests, count: requests.length });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ message: 'Failed to fetch leave requests' });
  }
});

// GET /api/v1/org/:slug/leave-requests/:id - Get single leave request
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.session!.user.id;
    const requestId = req.params.id as string;

    // Fetch leave request with user info
    const requestResult = await db
      .select({
        id: leave_requests.id,
        user_id: leave_requests.user_id,
        organization_id: leave_requests.organization_id,
        leave_type: leave_requests.leave_type,
        start_date: leave_requests.start_date,
        end_date: leave_requests.end_date,
        days_count: leave_requests.days_count,
        reason: leave_requests.reason,
        status: leave_requests.status,
        requested_at: leave_requests.requested_at,
        approved_by: leave_requests.approved_by,
        approved_at: leave_requests.approved_at,
        rejection_reason: leave_requests.rejection_reason,
        doctors_note_url: leave_requests.doctors_note_url,
        doctors_note_verified: leave_requests.doctors_note_verified,
        created_at: leave_requests.created_at,
        updated_at: leave_requests.updated_at,
        user_name: user.name,
        user_email: user.email,
      })
      .from(leave_requests)
      .leftJoin(user, eq(leave_requests.user_id, user.id))
      .where(
        and(
          eq(leave_requests.id, requestId),
          eq(leave_requests.organization_id, organizationId)
        )
      )
      .limit(1);

    if (requestResult.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult[0]!;

    // Check access: user can access their own request OR must be manager+
    const userRole = await getUserRole(userId, organizationId);
    const isManagerOrHigher = ['manager', 'tenantAdmin', 'owner'].includes(userRole || '');
    const isOwnRequest = leaveRequest.user_id === userId;

    if (!isOwnRequest && !isManagerOrHigher) {
      return res.status(403).json({ message: 'Insufficient permissions to view this leave request' });
    }

    res.json({ leave_request: leaveRequest });
  } catch (error) {
    console.error('Error fetching leave request:', error);
    res.status(500).json({ message: 'Failed to fetch leave request' });
  }
});

// POST /api/v1/org/:slug/leave-requests - Create leave request (all users)
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.session!.user.id;
    const { leave_type, start_date, end_date, reason, doctors_note_url } = req.body;

    // Validate required fields
    if (!leave_type) {
      return res.status(400).json({ message: 'leave_type is required' });
    }
    if (!start_date) {
      return res.status(400).json({ message: 'start_date is required' });
    }
    if (!end_date) {
      return res.status(400).json({ message: 'end_date is required' });
    }

    // Validate leave_type enum
    if (!isValidLeaveType(leave_type)) {
      return res.status(400).json({ 
        message: `Invalid leave_type. Must be one of: ${VALID_LEAVE_TYPES.join(', ')}` 
      });
    }

    // Parse dates
    const startDateObj = new Date(start_date as string);
    const endDateObj = new Date(end_date as string);

    // Validate date range
    if (startDateObj > endDateObj) {
      return res.status(400).json({ message: 'start_date must be before or equal to end_date' });
    }

    // Calculate working days
    const daysCount = calculateWorkingDays(startDateObj, endDateObj);

    if (daysCount === 0) {
      return res.status(400).json({ message: 'Leave request must include at least one working day' });
    }

    // Check for overlapping leave
    const hasOverlap = await checkOverlappingLeave(userId, organizationId, startDateObj, endDateObj);
    if (hasOverlap) {
      return res.status(400).json({ 
        message: 'Leave dates overlap with existing approved leave request' 
      });
    }

    // Create leave request
    const newRequest = await db
      .insert(leave_requests)
      .values({
        user_id: userId,
        organization_id: organizationId,
        leave_type: leave_type,
        start_date: startDateObj,
        end_date: endDateObj,
        days_count: String(daysCount),
        reason: reason as string | null,
        status: 'pending',
        doctors_note_url: doctors_note_url as string | undefined,
        doctors_note_verified: false,
      })
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'leave_request.create',
      entityType: 'leave_requests',
      entityId: newRequest[0]!.id,
      newData: {
        id: newRequest[0]!.id,
        leave_type: newRequest[0]!.leave_type,
        start_date: newRequest[0]!.start_date,
        end_date: newRequest[0]!.end_date,
        days_count: newRequest[0]!.days_count,
      },
    });

    res.status(201).json({ leave_request: newRequest[0] });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ message: 'Failed to create leave request' });
  }
});

// PATCH /api/v1/org/:slug/leave-requests/:id/approve - Approve leave request (manager+ only)
router.patch('/:id/approve', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const approverId = req.session!.user.id;
    const requestId = req.params.id as string;

    // Fetch leave request
    const requestResult = await db
      .select()
      .from(leave_requests)
      .where(
        and(
          eq(leave_requests.id, requestId),
          eq(leave_requests.organization_id, organizationId)
        )
      )
      .limit(1);

    if (requestResult.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult[0]!;

    // Check if already approved/rejected
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot approve leave request with status: ${leaveRequest.status}` 
      });
    }

    // Prevent self-approval
    if (leaveRequest.user_id === approverId) {
      return res.status(400).json({ message: 'You cannot approve your own leave request' });
    }

    // Check leave balance for vacation requests
    if (leaveRequest.leave_type === 'vacation') {
      const balanceCheck = await checkLeaveBalance(
        leaveRequest.user_id,
        organizationId,
        Number(leaveRequest.days_count)
      );

      if (!balanceCheck.valid) {
        return res.status(400).json({ 
          message: balanceCheck.message,
          available: balanceCheck.available,
          requested: Number(leaveRequest.days_count)
        });
      }
    }

    // Check for overlapping leave (in case another request was approved after this was created)
    const hasOverlap = await checkOverlappingLeave(
      leaveRequest.user_id,
      organizationId,
      leaveRequest.start_date,
      leaveRequest.end_date,
      requestId
    );

    if (hasOverlap) {
      return res.status(400).json({ 
        message: 'Cannot approve: leave dates now overlap with another approved leave request' 
      });
    }

    // Approve leave request
    const updatedRequest = await db
      .update(leave_requests)
      .set({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(leave_requests.id, requestId),
          eq(leave_requests.organization_id, organizationId)
        )
      )
      .returning();

    // Update vacation days balance if vacation type
    let updatedBalance = null;
    if (leaveRequest.leave_type === 'vacation') {
      const profileResult = await db
        .select()
        .from(employee_profiles)
        .where(
          and(
            eq(employee_profiles.user_id, leaveRequest.user_id),
            eq(employee_profiles.organization_id, organizationId)
          )
        )
        .limit(1);

      if (profileResult.length > 0) {
        const profile = profileResult[0]!;
        const currentUsed = Number(profile.vacation_days_used) || 0;
        const newUsed = currentUsed + Number(leaveRequest.days_count);

        await db
          .update(employee_profiles)
          .set({
            vacation_days_used: String(newUsed),
            updated_at: new Date(),
          })
          .where(
            and(
              eq(employee_profiles.user_id, leaveRequest.user_id),
              eq(employee_profiles.organization_id, organizationId)
            )
          );

        updatedBalance = {
          accrued: Number(profile.vacation_days_accrued),
          used: newUsed,
          remaining: Number(profile.vacation_days_accrued) - newUsed,
        };
      }
    }

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: approverId,
      action: 'leave_request.approve',
      entityType: 'leave_requests',
      entityId: requestId,
      oldData: {
        status: leaveRequest.status,
      },
      newData: {
        status: 'approved',
        approved_by: approverId,
        approved_at: updatedRequest[0]!.approved_at,
      },
    });

    res.json({ 
      message: 'Leave request approved',
      leave_request: updatedRequest[0],
      updated_balance: updatedBalance,
    });
  } catch (error) {
    console.error('Error approving leave request:', error);
    res.status(500).json({ message: 'Failed to approve leave request' });
  }
});

// PATCH /api/v1/org/:slug/leave-requests/:id/reject - Reject leave request (manager+ only)
router.patch('/:id/reject', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const reviewerId = req.session!.user.id;
    const requestId = req.params.id as string;
    const { rejection_reason } = req.body;

    // Validate rejection reason
    if (!rejection_reason) {
      return res.status(400).json({ message: 'rejection_reason is required' });
    }

    // Fetch leave request
    const requestResult = await db
      .select()
      .from(leave_requests)
      .where(
        and(
          eq(leave_requests.id, requestId),
          eq(leave_requests.organization_id, organizationId)
        )
      )
      .limit(1);

    if (requestResult.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult[0]!;

    // Check if already approved/rejected
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot reject leave request with status: ${leaveRequest.status}` 
      });
    }

    // Reject leave request
    const updatedRequest = await db
      .update(leave_requests)
      .set({
        status: 'rejected',
        rejection_reason: rejection_reason as string,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(leave_requests.id, requestId),
          eq(leave_requests.organization_id, organizationId)
        )
      )
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: reviewerId,
      action: 'leave_request.reject',
      entityType: 'leave_requests',
      entityId: requestId,
      oldData: {
        status: leaveRequest.status,
      },
      newData: {
        status: 'rejected',
        rejection_reason: rejection_reason,
      },
    });

    res.json({ 
      message: 'Leave request rejected',
      leave_request: updatedRequest[0],
    });
  } catch (error) {
    console.error('Error rejecting leave request:', error);
    res.status(500).json({ message: 'Failed to reject leave request' });
  }
});

// DELETE /api/v1/org/:slug/leave-requests/:id - Cancel leave request (creator only, pending status only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.session!.user.id;
    const requestId = req.params.id as string;

    // Fetch leave request
    const requestResult = await db
      .select()
      .from(leave_requests)
      .where(
        and(
          eq(leave_requests.id, requestId),
          eq(leave_requests.organization_id, organizationId)
        )
      )
      .limit(1);

    if (requestResult.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult[0]!;

    // Check if user is the creator
    if (leaveRequest.user_id !== userId) {
      return res.status(403).json({ message: 'You can only cancel your own leave requests' });
    }

    // Check if still pending
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel leave request with status: ${leaveRequest.status}. Only pending requests can be cancelled.` 
      });
    }

    // Update status to cancelled instead of deleting (better for audit trail)
    await db
      .update(leave_requests)
      .set({
        status: 'cancelled',
        updated_at: new Date(),
      })
      .where(
        and(
          eq(leave_requests.id, requestId),
          eq(leave_requests.organization_id, organizationId)
        )
      );

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'leave_request.cancel',
      entityType: 'leave_requests',
      entityId: requestId,
      oldData: {
        status: leaveRequest.status,
      },
      newData: {
        status: 'cancelled',
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    res.status(500).json({ message: 'Failed to cancel leave request' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { and, eq, desc, isNull, gte } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { time_entries, break_entries, compliance_checks } from '../../db/schema.js';
import { ComplianceValidator } from '../../services/compliance-validator.js';
import { logAudit } from '../../services/audit.service.js';
import { broadcastToOrg } from '../../lib/websocket.js';
import type { ValidationContext } from '../../services/compliance-validator.js';
import logger from '../../lib/logger.js';

const router = Router();

/**
 * Helper: Get authenticated user from request
 */
function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ message: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}



// POST /api/v1/org/:slug/time-entries/clock-in - Clock in
async function handleClockIn(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const {
      linked_shift_id,
      latitude,
      longitude,
      accuracy,
      method = 'tap',
    } = req.body;

    // Validate method
    if (!['tap', 'nfc', 'qr', 'pin'].includes(method)) {
      return res.status(400).json({ message: 'Invalid clock-in method. Must be: tap, nfc, qr, or pin' });
    }

    // 1. Check if user is already clocked in (active time entry with no clock_out)
    const activeEntry = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.user_id, actor.id),
          eq(time_entries.organization_id, organizationId),
          eq(time_entries.status, 'active'),
          isNull(time_entries.clock_out)
        )
      )
      .limit(1);

    if (activeEntry.length > 0) {
      return res.status(400).json({
        message: 'You are already clocked in',
        active_entry: activeEntry[0],
      });
    }

    // 2. Build clock_in_location object
    const clock_in_location = (latitude !== undefined && longitude !== undefined)
      ? { lat: latitude, lng: longitude, accuracy: accuracy || null }
      : null;

    // 3. Create time entry
    const now = new Date();
    const [timeEntry] = await db
      .insert(time_entries)
      .values({
        user_id: actor.id,
        organization_id: organizationId,
        linked_shift_id: linked_shift_id || null,
        entry_date: now,
        clock_in: now,
        clock_in_location: clock_in_location,
        clock_in_method: method,
        status: 'active',
      })
      .returning();

    // 4. Broadcast clock-in event to organization (managers only)
    const user = req.user as any;
    broadcastToOrg(organizationId, 'attendance:clock-in', {
      userId: actor.id,
      userName: user?.name || user?.email || 'Unknown User',
      timestamp: now.toISOString(),
      location: linked_shift_id,
      method,
    });

    res.json({
      message: 'Clocked in successfully',
      time_entry: timeEntry,
    });
  } catch (error) {
    logger.error('Error clocking in:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/v1/org/:slug/time-entries/clock-out - Clock out
async function handleClockOut(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const {
      latitude,
      longitude,
      accuracy,
      method = 'tap',
    } = req.body;

    // Check for manager override
    const override = req.query.override === 'true';
    const reason = req.query.reason as string | undefined;
    const isManager = ['manager', 'tenantAdmin', 'owner'].includes(actor.role);

    // Validate method
    if (!['tap', 'nfc', 'qr', 'pin'].includes(method)) {
      return res.status(400).json({ message: 'Invalid clock-out method. Must be: tap, nfc, qr, or pin' });
    }

    // 1. Find active time entry (status = active, clock_out is null)
    const activeEntry = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.user_id, actor.id),
          eq(time_entries.organization_id, organizationId),
          eq(time_entries.status, 'active'),
          isNull(time_entries.clock_out)
        )
      )
      .limit(1);

    if (activeEntry.length === 0) {
      return res.status(400).json({ message: 'You are not clocked in' });
    }

    const entry = activeEntry[0]!;

    // 2. Calculate clock-out time
    const clockOut = new Date();

    // 3. Fetch all time entries for current week (for weekly compliance checks)
    const weekStart = getStartOfWeek(clockOut);
    const allWeekEntries = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.user_id, actor.id),
          eq(time_entries.organization_id, organizationId),
          gte(time_entries.clock_in, weekStart)
        )
      );

    // 4. Fetch breaks for current entry
    const breaks = await db
      .select()
      .from(break_entries)
      .where(eq(break_entries.time_entry_id, entry.id));

    // 5. Run compliance validation
    const validator = new ComplianceValidator();
    const mockEntryWithClockOut = {
      id: entry.id,
      clock_in: entry.clock_in,
      clock_out: clockOut,
      break_minutes: entry.break_minutes || 0,
      clock_in_location: entry.clock_in_location as { lat: number; lng: number } | null,
      clock_out_location: (latitude !== undefined && longitude !== undefined)
        ? { lat: latitude, lng: longitude }
        : null,
    };

    const validationContext: ValidationContext = {
      currentEntry: mockEntryWithClockOut,
      allEntries: [
        ...allWeekEntries.filter(e => e.id !== entry.id).map(e => ({
          id: e.id,
          clock_in: e.clock_in,
          clock_out: e.clock_out,
          break_minutes: e.break_minutes ?? 0,
          clock_in_location: e.clock_in_location as { lat: number; lng: number } | null,
          clock_out_location: e.clock_out_location as { lat: number; lng: number } | null,
        })),
        mockEntryWithClockOut
      ],
      breaks: breaks.map(b => ({
        id: b.id,
        time_entry_id: b.time_entry_id,
        break_start: b.break_start,
        break_end: b.break_end,
        break_type: b.break_type as 'paid' | 'unpaid',
      })),
      locationCoords: entry.clock_in_location
        ? [(entry.clock_in_location as any).lat, (entry.clock_in_location as any).lng]
        : [0, 0],
      userCoords: (latitude !== undefined && longitude !== undefined)
        ? [latitude, longitude]
        : (entry.clock_in_location
          ? [(entry.clock_in_location as any).lat, (entry.clock_in_location as any).lng]
          : [0, 0]),
    };

    const validationResults = validator.validateAll(validationContext);

    // 6. Count violations vs warnings
    const criticalViolations = validationResults.filter(r => !r.pass && r.severity === 'critical');
    const warnings = validationResults.filter(r => !r.pass && r.severity !== 'critical');

    // 7. Check for manager override
    const isOverride = override && isManager;

    if (criticalViolations.length > 0 && !isOverride) {
      // Block clock-out
      return res.status(400).json({
        message: 'Clock-out blocked due to compliance violations',
        violations: criticalViolations.map(v => ({
          message: v.message,
          severity: v.severity,
          rule_reference: v.ruleReference,
          recommended_action: v.recommendedAction,
        })),
        can_override: isManager,
      });
    }

    // 8. Build clock_out_location object
    const clock_out_location = (latitude !== undefined && longitude !== undefined)
      ? { lat: latitude, lng: longitude, accuracy: accuracy || null }
      : null;

    // 9. Calculate duration
    const clockIn = new Date(entry.clock_in);
    const durationMs = clockOut.getTime() - clockIn.getTime();
    const breakMinutes = entry.break_minutes || 0;
    const totalMinutes = Math.floor(durationMs / 60000) - breakMinutes;
    const durationHours = ((durationMs - (breakMinutes * 60000)) / 3600000).toFixed(2);

    // 10. Proceed with clock-out (use transaction)
    await db.transaction(async (tx) => {
      // Update time entry
      await tx
        .update(time_entries)
        .set({
          clock_out: clockOut,
          clock_out_location: clock_out_location,
          clock_out_method: method,
          total_minutes: totalMinutes,
          status: 'completed',
          updated_at: new Date(),
        })
        .where(eq(time_entries.id, entry.id));

      // Insert compliance check results
      for (const result of validationResults) {
        await tx.insert(compliance_checks).values({
          organization_id: organizationId,
          user_id: actor.id,
          time_entry_id: entry.id,
          check_type: result.ruleReference || 'unknown',
          check_result: result.pass ? 'pass' : (result.severity === 'critical' ? 'violation' : 'warning'),
          severity: result.severity || 'low',
          message: result.message,
          rule_reference: result.ruleReference,
          related_data: { recommended_action: result.recommendedAction },
        });
      }

      // Log override if applicable
      if (isOverride) {
        await logAudit({
          orgId: organizationId,
          actorId: actor.id,
          action: 'compliance_override',
          entityType: 'time_entry',
          entityId: entry.id,
          newData: { reason, violations: criticalViolations.length },
        });
      }
    });

    // 11. Broadcast clock-out event to organization (managers only)
    const user = req.user as any;
    broadcastToOrg(organizationId, 'attendance:clock-out', {
      userId: actor.id,
      userName: user?.name || user?.email || 'Unknown User',
      timestamp: clockOut.toISOString(),
      duration: durationHours,
      method,
    });

    // 12. Return response
    res.json({
      message: isOverride ? 'Clocked out (compliance override)' : 'Clocked out successfully',
      time_entry: { ...entry, clock_out: clockOut, status: 'completed' },
      duration_hours: parseFloat(durationHours),
      total_minutes: totalMinutes,
      compliance: {
        checks: validationResults.length,
        violations: criticalViolations.length,
        warnings: warnings.length,
        override: isOverride,
      },
      warnings: warnings.length > 0 ? warnings.map(w => w.message) : undefined,
    });
  } catch (error) {
    logger.error('Error clocking out:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get start of week (Monday) in UTC
 */
function getStartOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday is start of week
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// GET /api/v1/org/:slug/time-entries - List time entries
async function handleListTimeEntries(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const { page = '1', limit = '20', user_id, status } = req.query;

    // Parse pagination parameters
    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const limitNum = Math.min(Math.max(parseInt(limit as string, 10), 1), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions = [eq(time_entries.organization_id, organizationId)];

    // Role-based filtering: Employees can only see their own, managers see all (or filtered by user_id)
    if (!['manager', 'tenantAdmin', 'owner'].includes(actor.role)) {
      // Employees can only see their own time entries
      conditions.push(eq(time_entries.user_id, actor.id));
    } else {
      // Managers can filter by user_id or see all
      if (user_id) {
        conditions.push(eq(time_entries.user_id, user_id as string));
      }
    }

    // Status filter (optional)
    if (status) {
      conditions.push(eq(time_entries.status, status as string));
    }

    // Fetch time entries
    const entries = await db
      .select()
      .from(time_entries)
      .where(and(...conditions))
      .orderBy(desc(time_entries.clock_in))
      .limit(limitNum)
      .offset(offset);

    res.json({
      time_entries: entries,
      page: pageNum,
      limit: limitNum,
      count: entries.length,
    });
  } catch (error) {
    logger.error('Error listing time entries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// GET /api/v1/org/:slug/time-entries/:id - Get single time entry
async function handleGetTimeEntry(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const id = req.params.id as string;
    const organizationId = req.organizationId!;

    // Validate id parameter
    if (!id) {
      return res.status(400).json({ message: 'Time entry ID is required' });
    }

    // Build conditions
    const conditions = [
      eq(time_entries.id, id),
      eq(time_entries.organization_id, organizationId),
    ];

    // Employees can only view their own time entries
    if (!['manager', 'tenantAdmin', 'owner'].includes(actor.role)) {
      conditions.push(eq(time_entries.user_id, actor.id));
    }

    // Fetch time entry
    const [timeEntry] = await db
      .select()
      .from(time_entries)
      .where(and(...conditions))
      .limit(1);

    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    res.json({ time_entry: timeEntry });
  } catch (error) {
    logger.error('Error getting time entry:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Register routes
router.post('/clock-in', handleClockIn);
router.post('/clock-out', handleClockOut);
router.get('/', handleListTimeEntries);
router.get('/:id', handleGetTimeEntry);

export default router;

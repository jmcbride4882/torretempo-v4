import { Router, Request, Response } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { break_entries, time_entries } from '../../db/schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAudit } from '../../services/audit.service.js';
import { broadcastToOrg } from '../../lib/websocket.js';

const router = Router();

/**
 * Helper: Get authenticated user from request
 */
function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ error: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}

// POST /api/v1/org/:slug/breaks/start - Start break
router.post(
  '/start',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const { break_type = 'unpaid' } = req.body;

      // Validate break_type
      if (!['paid', 'unpaid'].includes(break_type)) {
        return res.status(400).json({ message: 'break_type must be "paid" or "unpaid"' });
      }

      // 1. Find active time entry (clock_out is null, status is active)
      const activeEntry = await db
        .select()
        .from(time_entries)
        .where(
          and(
            eq(time_entries.user_id, actor.id),
            eq(time_entries.organization_id, organizationId),
            eq(time_entries.status, 'active')
          )
        )
        .limit(1);

      if (activeEntry.length === 0) {
        return res.status(400).json({ message: 'You must be clocked in to start a break' });
      }

      const timeEntry = activeEntry[0]!;

      // 2. Check for existing active break (break_end is null)
      const activeBreak = await db
        .select()
        .from(break_entries)
        .where(
          and(
            eq(break_entries.time_entry_id, timeEntry.id),
            eq(break_entries.organization_id, organizationId),
            isNull(break_entries.break_end)
          )
        )
        .limit(1);

      if (activeBreak.length > 0) {
        return res.status(400).json({ message: 'You already have an active break' });
      }

      // 3. Create break entry
      const breakEntryResult = await db
        .insert(break_entries)
        .values({
          organization_id: organizationId,
          time_entry_id: timeEntry.id,
          break_start: new Date(),
          break_type,
        })
        .returning();

      const breakEntry = breakEntryResult[0]!;

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'break.start',
        entityType: 'break_entries',
        entityId: breakEntry.id,
        newData: breakEntry,
      });

      // Broadcast break-start event to organization (managers only)
      const user = req.user as any;
      broadcastToOrg(organizationId, 'attendance:break-start', {
        userId: actor.id,
        userName: user?.name || user?.email || 'Unknown User',
        timestamp: breakEntry.break_start.toISOString(),
        breakType: break_type,
      });

      res.json({ message: 'Break started', break: breakEntry });
    } catch (error) {
      console.error('Error starting break:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// POST /api/v1/org/:slug/breaks/end - End break
router.post(
  '/end',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;

      // 1. Find active time entry
      const activeEntry = await db
        .select()
        .from(time_entries)
        .where(
          and(
            eq(time_entries.user_id, actor.id),
            eq(time_entries.organization_id, organizationId),
            eq(time_entries.status, 'active')
          )
        )
        .limit(1);

      if (activeEntry.length === 0) {
        return res.status(400).json({ message: 'No active time entry found' });
      }

      const timeEntry = activeEntry[0]!;

      // 2. Find active break (break_end is null)
      const activeBreak = await db
        .select()
        .from(break_entries)
        .where(
          and(
            eq(break_entries.time_entry_id, timeEntry.id),
            eq(break_entries.organization_id, organizationId),
            isNull(break_entries.break_end)
          )
        )
        .limit(1);

      if (activeBreak.length === 0) {
        return res.status(400).json({ message: 'No active break found' });
      }

      const breakToEnd = activeBreak[0]!;

      // 3. End break and update time entry (use transaction)
      await db.transaction(async (tx) => {
        const endTime = new Date();
        const startTime = new Date(breakToEnd.break_start);
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

        // Update break entry
        await tx
          .update(break_entries)
          .set({
            break_end: endTime,
          })
          .where(
            and(
              eq(break_entries.id, breakToEnd.id),
              eq(break_entries.organization_id, organizationId)
            )
          );

        // Update time entry's total break minutes
        const currentBreakMinutes = timeEntry.break_minutes || 0;
        await tx
          .update(time_entries)
          .set({
            break_minutes: currentBreakMinutes + durationMinutes,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(time_entries.id, timeEntry.id),
              eq(time_entries.organization_id, organizationId)
            )
          );
      });

      // Calculate duration for response
      const endTime = new Date();
      const startTime = new Date(breakToEnd.break_start);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'break.end',
        entityType: 'break_entries',
        entityId: breakToEnd.id,
        oldData: breakToEnd,
        newData: { ...breakToEnd, break_end: endTime },
      });

      // Broadcast break-end event to organization (managers only)
      const user = req.user as any;
      broadcastToOrg(organizationId, 'attendance:break-end', {
        userId: actor.id,
        userName: user?.name || user?.email || 'Unknown User',
        timestamp: endTime.toISOString(),
        duration: durationMinutes,
        breakType: breakToEnd.break_type,
      });

      res.json({ message: 'Break ended', duration_minutes: durationMinutes });
    } catch (error) {
      console.error('Error ending break:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// GET /api/v1/org/:slug/breaks?time_entry_id=... - List breaks for time entry
router.get('/', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const { time_entry_id } = req.query;

    // Validate time_entry_id parameter
    if (!time_entry_id) {
      return res.status(400).json({ message: 'time_entry_id is required' });
    }

    // Verify time entry exists and belongs to organization
    const timeEntryResult = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.id, time_entry_id as string),
          eq(time_entries.organization_id, organizationId)
        )
      )
      .limit(1);

    if (timeEntryResult.length === 0) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    const timeEntry = timeEntryResult[0]!;

    // Non-managers can only view breaks for their own time entries
    if (
      timeEntry.user_id !== actor.id &&
      !['manager', 'tenantAdmin', 'owner'].includes(actor.role)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch all breaks for this time entry
    const breaks = await db
      .select()
      .from(break_entries)
      .where(
        and(
          eq(break_entries.time_entry_id, time_entry_id as string),
          eq(break_entries.organization_id, organizationId)
        )
      )
      .orderBy(break_entries.break_start);

    // Calculate duration for each break
    const breaksWithDuration = breaks.map((breakEntry) => {
      let duration_minutes = null;
      if (breakEntry.break_end) {
        const durationMs =
          new Date(breakEntry.break_end).getTime() -
          new Date(breakEntry.break_start).getTime();
        duration_minutes = Math.round(durationMs / 60000);
      }
      return {
        ...breakEntry,
        duration_minutes,
      };
    });

    res.json({ breaks: breaksWithDuration });
  } catch (error) {
    console.error('Error listing breaks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

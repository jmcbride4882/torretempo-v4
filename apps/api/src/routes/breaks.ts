import { Router, Request, Response } from 'express';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { break_entries, time_entries } from '../db/schema.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../services/audit.service.js';
import logger from '../lib/logger.js';

const router = Router();

function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ error: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}

// GET /api/v1/org/:slug/time-entries/:timeEntryId/breaks - List breaks for time entry
router.get('/:timeEntryId/breaks', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const timeEntryId = req.params.timeEntryId as string;

    // Fetch time entry to verify ownership
    const entryResult = await db
      .select()
      .from(time_entries)
      .where(
        and(eq(time_entries.id, timeEntryId), eq(time_entries.organization_id, organizationId))
      )
      .limit(1);

    if (entryResult.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    const entry = entryResult[0]!;

    // Validate access
    if (entry.user_id !== actor.id && !['manager', 'tenantAdmin', 'owner'].includes(actor.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch breaks
    const breaks = await db
      .select()
      .from(break_entries)
      .where(
        and(
          eq(break_entries.time_entry_id, timeEntryId),
          eq(break_entries.organization_id, organizationId)
        )
      )
      .orderBy(desc(break_entries.break_start));

    res.json({ breaks });
  } catch (error) {
    logger.error('Error fetching breaks:', error);
    res.status(500).json({ error: 'Failed to fetch breaks' });
  }
});

// POST /api/v1/org/:slug/time-entries/:timeEntryId/breaks - Start break
router.post(
  '/:timeEntryId/breaks',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const timeEntryId = req.params.timeEntryId as string;
      const { break_type = 'unpaid' } = req.body;

      // Validate break_type
      if (!['paid', 'unpaid'].includes(break_type)) {
        return res.status(400).json({ error: 'break_type must be "paid" or "unpaid"' });
      }

      // Fetch time entry
      const entryResult = await db
        .select()
        .from(time_entries)
        .where(
          and(eq(time_entries.id, timeEntryId), eq(time_entries.organization_id, organizationId))
        )
        .limit(1);

      if (entryResult.length === 0) {
        return res.status(404).json({ error: 'Time entry not found' });
      }

      const entry = entryResult[0]!;

      // Validate ownership
      if (entry.user_id !== actor.id) {
        return res.status(403).json({ error: 'Can only start breaks for your own time entry' });
      }

      // Validate status
      if (entry.status !== 'active') {
        return res.status(400).json({ error: 'Can only start breaks for active time entries' });
      }

      // Check for active break
      const activeBreak = await db
        .select()
        .from(break_entries)
        .where(
          and(
            eq(break_entries.time_entry_id, timeEntryId),
            eq(break_entries.organization_id, organizationId),
            isNull(break_entries.break_end)
          )
        )
        .limit(1);

      if (activeBreak.length > 0) {
        return res.status(409).json({
          error: 'Break already in progress. End current break first.',
          activeBreak: activeBreak[0],
        });
      }

      // Create break
      const created = await db
        .insert(break_entries)
        .values({
          organization_id: organizationId,
          time_entry_id: timeEntryId,
          break_start: new Date(),
          break_type: break_type,
        })
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'break.start',
        entityType: 'break_entries',
        entityId: created[0]!.id,
        newData: created[0],
      });

      res.status(201).json({ break: created[0] });
    } catch (error) {
      logger.error('Error starting break:', error);
      res.status(500).json({ error: 'Failed to start break' });
    }
  }
);

// PATCH /api/v1/org/:slug/time-entries/:timeEntryId/breaks/:id - End break
router.patch(
  '/:timeEntryId/breaks/:id',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const timeEntryId = req.params.timeEntryId as string;
      const id = req.params.id as string;

      // Fetch break
      const breakResult = await db
        .select()
        .from(break_entries)
        .where(
          and(
            eq(break_entries.id, id),
            eq(break_entries.time_entry_id, timeEntryId),
            eq(break_entries.organization_id, organizationId)
          )
        )
        .limit(1);

      if (breakResult.length === 0) {
        return res.status(404).json({ error: 'Break not found' });
      }

      const breakEntry = breakResult[0]!;

      // Fetch time entry to validate ownership
      const entryResult = await db
        .select()
        .from(time_entries)
        .where(
          and(eq(time_entries.id, timeEntryId), eq(time_entries.organization_id, organizationId))
        )
        .limit(1);

      if (entryResult.length === 0) {
        return res.status(404).json({ error: 'Time entry not found' });
      }

      const entry = entryResult[0]!;

      // Validate ownership
      if (entry.user_id !== actor.id) {
        return res.status(403).json({ error: 'Can only end breaks for your own time entry' });
      }

      // Validate break is active
      if (breakEntry.break_end) {
        return res.status(400).json({ error: 'Break already ended' });
      }

      // End break
      const now = new Date();
      const updated = await db
        .update(break_entries)
        .set({
          break_end: now,
        })
        .where(
          and(
            eq(break_entries.id, id),
            eq(break_entries.organization_id, organizationId)
          )
        )
        .returning();

      // Calculate break duration and update time_entry.break_minutes
      const breakDurationMs = now.getTime() - new Date(breakEntry.break_start).getTime();
      const breakMinutes = Math.floor(breakDurationMs / 60000);

      await db
        .update(time_entries)
        .set({
          break_minutes: (entry.break_minutes || 0) + breakMinutes,
          updated_at: new Date(),
        })
        .where(
          and(eq(time_entries.id, timeEntryId), eq(time_entries.organization_id, organizationId))
        );

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'break.end',
        entityType: 'break_entries',
        entityId: id,
        oldData: breakEntry,
        newData: updated[0],
      });

      res.json({ break: updated[0] });
    } catch (error) {
      logger.error('Error ending break:', error);
      res.status(500).json({ error: 'Failed to end break' });
    }
  }
);

// DELETE /api/v1/org/:slug/time-entries/:timeEntryId/breaks/:id - Delete break (before time entry completed)
router.delete(
  '/:timeEntryId/breaks/:id',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const timeEntryId = req.params.timeEntryId as string;
      const id = req.params.id as string;

      // Fetch break
      const breakResult = await db
        .select()
        .from(break_entries)
        .where(
          and(
            eq(break_entries.id, id),
            eq(break_entries.time_entry_id, timeEntryId),
            eq(break_entries.organization_id, organizationId)
          )
        )
        .limit(1);

      if (breakResult.length === 0) {
        return res.status(404).json({ error: 'Break not found' });
      }

      const breakEntry = breakResult[0]!;

      // Fetch time entry
      const entryResult = await db
        .select()
        .from(time_entries)
        .where(
          and(eq(time_entries.id, timeEntryId), eq(time_entries.organization_id, organizationId))
        )
        .limit(1);

      if (entryResult.length === 0) {
        return res.status(404).json({ error: 'Time entry not found' });
      }

      const entry = entryResult[0]!;

      // Validate ownership or manager role
      if (entry.user_id !== actor.id && !['manager', 'tenantAdmin', 'owner'].includes(actor.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Cannot delete breaks from completed entries
      if (entry.status === 'completed') {
        return res.status(400).json({ error: 'Cannot delete breaks from completed time entries' });
      }

      // If break was ended, need to recalculate time_entry.break_minutes
      if (breakEntry.break_end) {
        const breakDurationMs =
          new Date(breakEntry.break_end).getTime() - new Date(breakEntry.break_start).getTime();
        const breakMinutes = Math.floor(breakDurationMs / 60000);

        await db
          .update(time_entries)
          .set({
            break_minutes: Math.max(0, (entry.break_minutes || 0) - breakMinutes),
            updated_at: new Date(),
          })
          .where(
            and(eq(time_entries.id, timeEntryId), eq(time_entries.organization_id, organizationId))
          );
      }

      // Delete break
      await db
        .delete(break_entries)
        .where(
          and(
            eq(break_entries.id, id),
            eq(break_entries.organization_id, organizationId)
          )
        );

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'break.delete',
        entityType: 'break_entries',
        entityId: id,
        oldData: breakEntry,
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting break:', error);
      res.status(500).json({ error: 'Failed to delete break' });
    }
  }
);

export default router;

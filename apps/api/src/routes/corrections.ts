import { Router, Request, Response } from 'express';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { correction_requests, time_entries } from '../db/schema.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../services/audit.service.js';

const router = Router();

const MANAGER_ROLES = ['manager', 'tenantAdmin', 'owner'];

function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ error: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}

// GET /api/v1/org/:slug/corrections - List correction requests
router.get('/', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const status = req.query.status as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    const conditions: any[] = [eq(correction_requests.organization_id, organizationId)];

    // Employees can only see their own requests
    // Managers can see all requests
    if (!MANAGER_ROLES.includes(actor.role)) {
      conditions.push(eq(correction_requests.requested_by, actor.id));
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      conditions.push(inArray(correction_requests.status, statuses));
    }

    const result = await db
      .select()
      .from(correction_requests)
      .where(and(...conditions))
      .orderBy(desc(correction_requests.created_at))
      .limit(limit)
      .offset(offset);

    res.json({
      corrections: result,
      pagination: { limit, offset, total: result.length },
    });
  } catch (error) {
    console.error('Error fetching correction requests:', error);
    res.status(500).json({ error: 'Failed to fetch correction requests' });
  }
});

// GET /api/v1/org/:slug/corrections/:id - Get single correction request
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const result = await db
      .select()
      .from(correction_requests)
      .where(
        and(eq(correction_requests.id, id), eq(correction_requests.organization_id, organizationId))
      )
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Correction request not found' });
    }

    const correction = result[0]!;

    // Validate access
    if (
      correction.requested_by !== actor.id &&
      !MANAGER_ROLES.includes(actor.role)
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ correction });
  } catch (error) {
    console.error('Error fetching correction request:', error);
    res.status(500).json({ error: 'Failed to fetch correction request' });
  }
});

// POST /api/v1/org/:slug/corrections - Request correction
router.post(
  '/',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const { time_entry_id, requested_data, reason } = req.body;

      // Validate input
      if (!time_entry_id) {
        return res.status(400).json({ error: 'time_entry_id is required' });
      }
      if (!requested_data) {
        return res.status(400).json({ error: 'requested_data is required' });
      }
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'reason is required' });
      }

      // Fetch time entry
      const entryResult = await db
        .select()
        .from(time_entries)
        .where(
          and(eq(time_entries.id, time_entry_id), eq(time_entries.organization_id, organizationId))
        )
        .limit(1);

      if (entryResult.length === 0) {
        return res.status(404).json({ error: 'Time entry not found' });
      }

      const entry = entryResult[0]!;

      // Validate ownership
      if (entry.user_id !== actor.id) {
        return res.status(403).json({ error: 'Can only request corrections for your own time entries' });
      }

      // Validate status
      if (entry.status !== 'completed') {
        return res.status(400).json({ error: 'Can only request corrections for completed time entries' });
      }

      // Check for existing pending correction
      const existingCorrection = await db
        .select()
        .from(correction_requests)
        .where(
          and(
            eq(correction_requests.time_entry_id, time_entry_id),
            eq(correction_requests.organization_id, organizationId),
            eq(correction_requests.status, 'pending')
          )
        )
        .limit(1);

      if (existingCorrection.length > 0) {
        return res.status(409).json({
          error: 'Pending correction request already exists for this time entry',
          existingCorrection: existingCorrection[0],
        });
      }

      // Create correction request
      const created = await db
        .insert(correction_requests)
        .values({
          organization_id: organizationId,
          time_entry_id: time_entry_id,
          requested_by: actor.id,
          original_data: entry,
          requested_data: requested_data,
          reason: reason,
          status: 'pending',
        })
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'correction.create',
        entityType: 'correction_requests',
        entityId: created[0]!.id,
        newData: created[0],
      });

      // TODO: Notify managers via notification system
      // const managers = await db.select({ userId: member.userId }).from(member)
      //   .where(and(eq(member.organizationId, organizationId), inArray(member.role, MANAGER_ROLES)));
      // Send notification to managerIds

      res.status(201).json({ correction: created[0] });
    } catch (error) {
      console.error('Error creating correction request:', error);
      res.status(500).json({ error: 'Failed to create correction request' });
    }
  }
);

// PUT /api/v1/org/:slug/corrections/:id/approve - Approve correction
router.put(
  '/:id/approve',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;

      // Fetch correction request
      const correctionResult = await db
        .select()
        .from(correction_requests)
        .where(
          and(eq(correction_requests.id, id), eq(correction_requests.organization_id, organizationId))
        )
        .limit(1);

      if (correctionResult.length === 0) {
        return res.status(404).json({ error: 'Correction request not found' });
      }

      const correction = correctionResult[0]!;

      // Validate status
      if (correction.status !== 'pending') {
        return res.status(400).json({ error: 'Correction request is not pending' });
      }

      // Apply corrections to time entry
      const requestedData = correction.requested_data as any;
      const updateData: any = {
        updated_at: new Date(),
      };

      // Safely apply requested changes
      if (requestedData.clock_in) updateData.clock_in = new Date(requestedData.clock_in);
      if (requestedData.clock_out) updateData.clock_out = new Date(requestedData.clock_out);
      if (requestedData.break_minutes !== undefined) updateData.break_minutes = requestedData.break_minutes;
      if (requestedData.notes !== undefined) updateData.notes = requestedData.notes;
      if (requestedData.clock_in_location) updateData.clock_in_location = requestedData.clock_in_location;
      if (requestedData.clock_out_location) updateData.clock_out_location = requestedData.clock_out_location;

      // Recalculate total_minutes if clock times changed
      if (updateData.clock_in || updateData.clock_out) {
        const entryResult = await db
          .select()
          .from(time_entries)
          .where(
            and(
              eq(time_entries.id, correction.time_entry_id),
              eq(time_entries.organization_id, organizationId)
            )
          )
          .limit(1);

        if (entryResult.length > 0) {
          const entry = entryResult[0]!;
          const clockIn = updateData.clock_in ? new Date(updateData.clock_in) : new Date(entry.clock_in);
          const clockOut = updateData.clock_out ? new Date(updateData.clock_out) : (entry.clock_out ? new Date(entry.clock_out) : null);

          if (clockOut) {
            const durationMs = clockOut.getTime() - clockIn.getTime();
            const breakMinutes = updateData.break_minutes !== undefined ? updateData.break_minutes : (entry.break_minutes || 0);
            updateData.total_minutes = Math.floor(durationMs / 60000) - breakMinutes;
          }
        }
      }

      // Update time entry
      await db
        .update(time_entries)
        .set(updateData)
        .where(
          and(
            eq(time_entries.id, correction.time_entry_id),
            eq(time_entries.organization_id, organizationId)
          )
        );

      // Update correction request
      const updated = await db
        .update(correction_requests)
        .set({
          status: 'approved',
          reviewed_by: actor.id,
          reviewed_at: new Date(),
        })
        .where(
          and(eq(correction_requests.id, id), eq(correction_requests.organization_id, organizationId))
        )
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'correction.approve',
        entityType: 'correction_requests',
        entityId: id,
        oldData: correction,
        newData: updated[0],
      });

      // TODO: Notify requester via notification system

      res.json({ correction: updated[0] });
    } catch (error) {
      console.error('Error approving correction:', error);
      res.status(500).json({ error: 'Failed to approve correction' });
    }
  }
);

// PUT /api/v1/org/:slug/corrections/:id/reject - Reject correction
router.put(
  '/:id/reject',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;
      const { rejection_reason } = req.body;

      // Fetch correction request
      const correctionResult = await db
        .select()
        .from(correction_requests)
        .where(
          and(eq(correction_requests.id, id), eq(correction_requests.organization_id, organizationId))
        )
        .limit(1);

      if (correctionResult.length === 0) {
        return res.status(404).json({ error: 'Correction request not found' });
      }

      const correction = correctionResult[0]!;

      // Validate status
      if (correction.status !== 'pending') {
        return res.status(400).json({ error: 'Correction request is not pending' });
      }

      // Update correction request
      const updateData: any = {
        status: 'rejected',
        reviewed_by: actor.id,
        reviewed_at: new Date(),
      };

      if (rejection_reason) {
        // Store rejection reason in reason field or extend schema
        const requestedData = correction.requested_data as any;
        requestedData._rejection_reason = rejection_reason;
        updateData.requested_data = requestedData;
      }

      const updated = await db
        .update(correction_requests)
        .set(updateData)
        .where(
          and(eq(correction_requests.id, id), eq(correction_requests.organization_id, organizationId))
        )
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'correction.reject',
        entityType: 'correction_requests',
        entityId: id,
        oldData: correction,
        newData: updated[0],
      });

      // TODO: Notify requester via notification system

      res.json({ correction: updated[0] });
    } catch (error) {
      console.error('Error rejecting correction:', error);
      res.status(500).json({ error: 'Failed to reject correction' });
    }
  }
);

// DELETE /api/v1/org/:slug/corrections/:id - Cancel correction request (own only)
router.delete(
  '/:id',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;

      // Fetch correction request
      const correctionResult = await db
        .select()
        .from(correction_requests)
        .where(
          and(eq(correction_requests.id, id), eq(correction_requests.organization_id, organizationId))
        )
        .limit(1);

      if (correctionResult.length === 0) {
        return res.status(404).json({ error: 'Correction request not found' });
      }

      const correction = correctionResult[0]!;

      // Validate ownership
      if (correction.requested_by !== actor.id) {
        return res.status(403).json({ error: 'Can only cancel your own correction requests' });
      }

      // Validate status
      if (correction.status !== 'pending') {
        return res.status(400).json({ error: 'Can only cancel pending correction requests' });
      }

      // Delete correction request
      await db
        .delete(correction_requests)
        .where(
          and(eq(correction_requests.id, id), eq(correction_requests.organization_id, organizationId))
        );

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'correction.cancel',
        entityType: 'correction_requests',
        entityId: id,
        oldData: correction,
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error canceling correction:', error);
      res.status(500).json({ error: 'Failed to cancel correction' });
    }
  }
);

export default router;

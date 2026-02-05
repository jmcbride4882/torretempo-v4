import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shifts, locations } from '../db/schema.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../services/audit.service.js';
import { assignUserToShift, unassignUserFromShift } from '../services/shift.service.js';

const router = Router();

// GET /api/v1/org/:slug/shifts - List all shifts for organization
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const start_date = req.query.start_date as string | undefined;
    const end_date = req.query.end_date as string | undefined;
    const location_id = req.query.location_id as string | undefined;
    const status = req.query.status as string | undefined;
    const user_id = req.query.user_id as string | undefined;

    const conditions: any[] = [eq(shifts.organization_id, organizationId as string)];
    
    if (start_date) {
      conditions.push(gte(shifts.start_time, new Date(start_date)));
    }
    if (end_date) {
      conditions.push(lte(shifts.start_time, new Date(end_date)));
    }
    if (location_id) {
      conditions.push(eq(shifts.location_id, location_id));
    }
    if (user_id) {
      conditions.push(eq(shifts.user_id, user_id));
    }
    if (status) {
      conditions.push(eq(shifts.status, status));
    }

    const result = await db
      .select()
      .from(shifts)
      .where(and(...conditions))
      .orderBy(shifts.start_time);

    res.json({ shifts: result });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// GET /api/v1/org/:slug/shifts/:id - Get single shift by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const result = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json({ shift: result[0] });
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

// POST /api/v1/org/:slug/shifts - Create new shift (manager+ only)
router.post('/', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const {
      location_id,
      user_id,
      start_time,
      end_time,
      break_minutes,
      notes,
      color,
      required_skill_id,
    } = req.body;

    // Validate required fields
    if (!location_id || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Missing required fields: location_id, start_time, end_time' 
      });
    }

    // Verify location belongs to organization
    const locationResult = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, location_id as string), eq(locations.organization_id, organizationId)))
      .limit(1);

    if (locationResult.length === 0) {
      return res.status(400).json({ error: 'Invalid location_id' });
    }

    // Create shift
    const newShift = await db.insert(shifts).values({
      organization_id: organizationId,
      location_id,
      user_id: user_id || null,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      break_minutes: break_minutes || 0,
      notes: notes || null,
      color: color || null,
      status: 'draft',
      required_skill_id: required_skill_id || null,
      created_by: userId,
    }).returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.create',
      entityType: 'shifts',
      entityId: newShift[0]!.id,
      newData: newShift[0],
    });

    res.status(201).json({ shift: newShift[0] });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// PUT /api/v1/org/:slug/shifts/:id - Update shift (manager+ only)
router.put('/:id', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.organization_id;
    delete updates.created_at;
    delete updates.created_by;

    // Fetch existing shift
    const existing = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Update shift
    const updated = await db
      .update(shifts)
      .set({ ...updates, updated_at: new Date() })
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.update',
      entityType: 'shifts',
      entityId: id,
      oldData: existing[0],
      newData: updated[0],
    });

    res.json({ shift: updated[0] });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

// DELETE /api/v1/org/:slug/shifts/:id - Delete shift (manager+ only)
router.delete('/:id', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;

    // Fetch existing shift
    const existing = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Delete shift
    await db
      .delete(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)));

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.delete',
      entityType: 'shifts',
      entityId: id,
      oldData: existing[0],
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

// POST /api/v1/org/:slug/shifts/:id/publish - Publish shift (manager+ only)
router.post('/:id/publish', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;

    // Fetch existing shift
    const existing = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    if (existing[0]!.status !== 'draft') {
      return res.status(400).json({ error: 'Can only publish draft shifts' });
    }

    // Update shift to published
    const updated = await db
      .update(shifts)
      .set({ 
        status: 'published',
        published_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.publish',
      entityType: 'shifts',
      entityId: id,
      oldData: existing[0],
      newData: updated[0],
    });

    res.json({ shift: updated[0] });
  } catch (error) {
    console.error('Error publishing shift:', error);
    res.status(500).json({ error: 'Failed to publish shift' });
  }
});

// POST /api/v1/org/:slug/shifts/:id/acknowledge - Acknowledge published shift (assigned user only)
router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;

    // Fetch existing shift
    const existing = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Verify user is assigned to this shift
    if (existing[0]!.user_id !== userId) {
      return res.status(403).json({ error: 'Can only acknowledge your own shifts' });
    }

    if (existing[0]!.status !== 'published') {
      return res.status(400).json({ error: 'Can only acknowledge published shifts' });
    }

    // Update shift to acknowledged
    const updated = await db
      .update(shifts)
      .set({ 
        acknowledged_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.acknowledge',
      entityType: 'shifts',
      entityId: id,
      oldData: existing[0],
      newData: updated[0],
    });

    res.json({ shift: updated[0] });
  } catch (error) {
    console.error('Error acknowledging shift:', error);
    res.status(500).json({ error: 'Failed to acknowledge shift' });
  }
});

// POST /api/v1/org/:slug/shifts/:id/assign - Assign user to shift (manager+ only)
router.post('/:id/assign', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const result = await assignUserToShift(id, user_id as string, organizationId);

    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        conflict: result.conflict 
      });
    }

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.assign',
      entityType: 'shifts',
      entityId: id,
      newData: { user_id },
    });

    res.json({ success: true, message: 'User assigned to shift' });
  } catch (error) {
    console.error('Error assigning user to shift:', error);
    res.status(500).json({ error: 'Failed to assign user to shift' });
  }
});

// POST /api/v1/org/:slug/shifts/:id/unassign - Unassign user from shift (manager+ only)
router.post('/:id/unassign', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;

    const result = await unassignUserFromShift(id, organizationId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.unassign',
      entityType: 'shifts',
      entityId: id,
      newData: { user_id: null },
    });

    res.json({ success: true, message: 'User unassigned from shift' });
  } catch (error) {
    console.error('Error unassigning user from shift:', error);
    res.status(500).json({ error: 'Failed to unassign user from shift' });
  }
});

// GET /api/v1/org/:slug/shifts/open - List open (unassigned) shifts
router.get('/open', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { location_id, start_date, end_date } = req.query;

    const conditions: any[] = [
      eq(shifts.organization_id, organizationId),
      isNull(shifts.user_id), // Unassigned shifts only
      eq(shifts.status, 'published'), // Only published shifts
    ];

    if (location_id) {
      conditions.push(eq(shifts.location_id, location_id as string));
    }
    if (start_date) {
      conditions.push(gte(shifts.start_time, new Date(start_date as string)));
    }
    if (end_date) {
      conditions.push(lte(shifts.start_time, new Date(end_date as string)));
    }

    const openShifts = await db
      .select()
      .from(shifts)
      .where(and(...conditions))
      .orderBy(shifts.start_time);

    res.json({ shifts: openShifts });
  } catch (error) {
    console.error('Error fetching open shifts:', error);
    res.status(500).json({ error: 'Failed to fetch open shifts' });
  }
});

// POST /api/v1/org/:slug/shifts/:id/claim - Claim an open shift (employee)
router.post('/:id/claim', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;

    // Fetch the shift
    const shiftResult = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organization_id, organizationId)))
      .limit(1);

    if (shiftResult.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const shift = shiftResult[0]!;

    // Verify shift is open
    if (shift.user_id !== null) {
      return res.status(400).json({ error: 'Shift is already assigned' });
    }

    if (shift.status !== 'published') {
      return res.status(400).json({ error: 'Shift is not available for claiming' });
    }

    // Assign user to shift using service (includes conflict check)
    const result = await assignUserToShift(id, userId, organizationId);

    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        conflict: result.conflict 
      });
    }

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'shift.claim',
      entityType: 'shifts',
      entityId: id,
      newData: { user_id: userId },
    });

    res.json({ success: true, message: 'Shift claimed successfully' });
  } catch (error) {
    console.error('Error claiming shift:', error);
    res.status(500).json({ error: 'Failed to claim shift' });
  }
});

export default router;

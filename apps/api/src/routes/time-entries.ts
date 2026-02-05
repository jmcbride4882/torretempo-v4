import { Router, Request, Response } from 'express';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { time_entries, shifts, locations } from '../db/schema.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../services/audit.service.js';
import { validateGeofence, isValidCoordinates } from '../services/geofencing.service.js';
import { logWarning } from '../services/errorLog.service.js';

const router = Router();

function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ error: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}

// GET /api/v1/org/:slug/time-entries - List time entries
router.get('/', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const userId = req.query.user_id as string | undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    const conditions: any[] = [eq(time_entries.organization_id, organizationId)];

    // Non-managers can only see their own entries
    if (!['manager', 'tenantAdmin', 'owner'].includes(actor.role)) {
      conditions.push(eq(time_entries.user_id, actor.id));
    } else if (userId) {
      conditions.push(eq(time_entries.user_id, userId));
    }

    if (startDate) {
      conditions.push(gte(time_entries.entry_date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(time_entries.entry_date, new Date(endDate)));
    }
    if (status) {
      conditions.push(eq(time_entries.status, status));
    }

    const result = await db
      .select()
      .from(time_entries)
      .where(and(...conditions))
      .orderBy(desc(time_entries.entry_date), desc(time_entries.clock_in))
      .limit(limit)
      .offset(offset);

    res.json({
      entries: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// GET /api/v1/org/:slug/time-entries/active - Get active time entry for user
router.get('/active', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;

    const result = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.organization_id, organizationId),
          eq(time_entries.user_id, actor.id),
          eq(time_entries.status, 'active')
        )
      )
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No active time entry found' });
    }

    res.json({ entry: result[0] });
  } catch (error) {
    console.error('Error fetching active time entry:', error);
    res.status(500).json({ error: 'Failed to fetch active time entry' });
  }
});

// GET /api/v1/org/:slug/time-entries/:id - Get single time entry
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
      .from(time_entries)
      .where(and(eq(time_entries.id, id), eq(time_entries.organization_id, organizationId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    const entry = result[0]!;

    // Non-managers can only view their own entries
    if (!['manager', 'tenantAdmin', 'owner'].includes(actor.role) && entry.user_id !== actor.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ entry });
  } catch (error) {
    console.error('Error fetching time entry:', error);
    res.status(500).json({ error: 'Failed to fetch time entry' });
  }
});

// POST /api/v1/org/:slug/time-entries - Clock in
router.post('/', requireRole(['employee', 'manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const {
      linked_shift_id,
      clock_in_location,
      clock_in_method = 'tap',
      notes,
    } = req.body;

    // Validate clock_in_location
    if (!clock_in_location || !clock_in_location.lat || !clock_in_location.lng) {
      return res.status(400).json({ error: 'clock_in_location with lat and lng is required' });
    }

    if (!isValidCoordinates(clock_in_location.lat, clock_in_location.lng)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    // Check for active time entry
    const activeEntry = await db
      .select()
      .from(time_entries)
      .where(
        and(
          eq(time_entries.organization_id, organizationId),
          eq(time_entries.user_id, actor.id),
          eq(time_entries.status, 'active')
        )
      )
      .limit(1);

    if (activeEntry.length > 0) {
      // Log warning for duplicate clock-in attempt
      await logWarning(
        `Duplicate clock-in attempt: User ${actor.id} tried to clock in while already active`,
        'api',
        {
          userId: actor.id,
          organizationId,
          activeEntryId: activeEntry[0]!.id,
          attemptedMethod: clock_in_method,
        }
      );
      
      return res.status(409).json({
        error: 'User already has an active time entry. Please clock out first.',
        activeEntry: activeEntry[0],
      });
    }

    // If linked to shift, validate shift and geofence
    let shiftData = null;
    if (linked_shift_id) {
      const shiftResult = await db
        .select()
        .from(shifts)
        .where(and(eq(shifts.id, linked_shift_id), eq(shifts.organization_id, organizationId)))
        .limit(1);

      if (shiftResult.length === 0) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      shiftData = shiftResult[0]!;

      // Validate shift belongs to user
      if (shiftData.user_id !== actor.id) {
        return res.status(403).json({ error: 'Shift is not assigned to you' });
      }

      // Validate shift is published
      if (shiftData.status === 'draft') {
        return res.status(400).json({ error: 'Cannot clock in to draft shifts' });
      }

      // Get location and validate geofence
      if (shiftData.location_id) {
        const locationResult = await db
          .select()
          .from(locations)
          .where(
            and(
              eq(locations.id, shiftData.location_id),
              eq(locations.organization_id, organizationId)
            )
          )
          .limit(1);

        if (locationResult.length > 0) {
          const location = locationResult[0]!;

          // Validate geofence if configured
          if (location.lat && location.lng && location.geofence_radius) {
            const validation = validateGeofence(
              clock_in_location.lat,
              clock_in_location.lng,
              {
                lat: parseFloat(location.lat as string),
                lng: parseFloat(location.lng as string),
                geofence_radius: location.geofence_radius,
              }
            );

            if (!validation.valid) {
              // Log warning for geofence violation
              await logWarning(
                `Geofence violation: User ${actor.id} attempted clock-in ${validation.distance?.toFixed(0)}m outside boundary`,
                'api',
                {
                  userId: actor.id,
                  organizationId,
                  locationId: location.id,
                  distance: validation.distance,
                  geofenceRadius: location.geofence_radius,
                  attemptedLocation: clock_in_location,
                }
              );
              
              return res.status(403).json({
                error: 'Outside geofence boundary',
                geofence: validation,
              });
            }
          }
        }
      }
    }

    // Create time entry
    const now = new Date();
    const created = await db
      .insert(time_entries)
      .values({
        organization_id: organizationId,
        user_id: actor.id,
        linked_shift_id: linked_shift_id || null,
        entry_date: now,
        clock_in: now,
        clock_in_location: clock_in_location,
        clock_in_method: clock_in_method,
        status: 'active',
        notes: notes || null,
      })
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: actor.id,
      action: 'time_entry.clock_in',
      entityType: 'time_entries',
      entityId: created[0]!.id,
      newData: created[0],
    });

    res.status(201).json({ entry: created[0] });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// PATCH /api/v1/org/:slug/time-entries/:id - Clock out
router.patch('/:id', requireRole(['employee', 'manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const id = req.params.id as string;
    const { clock_out_location, clock_out_method = 'tap', notes } = req.body;

    // Validate clock_out_location
    if (!clock_out_location || !clock_out_location.lat || !clock_out_location.lng) {
      return res.status(400).json({ error: 'clock_out_location with lat and lng is required' });
    }

    if (!isValidCoordinates(clock_out_location.lat, clock_out_location.lng)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    // Fetch time entry
    const entryResult = await db
      .select()
      .from(time_entries)
      .where(and(eq(time_entries.id, id), eq(time_entries.organization_id, organizationId)))
      .limit(1);

    if (entryResult.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    const entry = entryResult[0]!;

    // Validate ownership
    if (entry.user_id !== actor.id && !['manager', 'tenantAdmin', 'owner'].includes(actor.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate status
    if (entry.status !== 'active') {
      return res.status(400).json({ error: 'Time entry is not active' });
    }

    // Calculate total_minutes
    const clockOut = new Date();
    const clockIn = new Date(entry.clock_in);
    const durationMs = clockOut.getTime() - clockIn.getTime();
    const totalMinutes = Math.floor(durationMs / 60000) - (entry.break_minutes || 0);

    // Update time entry
    const updated = await db
      .update(time_entries)
      .set({
        clock_out: clockOut,
        clock_out_location: clock_out_location,
        clock_out_method: clock_out_method,
        total_minutes: totalMinutes,
        status: 'completed',
        notes: notes || entry.notes,
        updated_at: new Date(),
      })
      .where(and(eq(time_entries.id, id), eq(time_entries.organization_id, organizationId)))
      .returning();

    // If linked to shift, update shift status
    if (entry.linked_shift_id) {
      await db
        .update(shifts)
        .set({
          status: 'completed',
          updated_at: new Date(),
        })
        .where(and(eq(shifts.id, entry.linked_shift_id), eq(shifts.organization_id, organizationId)));
    }

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: actor.id,
      action: 'time_entry.clock_out',
      entityType: 'time_entries',
      entityId: id,
      oldData: entry,
      newData: updated[0],
    });

    res.json({ timeEntry: updated[0] });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// PUT /api/v1/org/:slug/time-entries/:id/verify - Manager verify time entry
router.put(
  '/:id/verify',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;

      // Fetch time entry
      const entryResult = await db
        .select()
        .from(time_entries)
        .where(and(eq(time_entries.id, id), eq(time_entries.organization_id, organizationId)))
        .limit(1);

      if (entryResult.length === 0) {
        return res.status(404).json({ error: 'Time entry not found' });
      }

      const entry = entryResult[0]!;

      // Validate status
      if (entry.status !== 'completed') {
        return res.status(400).json({ error: 'Can only verify completed time entries' });
      }

      if (entry.is_verified) {
        return res.status(400).json({ error: 'Time entry already verified' });
      }

      // Update verification
      const updated = await db
        .update(time_entries)
        .set({
          is_verified: true,
          updated_at: new Date(),
        })
        .where(and(eq(time_entries.id, id), eq(time_entries.organization_id, organizationId)))
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'time_entry.verify',
        entityType: 'time_entries',
        entityId: id,
        oldData: entry,
        newData: updated[0],
      });

    res.json({ entry: updated[0] });
    } catch (error) {
      console.error('Error verifying time entry:', error);
      res.status(500).json({ error: 'Failed to verify time entry' });
    }
  }
);

// DELETE /api/v1/org/:slug/time-entries/:id - Delete time entry (managers only, before verification)
router.delete(
  '/:id',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;

      // Fetch time entry
      const entryResult = await db
        .select()
        .from(time_entries)
        .where(and(eq(time_entries.id, id), eq(time_entries.organization_id, organizationId)))
        .limit(1);

      if (entryResult.length === 0) {
        return res.status(404).json({ error: 'Time entry not found' });
      }

      const entry = entryResult[0]!;

      // Cannot delete verified entries
      if (entry.is_verified) {
        return res.status(400).json({ error: 'Cannot delete verified time entries' });
      }

      // Delete entry
      await db
        .delete(time_entries)
        .where(and(eq(time_entries.id, id), eq(time_entries.organization_id, organizationId)));

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'time_entry.delete',
        entityType: 'time_entries',
        entityId: id,
        oldData: entry,
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting time entry:', error);
      res.status(500).json({ error: 'Failed to delete time entry' });
    }
  }
);

export default router;

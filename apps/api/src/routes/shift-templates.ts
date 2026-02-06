import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shift_templates, locations } from '../db/schema.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../services/audit.service.js';

const router = Router();

// Time format validation regex: HH:mm (00:00 - 23:59)
const TIME_FORMAT_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Validates time format (HH:mm)
 */
function isValidTimeFormat(time: string): boolean {
  return TIME_FORMAT_REGEX.test(time);
}

// GET /api/v1/org/:slug/shift-templates - List all shift templates for organization
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const result = await db
      .select({
        id: shift_templates.id,
        organization_id: shift_templates.organization_id,
        name: shift_templates.name,
        start_time: shift_templates.start_time,
        end_time: shift_templates.end_time,
        break_minutes: shift_templates.break_minutes,
        location_id: shift_templates.location_id,
        location_name: locations.name,
        color: shift_templates.color,
        required_skill_id: shift_templates.required_skill_id,
        is_active: shift_templates.is_active,
        created_by: shift_templates.created_by,
        created_at: shift_templates.created_at,
        updated_at: shift_templates.updated_at,
      })
      .from(shift_templates)
      .leftJoin(
        locations,
        and(
          eq(shift_templates.location_id, locations.id),
          eq(locations.organization_id, organizationId)
        )
      )
      .where(
        and(
          eq(shift_templates.organization_id, organizationId),
          eq(shift_templates.is_active, true)
        )
      )
      .orderBy(shift_templates.name);

    res.json({ templates: result });
  } catch (error) {
    console.error('Error fetching shift templates:', error);
    res.status(500).json({ error: 'Failed to fetch shift templates' });
  }
});

// GET /api/v1/org/:slug/shift-templates/:id - Get single shift template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const result = await db
      .select({
        id: shift_templates.id,
        organization_id: shift_templates.organization_id,
        name: shift_templates.name,
        start_time: shift_templates.start_time,
        end_time: shift_templates.end_time,
        break_minutes: shift_templates.break_minutes,
        location_id: shift_templates.location_id,
        location_name: locations.name,
        color: shift_templates.color,
        required_skill_id: shift_templates.required_skill_id,
        is_active: shift_templates.is_active,
        created_by: shift_templates.created_by,
        created_at: shift_templates.created_at,
        updated_at: shift_templates.updated_at,
      })
      .from(shift_templates)
      .leftJoin(
        locations,
        and(
          eq(shift_templates.location_id, locations.id),
          eq(locations.organization_id, organizationId)
        )
      )
      .where(
        and(
          eq(shift_templates.id, id),
          eq(shift_templates.organization_id, organizationId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Shift template not found' });
    }

    res.json({ template: result[0] });
  } catch (error) {
    console.error('Error fetching shift template:', error);
    res.status(500).json({ error: 'Failed to fetch shift template' });
  }
});

// POST /api/v1/org/:slug/shift-templates - Create new shift template (manager+ only)
router.post(
  '/',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;
      const {
        name,
        start_time,
        end_time,
        break_minutes,
        location_id,
        color,
        required_skill_id,
      } = req.body;

      // Validate required fields
      if (!name || !start_time || !end_time) {
        return res.status(400).json({
          error: 'Missing required fields: name, start_time, end_time',
        });
      }

      // Validate time format
      if (!isValidTimeFormat(start_time)) {
        return res.status(400).json({
          error: 'Invalid start_time format. Use HH:mm (e.g., 08:00)',
        });
      }

      if (!isValidTimeFormat(end_time)) {
        return res.status(400).json({
          error: 'Invalid end_time format. Use HH:mm (e.g., 16:00)',
        });
      }

      // Verify location belongs to organization (if provided)
      if (location_id) {
        const locationResult = await db
          .select()
          .from(locations)
          .where(
            and(
              eq(locations.id, location_id as string),
              eq(locations.organization_id, organizationId)
            )
          )
          .limit(1);

        if (locationResult.length === 0) {
          return res.status(400).json({ error: 'Invalid location_id' });
        }
      }

      // Create shift template
      const newTemplate = await db
        .insert(shift_templates)
        .values({
          organization_id: organizationId,
          name,
          start_time,
          end_time,
          break_minutes: break_minutes || 0,
          location_id: location_id || null,
          color: color || null,
          required_skill_id: required_skill_id || null,
          is_active: true,
          created_by: userId,
        })
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: userId,
        action: 'shift_template.create',
        entityType: 'shift_templates',
        entityId: newTemplate[0]!.id,
        newData: newTemplate[0],
      });

      res.status(201).json({ template: newTemplate[0] });
    } catch (error) {
      console.error('Error creating shift template:', error);
      res.status(500).json({ error: 'Failed to create shift template' });
    }
  }
);

// PUT /api/v1/org/:slug/shift-templates/:id - Update shift template (manager+ only)
router.put(
  '/:id',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
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
      delete updates.is_active;

      // Validate time format if provided
      if (updates.start_time && !isValidTimeFormat(updates.start_time)) {
        return res.status(400).json({
          error: 'Invalid start_time format. Use HH:mm (e.g., 08:00)',
        });
      }

      if (updates.end_time && !isValidTimeFormat(updates.end_time)) {
        return res.status(400).json({
          error: 'Invalid end_time format. Use HH:mm (e.g., 16:00)',
        });
      }

      // Verify location belongs to organization (if provided)
      if (updates.location_id) {
        const locationResult = await db
          .select()
          .from(locations)
          .where(
            and(
              eq(locations.id, updates.location_id as string),
              eq(locations.organization_id, organizationId)
            )
          )
          .limit(1);

        if (locationResult.length === 0) {
          return res.status(400).json({ error: 'Invalid location_id' });
        }
      }

      // Fetch existing template
      const existing = await db
        .select()
        .from(shift_templates)
        .where(
          and(
            eq(shift_templates.id, id),
            eq(shift_templates.organization_id, organizationId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Shift template not found' });
      }

      // Update template
      const updated = await db
        .update(shift_templates)
        .set({ ...updates, updated_at: new Date() })
        .where(
          and(
            eq(shift_templates.id, id),
            eq(shift_templates.organization_id, organizationId)
          )
        )
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: userId,
        action: 'shift_template.update',
        entityType: 'shift_templates',
        entityId: id,
        oldData: existing[0],
        newData: updated[0],
      });

      res.json({ template: updated[0] });
    } catch (error) {
      console.error('Error updating shift template:', error);
      res.status(500).json({ error: 'Failed to update shift template' });
    }
  }
);

// DELETE /api/v1/org/:slug/shift-templates/:id - Soft delete shift template (manager+ only)
router.delete(
  '/:id',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;
      const id = req.params.id as string;

      // Fetch existing template
      const existing = await db
        .select()
        .from(shift_templates)
        .where(
          and(
            eq(shift_templates.id, id),
            eq(shift_templates.organization_id, organizationId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Shift template not found' });
      }

      // Soft delete: set is_active to false
      const updated = await db
        .update(shift_templates)
        .set({ is_active: false, updated_at: new Date() })
        .where(
          and(
            eq(shift_templates.id, id),
            eq(shift_templates.organization_id, organizationId)
          )
        )
        .returning();

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: userId,
        action: 'shift_template.delete',
        entityType: 'shift_templates',
        entityId: id,
        oldData: existing[0],
        newData: updated[0],
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting shift template:', error);
      res.status(500).json({ error: 'Failed to delete shift template' });
    }
  }
);

export default router;

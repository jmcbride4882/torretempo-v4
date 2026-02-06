import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { feature_flags } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';

/**
 * Admin Feature Flags Routes
 * Platform admins can manage feature flags for per-organization feature toggling
 */

const router = Router();

// GET /api/admin/feature-flags - List all feature flags
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const flags = await db
      .select()
      .from(feature_flags)
      .orderBy(desc(feature_flags.created_at));

    res.json({ flags });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// POST /api/admin/feature-flags - Create new feature flag
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { flag_key, description, enabled_globally } = req.body;

    if (!flag_key || typeof flag_key !== 'string') {
      return res.status(400).json({ error: 'flag_key is required' });
    }

    const created = await db
      .insert(feature_flags)
      .values({
        flag_key: flag_key.trim(),
        description: description || null,
        enabled_globally: enabled_globally || false,
        enabled_for_orgs: [],
        disabled_for_orgs: [],
      })
      .returning();

    await logAdminAction({
      adminId: actor.id,
      action: 'feature_flag.create',
      targetType: 'feature_flag',
      targetId: created[0]!.id,
      details: { flag_key, description, enabled_globally },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.status(201).json({ flag: created[0] });
  } catch (error) {
    console.error('Error creating feature flag:', error);
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
});

// PATCH /api/admin/feature-flags/:id - Update feature flag
router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const flagId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!flagId) {
      return res.status(400).json({ error: 'Flag ID is required' });
    }
    const { description, enabled_globally, enabled_for_orgs, disabled_for_orgs } = req.body;

    const updates: Partial<typeof feature_flags.$inferInsert> = {
      updated_at: new Date(),
    };

    if (description !== undefined) updates.description = description;
    if (enabled_globally !== undefined) updates.enabled_globally = enabled_globally;
    if (enabled_for_orgs !== undefined) updates.enabled_for_orgs = enabled_for_orgs;
    if (disabled_for_orgs !== undefined) updates.disabled_for_orgs = disabled_for_orgs;

    const updated = await db
      .update(feature_flags)
      .set(updates)
      .where(eq(feature_flags.id, flagId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    await logAdminAction({
      adminId: actor.id,
      action: 'feature_flag.update',
      targetType: 'feature_flag',
      targetId: flagId,
      details: updates,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.json({ flag: updated[0] });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// DELETE /api/admin/feature-flags/:id - Delete feature flag
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const flagId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!flagId) {
      return res.status(400).json({ error: 'Flag ID is required' });
    }

    const deleted = await db
      .delete(feature_flags)
      .where(eq(feature_flags.id, flagId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    await logAdminAction({
      adminId: actor.id,
      action: 'feature_flag.delete',
      targetType: 'feature_flag',
      targetId: flagId,
      details: { flag_key: deleted[0]!.flag_key },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.json({ message: 'Feature flag deleted successfully' });
  } catch (error) {
    console.error('Error deleting feature flag:', error);
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
});

export default router;

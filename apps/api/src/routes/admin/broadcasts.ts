import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { admin_broadcast_messages } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import logger from '../../lib/logger.js';

/**
 * Admin Broadcast Messages Routes
 * Platform admins can send broadcast messages to all users or specific organizations/users
 */

const router = Router();

// GET /api/admin/broadcasts - List all broadcast messages
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const broadcasts = await db
      .select()
      .from(admin_broadcast_messages)
      .orderBy(desc(admin_broadcast_messages.created_at))
      .limit(100);

    res.json({ broadcasts });
  } catch (error) {
    logger.error('Error fetching broadcasts:', error);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
});

// POST /api/admin/broadcasts - Create new broadcast message
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, message, severity, target_type, target_ids, expires_at } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!target_type || !['all', 'organization', 'user'].includes(target_type)) {
      return res.status(400).json({ error: 'Invalid target_type (must be: all, organization, user)' });
    }

    const validSeverity = ['info', 'warning', 'urgent'].includes(severity) ? severity : 'info';

    // Create broadcast
    const created = await db
      .insert(admin_broadcast_messages)
      .values({
        admin_id: actor.id,
        title: title.trim(),
        message: message.trim(),
        severity: validSeverity,
        target_type,
        target_ids: target_ids && Array.isArray(target_ids) ? target_ids : null,
        expires_at: expires_at ? new Date(expires_at) : null,
      })
      .returning();

    await logAdminAction({
      adminId: actor.id,
      action: 'broadcast.create',
      targetType: 'broadcast',
      targetId: created[0]!.id,
      details: { title, target_type, target_count: target_ids?.length || 'all', severity: validSeverity },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.status(201).json({ broadcast: created[0] });
  } catch (error) {
    logger.error('Error creating broadcast:', error);
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
});

// DELETE /api/admin/broadcasts/:id - Delete broadcast message
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const broadcastId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!broadcastId) {
      return res.status(400).json({ error: 'Broadcast ID is required' });
    }

    const deleted = await db
      .delete(admin_broadcast_messages)
      .where(eq(admin_broadcast_messages.id, broadcastId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    await logAdminAction({
      adminId: actor.id,
      action: 'broadcast.delete',
      targetType: 'broadcast',
      targetId: broadcastId,
      details: { title: deleted[0]!.title },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.json({ message: 'Broadcast deleted successfully' });
  } catch (error) {
    logger.error('Error deleting broadcast:', error);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

export default router;

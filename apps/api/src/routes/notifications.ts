import { Router, Request, Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';

const router = Router();

function getActor(req: Request, res: Response): { id: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ error: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id };
}

// GET /api/v1/org/:slug/notifications - List notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const read = req.query.read as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    const conditions = [
      eq(notifications.organization_id, organizationId),
      eq(notifications.user_id, actor.id),
    ];

    if (read === 'true') {
      conditions.push(eq(notifications.read, true));
    }
    if (read === 'false') {
      conditions.push(eq(notifications.read, false));
    }

    const result = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);

    res.json({
      notifications: result,
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/v1/org/:slug/notifications/unread-count - Get unread count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.organization_id, organizationId),
          eq(notifications.user_id, actor.id),
          eq(notifications.read, false)
        )
      );

    const unreadCount = Number(result[0]?.count || 0);
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/v1/org/:slug/notifications/:id/read - Mark single as read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const updated = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.organization_id, organizationId),
          eq(notifications.user_id, actor.id)
        )
      )
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: updated[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/v1/org/:slug/notifications/read-all - Mark all as read
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;

    const updated = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.organization_id, organizationId),
          eq(notifications.user_id, actor.id),
          eq(notifications.read, false)
        )
      )
      .returning({ id: notifications.id });

    res.json({ updated: updated.length });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// DELETE /api/v1/org/:slug/notifications/:id - Delete notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const deleted = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.organization_id, organizationId),
          eq(notifications.user_id, actor.id)
        )
      )
      .returning({ id: notifications.id });

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;

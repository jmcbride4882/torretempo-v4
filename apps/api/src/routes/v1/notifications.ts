import { Router, Request, Response } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { notifications } from '../../db/schema.js';
import { logAudit } from '../../services/audit.service.js';

const router = Router();

/**
 * GET /api/v1/org/:slug/notifications
 * List user's notifications with pagination and filters
 * Query params: ?page=1&limit=20&status=unread&priority=urgent&type=schedule
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.session!.user.id;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(notifications.user_id, userId)];

    // Filter by status (unread)
    if (req.query.status === 'unread') {
      conditions.push(eq(notifications.read, false));
    }

    // Filter by type
    if (req.query.type) {
      conditions.push(eq(notifications.type, req.query.type as string));
    }

    // Fetch notifications
    const notificationsList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    res.json({
      data: notificationsList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/v1/org/:slug/notifications/unread-count
 * Get count of unread notifications for badge
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.session!.user.id;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, userId),
          eq(notifications.read, false)
        )
      );

    const count = countResult[0]?.count || 0;
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

/**
 * PATCH /api/v1/org/:slug/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.session!.user.id;
    const organizationId = req.organizationId!;
    const notificationId = req.params.id as string;

    // Fetch notification
    const notificationResult = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (notificationResult.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = notificationResult[0]!;

    // Verify ownership
    if (notification.user_id !== userId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Mark as read
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'notification.read',
      entityType: 'notifications',
      entityId: notificationId,
      newData: { id: notificationId, read: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/v1/org/:slug/notifications/read-all
 * Mark all unread notifications as read
 */
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.session!.user.id;
    const organizationId = req.organizationId!;

    // Mark all unread as read
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.user_id, userId),
          eq(notifications.read, false)
        )
      );

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId: userId,
      action: 'notification.read_all',
      entityType: 'notifications',
      newData: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

export default router;

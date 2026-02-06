import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import { db } from '../../db/index.js';
import { session, user } from '../../db/schema.js';
import { eq, desc, and, gt, inArray } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/admin/sessions
 * 
 * List all active sessions across the platform with user details.
 * 
 * Query params:
 * - limit: number (1-100, default 50)
 * - offset: number (default 0)
 * - userId: string (optional) - Filter by specific user
 * - includeExpired: boolean (default false) - Include expired sessions
 * 
 * Returns:
 * - sessions: Array of session objects with user details
 * - total: Total count
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const userId = req.query.userId as string | undefined;
    const includeExpired = req.query.includeExpired === 'true';

    // Build where conditions
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(session.userId, userId));
    }
    
    if (!includeExpired) {
      conditions.push(gt(session.expiresAt, new Date()));
    }

    // Fetch sessions with user details
    const sessions = await db
      .select({
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        impersonatedBy: session.impersonatedBy,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(session.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: db.$count(session.id) })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0]?.count || 0;

    res.json({
      sessions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/sessions/:id
 * 
 * Force logout a specific session (revoke session token).
 * This immediately invalidates the session and logs the user out.
 * 
 * Security:
 * - Only platform admins can force logout
 * - Action is logged to admin audit log
 * - Cannot force logout own session (prevents accidental lockout)
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;
    const actor = (req as any).actor;

    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch session details before deletion
    const sessionToDelete = await db
      .select({
        id: session.id,
        userId: session.userId,
        userEmail: user.email,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(eq(session.id, sessionId))
      .limit(1);

    if (!sessionToDelete.length) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const sessionData = sessionToDelete[0];
    if (!sessionData) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Prevent admin from logging out their own session
    if (sessionData.userId === actor.id) {
      return res.status(403).json({ 
        message: 'Cannot force logout your own session. Use normal logout instead.' 
      });
    }

    // Delete the session (force logout)
    await db
      .delete(session)
      .where(eq(session.id, sessionId));

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'session.force_logout',
      targetType: 'session',
      targetId: sessionId,
      details: {
        target_user_id: sessionData.userId,
        target_user_email: sessionData.userEmail,
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.json({ 
      message: 'Session revoked successfully',
      sessionId,
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/sessions/bulk-revoke
 * 
 * Revoke multiple sessions at once.
 * Useful for security incidents or mass logout scenarios.
 * 
 * Body:
 * - sessionIds: string[] - Array of session IDs to revoke
 * 
 * Returns:
 * - success: number - Count of successfully revoked sessions
 * - failed: number - Count of failed revocations
 */
router.post('/bulk-revoke', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { sessionIds } = req.body;
    const actor = (req as any).actor;

    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ message: 'sessionIds array is required' });
    }

    // Fetch session details
    const sessionsToDelete = await db
      .select({
        id: session.id,
        userId: session.userId,
      })
      .from(session)
      .where(inArray(session.id, sessionIds));

    // Filter out admin's own session
    const safeSessions = sessionsToDelete.filter((s) => s.userId !== actor.id);

    if (safeSessions.length === 0) {
      return res.status(400).json({ 
        message: 'No valid sessions to revoke (cannot revoke your own session)' 
      });
    }

    // Delete sessions
    const sessionIdsToDelete = safeSessions.map((s) => s.id);
    await db
      .delete(session)
      .where(inArray(session.id, sessionIdsToDelete));

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'session.bulk_revoke',
      targetType: 'session',
      details: {
        count: safeSessions.length,
        session_ids: safeSessions.map((s) => s.id),
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.json({
      message: 'Sessions revoked successfully',
      success: safeSessions.length,
      failed: sessionIds.length - safeSessions.length,
    });
  } catch (error) {
    console.error('Error bulk revoking sessions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

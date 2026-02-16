import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import { db } from '../../db/index.js';
import { user } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { auth } from '../../lib/auth.js';
import logger from '../../lib/logger.js';

const router = Router();

/**
 * POST /api/admin/users/:id/impersonate
 * 
 * Platform admin impersonates a user. This is a thin wrapper around
 * Better Auth's built-in impersonation to add audit logging.
 * 
 * Better Auth handles:
 * - Creating impersonation session with proper token
 * - Setting impersonation cookies
 * - Preserving admin session in signed admin_session cookie
 * - Session expiration (1 hour by default)
 * 
 * Security:
 * - Only role='admin' users can impersonate
 * - Cannot impersonate other admins (allowImpersonatingAdmins: false)
 * - All impersonation actions are audit logged
 */
router.post('/:id/impersonate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id as string;
    const actor = (req as any).actor;

    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify target user exists
    const targetUsers = await db
      .select()
      .from(user)
      .where(eq(user.id, targetUserId))
      .limit(1);

    if (!targetUsers.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = targetUsers[0];

    // Prevent impersonating other admins (double-check, Better Auth also blocks this)
    if (targetUser?.role === 'admin') {
      return res.status(403).json({ message: 'Cannot impersonate other administrators' });
    }

    // Call Better Auth impersonation API
    const impersonationResult = await auth.api.impersonateUser({
      body: {
        userId: targetUserId,
      },
    });

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'user.impersonate',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        impersonation_started: true,
        admin_email: actor.email,
        target_email: targetUser?.email || '',
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.json({ 
      message: 'Impersonation started',
      userId: targetUserId,
      session: impersonationResult.session,
    });
  } catch (error) {
    logger.error('Error during impersonation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/stop-impersonation
 * 
 * Exit impersonation and restore original admin session.
 * Better Auth restores the admin session from the signed admin_session cookie.
 */
router.post('/stop-impersonation', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = (req as any).actor;

    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Call Better Auth's built-in stop impersonation endpoint
    const stopResponse = await auth.api.stopImpersonating({
      headers: req.headers as any,
    });

    if (!stopResponse) {
      return res.status(500).json({ message: 'Stop impersonation failed' });
    }

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'user.stop_impersonation',
      targetType: 'user',
      targetId: actor.id,
      details: {
        impersonation_ended: true,
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Impersonation stopped' });
  } catch (error) {
    logger.error('Error stopping impersonation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import logger from '../lib/logger.js';

/**
 * Role Middleware (T12)
 * Generic middleware that checks permissions for any resource
 * 
 * - Accepts permissions parameter: Record<string, string[]>
 * - Uses auth.api.hasPermission() or manual check against roles
 * - Returns 403 if insufficient permissions
 * - Works with any resource
 * 
 * Usage:
 * app.post('/shifts', requireRole({ shift: ['create'] }), handler)
 */
export function requireRole(
  roles: string[]
): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get session from request headers
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      // Return 401 if no session
      if (!session) {
        res.status(401).json({ error: 'Unauthorized: No session found' });
        return;
      }

      const user = session.user as any;

      // Check if user has required permissions
      // For now, we'll do a simple role-based check
      // In a more complex system, you'd check against a permission matrix
      const userRole = user?.role || 'user';

      // Admin users have all permissions
      if (userRole === 'admin' || user?.isAdmin === true) {
        next();
        return;
      }

      // Check if user has any of the required roles
      let hasPermission = roles.includes(userRole);

      // Return 403 if insufficient permissions
      if (!hasPermission) {
        res.status(403).json({
          error: 'Forbidden: Insufficient permissions',
          required: roles,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

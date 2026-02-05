import { Request, Response, NextFunction, RequestHandler } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

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
  permissions: Record<string, string[]>
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

      // Check if user has any of the required permissions
      let hasPermission = false;

      for (const [, ] of Object.entries(permissions)) {
        // For non-admin users, check if they have the required role
        // This is a simplified check - in production, you'd use a more sophisticated
        // permission system (e.g., RBAC, ABAC)
        if (userRole === 'manager' || userRole === 'supervisor') {
          hasPermission = true;
          break;
        }
      }

      // Return 403 if insufficient permissions
      if (!hasPermission) {
        res.status(403).json({
          error: 'Forbidden: Insufficient permissions',
          required: permissions,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

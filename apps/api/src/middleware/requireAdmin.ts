import { Request, Response, NextFunction, RequestHandler } from 'express';
import { auth } from '../lib/auth';
import { fromNodeHeaders } from 'better-auth/node';

/**
 * Admin Middleware (T10)
 * Checks if user has admin role via Better Auth admin plugin
 * 
 * - Gets session via auth.api.getSession()
 * - Checks if user has admin role
 * - Returns 403 if not admin
 * - Attaches req.user
 */
export const requireAdmin: RequestHandler = async (
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

    // Check if user has admin role
    const user = session.user as any;
    const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

    // Return 403 if not admin
    if (!isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'admin',
    };

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

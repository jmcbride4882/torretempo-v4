import { Request, Response, NextFunction, RequestHandler } from 'express';
import { auth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { fromNodeHeaders } from 'better-auth/node';

/**
 * Tenant Middleware (T09)
 * Extracts session and organization context, sets up tenant isolation
 * 
 * - Extracts session via auth.api.getSession()
 * - Gets activeOrganizationId from session
 * - Executes SQL: SET LOCAL app.organization_id = ${orgId}
 * - Attaches req.session and req.organizationId
 * - Returns 401 if no session or no active org
 */
export const tenantMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract session from request headers
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // Return 401 if no session
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: No session found' });
      return;
    }

    // Get activeOrganizationId from session
    const activeOrganizationId = (session.user as any)?.activeOrganizationId;

    // Return 401 if no active organization
    if (!activeOrganizationId) {
      res.status(401).json({ error: 'Unauthorized: No active organization' });
      return;
    }

    // Set LOCAL app.organization_id for RLS policies
    await db.execute(`SET LOCAL app.organization_id = '${activeOrganizationId}'`);

    // Attach session and organizationId to request
    req.session = session;
    req.organizationId = activeOrganizationId;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

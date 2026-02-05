import { Request, Response, NextFunction, RequestHandler } from 'express';
import { auth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { fromNodeHeaders } from 'better-auth/node';
import { eq, and, sql } from 'drizzle-orm';
import { organization, member } from '../db/schema.js';

/**
 * Tenant Middleware (T09)
 * Extracts session and organization context, sets up tenant isolation
 * 
 * - Extracts session via auth.api.getSession()
 * - Gets organization slug from URL params
 * - Verifies user is a member of the organization
 * - Executes SQL: SET LOCAL app.organization_id = ${orgId}
 * - Attaches req.session and req.organizationId
 * - Returns 401 if no session, 403 if not a member, 404 if org not found
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

    // Extract organization slug from URL params
    const orgSlug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!orgSlug) {
      res.status(400).json({ error: 'Bad Request: Missing organization slug' });
      return;
    }

    // Find organization by slug
    const orgResult = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, orgSlug))
      .limit(1);

    if (orgResult.length === 0) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const org = orgResult[0];
    const organizationId = org!.id;

    // Verify user is a member of this organization
    const memberResult = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1);

    if (memberResult.length === 0) {
      res.status(403).json({ error: 'Forbidden: Not a member of this organization' });
      return;
    }

    // Set app.organization_id for RLS policies (session-scoped)
    await db.execute(sql.raw(`SET app.organization_id = '${organizationId}'`));

    // Attach session and organizationId to request
    req.session = session;
    req.organizationId = organizationId;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

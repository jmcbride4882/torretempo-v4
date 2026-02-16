import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createHash } from 'crypto';
import { db } from '../db/index.js';
import { inspector_tokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logAdminAction } from '../services/adminAudit.service.js';
import logger from '../lib/logger.js';

/**
 * Inspector Auth Middleware (T11)
 * Validates Bearer token from Authorization header
 * 
 * - Extracts Bearer token from Authorization header
 * - SHA-256 hashes the token
 * - Queries inspector_tokens table by token_hash
 * - Verifies: revoked_at IS NULL AND expires_at > NOW()
 * - Sets LOCAL app.organization_id = token.organization_id
 * - Logs access to admin_audit_log via T14 service
 * - Updates last_used_at
 * - Attaches req.inspectorToken
 * - Returns 401 if invalid/expired/revoked
 */
export const inspectorAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // SHA-256 hash the token
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Query inspector_tokens table by token_hash
    const tokenRecord = await db
      .select()
      .from(inspector_tokens)
      .where(eq(inspector_tokens.token_hash, tokenHash))
      .limit(1);

    // Return 401 if token not found
    if (tokenRecord.length === 0) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    const inspectorToken = tokenRecord[0]!;

    // Verify: revoked_at IS NULL AND expires_at > NOW()
    const now = new Date();
    if (inspectorToken.revoked_at !== null) {
      res.status(401).json({ error: 'Unauthorized: Token has been revoked' });
      return;
    }

    if (inspectorToken.expires_at < now) {
      res.status(401).json({ error: 'Unauthorized: Token has expired' });
      return;
    }

    // Set LOCAL app.organization_id for RLS policies
    await db.execute(`SET LOCAL app.organization_id = '${inspectorToken.organization_id}'`);

    // Get IP address from request
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Log access to admin_audit_log via T14 service
    await logAdminAction({
      adminId: inspectorToken.issued_by,
      action: 'inspector_access',
      targetType: 'inspector_token',
      targetId: inspectorToken.id,
      details: {
        issued_to: inspectorToken.issued_to,
        organization_id: inspectorToken.organization_id,
      },
      ip,
    });

    // Update last_used_at
    await db
      .update(inspector_tokens)
      .set({ last_used_at: now })
      .where(eq(inspector_tokens.id, inspectorToken.id));

    // Attach inspectorToken to request
    req.inspectorToken = {
      id: inspectorToken.id,
      organization_id: inspectorToken.organization_id,
      issued_by: inspectorToken.issued_by,
      issued_to: inspectorToken.issued_to || undefined,
      expires_at: inspectorToken.expires_at,
      revoked_at: inspectorToken.revoked_at || undefined,
      last_used_at: inspectorToken.last_used_at || undefined,
    };

    next();
  } catch (error) {
    logger.error('Inspector auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

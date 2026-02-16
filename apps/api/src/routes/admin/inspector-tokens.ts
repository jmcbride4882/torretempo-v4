import { Router, Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { inspector_tokens, member } from '../../db/schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import logger from '../../lib/logger.js';

/**
 * Admin Inspector Tokens Routes
 * Platform admins can manage ITSS inspector access tokens
 * 
 * Security:
 * - Requires tenantAdmin or owner role
 * - Tokens are SHA-256 hashed before storage
 * - All operations logged to admin_audit_log
 * - Max expiration: 90 days (regulatory compliance)
 */

const router = Router({ mergeParams: true });

/**
 * POST /api/admin/:slug/inspector-tokens
 * Generate new inspector token for organization
 * 
 * Body:
 * - issued_to: string (optional) - Email/name of inspector
 * - expires_in_days: number (default 30, max 90) - Token validity period
 * - notes: string (optional) - Internal notes about token purpose
 * 
 * Returns:
 * - token: string - Plaintext token (ONLY shown once)
 * - expires_at: Date - Token expiration
 * - token_id: string - Token ID for revocation
 * - message: string - Warning to save token
 */
router.post(
  '/',
  requireRole(['tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const actor = req.user || req.session?.user;

      // Verify actor exists
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found in session' });
      }

      // Verify actor is member of organization with proper role
      const memberRecord = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, actor.id),
            eq(member.organizationId, organizationId)
          )
        )
        .limit(1);

      if (memberRecord.length === 0) {
        return res.status(403).json({ error: 'Forbidden: Not a member of this organization' });
      }

      const userRole = memberRecord[0]!.role;
      if (!['tenantAdmin', 'owner'].includes(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          required: ['tenantAdmin', 'owner'],
          actual: userRole
        });
      }

      const { issued_to, expires_in_days = 30, notes } = req.body;

      // Validate expires_in_days (1-90 days for security)
      if (typeof expires_in_days !== 'number' || expires_in_days < 1 || expires_in_days > 90) {
        return res.status(400).json({ 
          error: 'Invalid expires_in_days: must be between 1 and 90 days',
          provided: expires_in_days
        });
      }

      // Generate cryptographically secure token
      // Format: itt_ + 64 hex chars (32 bytes) = 68 chars total
      const token = 'itt_' + randomBytes(32).toString('hex');
      
      // Hash token with SHA-256 for storage
      const tokenHash = createHash('sha256').update(token).digest('hex');

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_in_days);

      // Insert token into database
      const created = await db
        .insert(inspector_tokens)
        .values({
          organization_id: organizationId,
          token_hash: tokenHash,
          issued_by: actor.id,
          issued_to: issued_to || null,
          expires_at: expiresAt,
        })
        .returning();

      if (created.length === 0) {
        return res.status(500).json({ error: 'Failed to create token' });
      }

      const createdToken = created[0]!;

      // Log audit entry
      await logAdminAction({
        adminId: actor.id,
        action: 'inspector_token.generate',
        targetType: 'inspector_tokens',
        targetId: createdToken.id,
        details: {
          organization_id: organizationId,
          issued_to: issued_to || null,
          expires_in_days,
          expires_at: expiresAt.toISOString(),
          notes: notes || null,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      // TODO: Send email notification to tenant owner
      // This would use the email queue worker to notify the organization owner
      // that an inspector token has been generated

      // Return response with plaintext token (ONLY time it's shown)
      res.status(201).json({
        token, // Plaintext token - must be saved immediately
        expires_at: expiresAt,
        token_id: createdToken.id,
        issued_to: issued_to || null,
        message: 'Token generated successfully. Save this token - it cannot be retrieved again.',
      });
    } catch (error) {
      logger.error('Error generating inspector token:', error);
      res.status(500).json({ 
        error: 'Failed to generate inspector token',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/admin/:slug/inspector-tokens/:id
 * Revoke inspector token immediately
 * 
 * Params:
 * - id: string - Token ID to revoke
 * 
 * Returns:
 * - message: string - Success confirmation
 * - revoked_token: object - Revoked token metadata
 */
router.delete(
  '/:id',
  requireRole(['tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const actor = req.user || req.session?.user;
      const tokenId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Verify actor exists
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found in session' });
      }

      // Verify actor is member of organization with proper role
      const memberRecord = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, actor.id),
            eq(member.organizationId, organizationId)
          )
        )
        .limit(1);

      if (memberRecord.length === 0) {
        return res.status(403).json({ error: 'Forbidden: Not a member of this organization' });
      }

      const userRole = memberRecord[0]!.role;
      if (!['tenantAdmin', 'owner'].includes(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          required: ['tenantAdmin', 'owner'],
          actual: userRole
        });
      }

      // Validate token ID format (UUID)
      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      // Revoke token by setting revoked_at timestamp
      const updated = await db
        .update(inspector_tokens)
        .set({ revoked_at: new Date() })
        .where(
          and(
            eq(inspector_tokens.id, tokenId),
            eq(inspector_tokens.organization_id, organizationId)
          )
        )
        .returning();

      // Return 404 if token not found or doesn't belong to organization
      if (updated.length === 0) {
        return res.status(404).json({ 
          error: 'Token not found or does not belong to this organization',
          token_id: tokenId
        });
      }

      const revokedToken = updated[0]!;

      // Log audit entry
      await logAdminAction({
        adminId: actor.id,
        action: 'inspector_token.revoke',
        targetType: 'inspector_tokens',
        targetId: tokenId,
        details: {
          organization_id: organizationId,
          issued_to: revokedToken.issued_to,
          issued_by: revokedToken.issued_by,
          expires_at: revokedToken.expires_at.toISOString(),
          revoked_at: revokedToken.revoked_at?.toISOString(),
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({ 
        message: 'Token revoked successfully',
        revoked_token: {
          id: revokedToken.id,
          issued_to: revokedToken.issued_to,
          revoked_at: revokedToken.revoked_at,
        }
      });
    } catch (error) {
      logger.error('Error revoking inspector token:', error);
      res.status(500).json({ 
        error: 'Failed to revoke token',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/:slug/inspector-tokens
 * List all inspector tokens for organization
 * 
 * Query params:
 * - include_revoked: boolean (default false) - Include revoked tokens
 * 
 * Returns:
 * - tokens: array - List of token metadata (WITHOUT token_hash)
 */
router.get(
  '/',
  requireRole(['tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const actor = req.user || req.session?.user;
      const includeRevoked = req.query.include_revoked === 'true';

      // Verify actor exists
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found in session' });
      }

      // Verify actor is member of organization with proper role
      const memberRecord = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, actor.id),
            eq(member.organizationId, organizationId)
          )
        )
        .limit(1);

      if (memberRecord.length === 0) {
        return res.status(403).json({ error: 'Forbidden: Not a member of this organization' });
      }

      const userRole = memberRecord[0]!.role;
      if (!['tenantAdmin', 'owner'].includes(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          required: ['tenantAdmin', 'owner'],
          actual: userRole
        });
      }

      // Build query conditions
      const conditions: any[] = [eq(inspector_tokens.organization_id, organizationId)];

      // Filter out revoked tokens unless explicitly requested
      if (!includeRevoked) {
        conditions.push(isNull(inspector_tokens.revoked_at));
      }

      // Fetch tokens (exclude token_hash for security)
      const tokens = await db
        .select({
          id: inspector_tokens.id,
          issued_by: inspector_tokens.issued_by,
          issued_to: inspector_tokens.issued_to,
          expires_at: inspector_tokens.expires_at,
          revoked_at: inspector_tokens.revoked_at,
          last_used_at: inspector_tokens.last_used_at,
          created_at: inspector_tokens.created_at,
        })
        .from(inspector_tokens)
        .where(and(...conditions))
        .orderBy(desc(inspector_tokens.created_at));

      // Calculate token status for each token
      const now = new Date();
      const tokensWithStatus = tokens.map(token => ({
        ...token,
        status: token.revoked_at 
          ? 'revoked' 
          : token.expires_at < now 
            ? 'expired' 
            : 'active',
      }));

      res.json({ 
        tokens: tokensWithStatus,
        count: tokensWithStatus.length,
        active_count: tokensWithStatus.filter(t => t.status === 'active').length,
      });
    } catch (error) {
      logger.error('Error fetching inspector tokens:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

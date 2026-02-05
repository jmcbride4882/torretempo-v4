import { Router, Request, Response } from 'express';
import { and, eq, desc, like, sql, or, inArray } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { organization, member, invitation, subscription_details, user } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';

import type { 
  TenantDetailResponse
} from '../../types/admin-types.js';

/**
 * Admin Tenants Routes
 * Platform admins can list, view, suspend, and delete organizations
 * 
 * Security:
 * - Requires admin role (bypasses RLS)
 * - All mutations logged to admin_audit_log
 * - Delete requires explicit confirmation (destructive action)
 * - Suspend marks organization as inactive in metadata
 */

const router = Router();

/**
 * GET /api/admin/tenants
 * List all organizations with pagination, search, and filters
 * 
 * Query params:
 * - limit: number (1-100, default 50) - Results per page
 * - offset: number (default 0) - Pagination offset
 * - search: string (optional) - Search by name or slug
 * 
 * Returns:
 * - PaginatedResponse<TenantListItem> with organization data, member counts, subscription info
 */
router.get(
  '/',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user;

      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found' });
      }

      // Parse pagination parameters
      const rawLimit = req.query.limit ? Number(req.query.limit) : 50;
      const limit = Math.min(Math.max(rawLimit, 1), 100); // Clamp between 1-100
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const search = req.query.search ? String(req.query.search) : '';

      // Build where conditions
      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            like(organization.name, `%${search}%`),
            like(organization.slug, `%${search}%`)
          )
        );
      }

      // Query total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organization)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count || 0;

      // Query organizations with joins
      const orgs = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
          createdAt: organization.createdAt,
          metadata: organization.metadata,
        })
        .from(organization)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(organization.createdAt))
        .limit(limit)
        .offset(offset);

      // Fetch member counts for each organization
      const orgIds = orgs.map((org) => org.id);
      const memberCounts = orgIds.length > 0
        ? await db
          .select({
            organizationId: member.organizationId,
            count: sql<number>`count(*)::int`,
          })
          .from(member)
          .where(inArray(member.organizationId, orgIds))
          .groupBy(member.organizationId)
        : [];

      const memberCountMap = new Map(
        memberCounts.map((mc) => [mc.organizationId, mc.count])
      );

      // Fetch subscription details for each organization
      const subscriptions = orgIds.length > 0 
        ? await db
          .select({
            organizationId: subscription_details.organization_id,
            tier: subscription_details.tier,
            trialEndsAt: subscription_details.trial_ends_at,
          })
          .from(subscription_details)
          .where(inArray(subscription_details.organization_id, orgIds))
        : [];

      const subscriptionMap = new Map(
        subscriptions.map((sub) => [sub.organizationId, sub])
      );

      // Fetch owners (members with role 'owner') for each organization
      const owners = orgIds.length > 0
        ? await db
          .select({
            organizationId: member.organizationId,
            userId: member.userId,
            userName: user.name,
            userEmail: user.email,
          })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(
            and(
              inArray(member.organizationId, orgIds),
              eq(member.role, 'owner')
            )
          )
        : [];

      const ownerMap = new Map(
        owners.map((o) => [o.organizationId, { id: o.userId, name: o.userName, email: o.userEmail }])
      );

      // Transform to TenantListItem[]
      const data = orgs.map((org) => {
        const memberCount = memberCountMap.get(org.id) || 0;
        const subscription = subscriptionMap.get(org.id);
        const owner = ownerMap.get(org.id);
        const metadata = org.metadata ? JSON.parse(org.metadata) : {};

        // Determine status
        let status: 'active' | 'suspended' | 'cancelled' | 'past_due' = 'active';
        if (metadata.suspended === true) {
          status = 'suspended';
        } else if (subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > new Date()) {
          // Trial is still "active" status
          status = 'active';
        }

        // Ensure subscriptionTier has correct type
        const tier = subscription?.tier || 'starter';
        const subscriptionTier: 'free' | 'starter' | 'pro' | 'enterprise' = 
          tier === 'professional' ? 'pro' : 
          tier === 'enterprise' ? 'enterprise' : 
          tier === 'free' ? 'free' : 'starter';

        return {
          id: org.id,
          name: org.name,
          slug: org.slug || '',
          logo: org.logo,
          createdAt: org.createdAt.toISOString(),
          memberCount,
          subscriptionTier,
          subscriptionStatus: status,
          owner,
        };
      });

      // Return paginated response (match frontend expectations)
      const response = {
        tenants: data,
        total,
        limit,
        page: Math.floor(offset / limit) + 1,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({
        error: 'Failed to fetch tenants',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/tenants/:id
 * View single organization with full details (members, subscription, usage stats)
 * 
 * Params:
 * - id: string - Organization ID
 * 
 * Returns:
 * - TenantDetailResponse with comprehensive organization data
 */
router.get(
  '/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user;

      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found' });
      }

      const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Query organization
      const orgResult = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
          createdAt: organization.createdAt,
          metadata: organization.metadata,
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const org = orgResult[0]!;
      const metadata = org.metadata ? JSON.parse(org.metadata) : {};

      // Query member count
      const memberCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(member)
        .where(eq(member.organizationId, organizationId));

      const memberCount = memberCountResult[0]?.count || 0;

      // Query subscription details
      const subscriptionResult = await db
        .select()
        .from(subscription_details)
        .where(eq(subscription_details.organization_id, organizationId))
        .limit(1);

      const subscription = subscriptionResult[0] || null;

      // Determine status
      let status: 'active' | 'suspended' | 'trial' = 'active';
      if (metadata.suspended === true) {
        status = 'suspended';
      } else if (subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()) {
        status = 'trial';
      }

      // Ensure subscriptionTier has correct type
      const tier = subscription?.tier || 'starter';
      const subscriptionTier: 'starter' | 'professional' | 'enterprise' = 
        tier === 'professional' || tier === 'enterprise' ? tier : 'starter';

      // Build response
      const response: TenantDetailResponse = {
        id: org.id,
        name: org.name,
        slug: org.slug || '',
        logo: org.logo,
        createdAt: org.createdAt,
        memberCount,
        subscriptionTier,
        seatCount: subscription?.seat_count || 0,
        status,
        trialEndsAt: subscription?.trial_ends_at || null,
        stripeCustomerId: subscription?.stripe_customer_id || null,
        gocardlessCustomerId: subscription?.gocardless_customer_id || null,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      res.status(500).json({
        error: 'Failed to fetch tenant details',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/admin/tenants/:id/suspend
 * Suspend organization (marks as inactive, prevents login)
 * 
 * Params:
 * - id: string - Organization ID
 * 
 * Body:
 * - reason: string (optional) - Reason for suspension
 * 
 * Returns:
 * - Success message with suspended organization details
 */
router.post(
  '/:id/suspend',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user;

      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found' });
      }

      const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const reason = req.body.reason || 'No reason provided';

      // Verify organization exists
      const orgResult = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          metadata: organization.metadata,
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const org = orgResult[0]!;
      const existingMetadata = org.metadata ? JSON.parse(org.metadata) : {};

      // Update metadata with suspension info
      const updatedMetadata = {
        ...existingMetadata,
        suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_by: actor.id,
        suspended_reason: reason,
      };

      // Update organization
      await db
        .update(organization)
        .set({
          metadata: JSON.stringify(updatedMetadata),
        })
        .where(eq(organization.id, organizationId));

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'tenant.suspend',
        targetType: 'organization',
        targetId: organizationId,
        details: {
          organization_name: org.name,
          slug: org.slug,
          reason,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({
        message: 'Organization suspended successfully',
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          suspended_at: updatedMetadata.suspended_at,
          suspended_by: actor.id,
        },
      });
    } catch (error) {
      console.error('Error suspending tenant:', error);
      res.status(500).json({
        error: 'Failed to suspend tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/admin/tenants/:id/unsuspend
 * Unsuspend organization (reactivate, restore access)
 * 
 * Params:
 * - id: string - Organization ID
 * 
 * Returns:
 * - Success message with unsuspended organization details
 */
router.post(
  '/:id/unsuspend',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user;

      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found' });
      }

      const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // Verify organization exists
      const orgResult = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          metadata: organization.metadata,
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const org = orgResult[0]!;
      const existingMetadata = org.metadata ? JSON.parse(org.metadata) : {};

      // Update metadata to remove suspension info
      const updatedMetadata = {
        ...existingMetadata,
        suspended: false,
        unsuspended_at: new Date().toISOString(),
        unsuspended_by: actor.id,
      };

      // Update organization
      await db
        .update(organization)
        .set({
          metadata: JSON.stringify(updatedMetadata),
        })
        .where(eq(organization.id, organizationId));

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'tenant.unsuspend',
        targetType: 'organization',
        targetId: organizationId,
        details: {
          organization_name: org.name,
          slug: org.slug,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({
        message: 'Organization unsuspended successfully',
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          unsuspended_at: updatedMetadata.unsuspended_at,
          unsuspended_by: actor.id,
        },
      });
    } catch (error) {
      console.error('Error unsuspending tenant:', error);
      res.status(500).json({
        error: 'Failed to unsuspend tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/admin/tenants/:id
 * Delete organization with cascade confirmation
 * 
 * Params:
 * - id: string - Organization ID
 * 
 * Body:
 * - confirmation: string (required) - Must match organization slug for safety
 * 
 * Returns:
 * - Success message with deleted organization details
 */
router.delete(
  '/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user;

      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found' });
      }

      const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const confirmation = typeof req.body.confirmation === 'string' 
        ? req.body.confirmation 
        : '';

      // Verify organization exists
      const orgResult = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const org = orgResult[0]!;

      // Verify confirmation matches slug
      if (confirmation !== org.slug) {
        return res.status(400).json({
          error: 'Confirmation does not match organization slug',
          required: org.slug,
          provided: confirmation,
        });
      }

      // Query member count for audit log
      const memberCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(member)
        .where(eq(member.organizationId, organizationId));

      const memberCount = memberCountResult[0]?.count || 0;

      // Cascade delete related records manually (Better Auth tables don't have ON DELETE CASCADE)
      
      // 1. Delete all invitations
      await db
        .delete(invitation)
        .where(eq(invitation.organizationId, organizationId));

      // 2. Delete all members
      await db
        .delete(member)
        .where(eq(member.organizationId, organizationId));

      // 3. Delete subscription details (if any)
      await db
        .delete(subscription_details)
        .where(eq(subscription_details.organization_id, organizationId));

      // 4. Finally delete the organization
      await db.delete(organization).where(eq(organization.id, organizationId));

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'tenant.delete',
        targetType: 'organization',
        targetId: organizationId,
        details: {
          organization_name: org.name,
          slug: org.slug,
          member_count: memberCount,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({
        message: 'Organization deleted successfully',
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          member_count: memberCount,
          deleted_at: new Date().toISOString(),
          deleted_by: actor.id,
        },
      });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      res.status(500).json({
        error: 'Failed to delete tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;

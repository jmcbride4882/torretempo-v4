import { Router, Request, Response } from 'express';
import { and, eq, desc, like, or, sql, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { user, member, organization } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import type { 
  UserDetailResponse, 
  BanUserResponse 
} from '../../types/admin-types.js';

/**
 * Admin User Management Routes
 * Platform admins can list, search, ban/unban users, and grant/revoke admin roles
 * 
 * Security:
 * - Requires platform admin role (role='admin')
 * - All mutations logged to admin_audit_log
 * - Admins cannot revoke their own admin role
 * - Ban expiration defaults to 30 days (configurable)
 */

const router = Router();

/**
 * GET /api/admin/users
 * List all users with pagination, search, and filters
 * 
 * Query params:
 * - limit: number (1-100, default 50) - Results per page
 * - offset: number (default 0) - Pagination offset
 * - search: string (optional) - Search by name or email
 * - role: 'admin' | 'null' (optional) - Filter by platform role
 * - banned: 'true' | 'false' (optional) - Filter by banned status
 * 
 * Returns:
 * - PaginatedResponse<UserListItem> - List of users with organization count
 */
router.get(
  '/',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Parse pagination params
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      // Parse filter params
      const searchQuery = req.query.search as string | undefined;
      const roleFilter = req.query.role as 'admin' | 'null' | undefined;
      const bannedFilter = req.query.banned as 'true' | 'false' | undefined;

      // Build WHERE conditions
      const conditions: any[] = [];

      // Search filter (name or email)
      if (searchQuery) {
        conditions.push(
          or(
            like(user.name, `%${searchQuery}%`),
            like(user.email, `%${searchQuery}%`)
          )
        );
      }

      // Role filter
      if (roleFilter === 'admin') {
        conditions.push(eq(user.role, 'admin'));
      } else if (roleFilter === 'null') {
        conditions.push(sql`${user.role} IS NULL`);
      }

      // Banned filter
      if (bannedFilter === 'true') {
        conditions.push(eq(user.banned, true));
      } else if (bannedFilter === 'false') {
        conditions.push(or(eq(user.banned, false), sql`${user.banned} IS NULL`));
      }

      // Get total count
      const totalQuery = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalQuery[0]?.count || 0;

      // Get users with organization memberships subquery
      const users = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
          banned: user.banned,
          image: user.image,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset);

      // Get organization memberships for each user
      const userIds = users.map(u => u.id);
      const memberships = userIds.length > 0
        ? await db
            .select({
              userId: member.userId,
              orgId: organization.id,
              orgName: organization.name,
              orgSlug: organization.slug,
              role: member.role,
            })
            .from(member)
            .innerJoin(organization, eq(member.organizationId, organization.id))
            .where(inArray(member.userId, userIds))
        : [];

      // Build response with organizations (filter out orgs with null slugs)
      const usersWithOrgs = users.map(u => {
        const userOrgs = memberships
          .filter((m): m is typeof m & { orgSlug: string } => 
            m.userId === u.id && m.orgSlug !== null
          )
          .map(m => ({
            id: m.orgId,
            name: m.orgName,
            slug: m.orgSlug,
            role: m.role,
          }));
        
        return {
          ...u,
          isAdmin: u.role === 'admin',
          organizations: userOrgs,
        };
      });

      // Return response (match frontend expectations)
      const response = {
        users: usersWithOrgs,
        total,
        limit,
        page: Math.floor(offset / limit) + 1,
      };

      res.json(response);
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ 
        error: 'Failed to list users',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/users/:id
 * Get detailed user information with organization memberships
 * 
 * Params:
 * - id: string - User ID
 * 
 * Returns:
 * - UserDetailResponse - Full user info with organization details
 */
router.get(
  '/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user
      const users = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = users[0]!;

      // Get organization memberships with member counts
      const memberships = await db
        .select({
          orgId: organization.id,
          orgName: organization.name,
          orgSlug: organization.slug,
          role: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, userId));

      // Get member counts for each organization
      const orgIds = memberships.map(m => m.orgId);
      const memberCounts = await db
        .select({
          orgId: member.organizationId,
          count: sql<number>`count(*)::int`,
        })
        .from(member)
        .where(sql`${member.organizationId} = ANY(${orgIds})`)
        .groupBy(member.organizationId);

      // Build response (filter out orgs with null slugs)
      const userOrgs = memberships
        .filter((m): m is typeof m & { orgSlug: string } => m.orgSlug !== null)
        .map(m => ({
          id: m.orgId,
          name: m.orgName,
          slug: m.orgSlug,
          role: m.role,
          memberCount: memberCounts.find(mc => mc.orgId === m.orgId)?.count || 0,
        }));

      const response: UserDetailResponse = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        emailVerified: userData.emailVerified,
        role: userData.role,
        banned: userData.banned,
        banReason: userData.banReason,
        banExpires: userData.banExpires,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        organizations: userOrgs,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user details:', error);
      res.status(500).json({ 
        error: 'Failed to get user details',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PATCH /api/admin/users/:id
 * Update user details
 * 
 * Params:
 * - id: string - User ID
 * 
 * Body:
 * - name: string (optional) - User name
 * - email: string (optional) - User email
 * - role: 'admin' | null (optional) - Platform role
 * - emailVerified: boolean (optional) - Email verified status
 * 
 * Returns:
 * - Success message with updated user details
 */
router.patch(
  '/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user;

      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found' });
      }

      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const { name, email, role, emailVerified } = req.body;

      // Verify user exists
      const userResult = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const existingUser = userResult[0]!;

      // Prevent admin from removing their own admin role
      if (userId === actor.id && role === null && existingUser.role === 'admin') {
        return res.status(400).json({ 
          error: 'Cannot revoke your own admin role',
        });
      }

      // Build update object (only include provided fields)
      const updates: Partial<typeof user.$inferInsert> = {};
      
      if (name !== undefined && name.trim() !== '') {
        updates.name = name.trim();
      }
      
      if (email !== undefined && email.trim() !== '') {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if email is already taken by another user
        const existingEmailUser = await db
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.email, email.trim()), sql`${user.id} != ${userId}`))
          .limit(1);

        if (existingEmailUser.length > 0) {
          return res.status(400).json({ error: 'Email already in use by another user' });
        }

        updates.email = email.trim();
      }
      
      if (role !== undefined) {
        updates.role = role === 'admin' ? 'admin' : null;
      }

      if (emailVerified !== undefined) {
        updates.emailVerified = Boolean(emailVerified);
      }

      // Always update updatedAt
      updates.updatedAt = new Date();

      // Update user if there are changes
      if (Object.keys(updates).length > 1) { // > 1 because updatedAt is always included
        await db
          .update(user)
          .set(updates)
          .where(eq(user.id, userId));
      }

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'user.update',
        targetType: 'user',
        targetId: userId,
        details: {
          user_name: existingUser.name,
          user_email: existingUser.email,
          updates,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({
        message: 'User updated successfully',
        user: {
          id: existingUser.id,
          name: updates.name || existingUser.name,
          email: updates.email || existingUser.email,
          role: updates.role !== undefined ? updates.role : existingUser.role,
          emailVerified: updates.emailVerified !== undefined ? updates.emailVerified : undefined,
        },
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/admin/users/:id/ban
 * Ban a user (sets banned=true, banReason, banExpires)
 * 
 * Params:
 * - id: string - User ID
 * 
 * Body:
 * - reason: string (required) - Reason for ban
 * - expiresInDays: number (optional, default 30) - Ban duration in days
 * 
 * Returns:
 * - BanUserResponse - Ban confirmation with details
 */
router.post(
  '/:id/ban',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { reason, expiresInDays = 30 } = req.body;

      // Validate inputs
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Ban reason is required' });
      }

      if (typeof expiresInDays !== 'number' || expiresInDays < 1 || expiresInDays > 365) {
        return res.status(400).json({ 
          error: 'Invalid expiresInDays: must be between 1 and 365 days',
          provided: expiresInDays
        });
      }

      // Get user
      const users = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = users[0]!;

      // Check if already banned
      if (userData.banned === true) {
        return res.status(400).json({ 
          error: 'User is already banned',
          banReason: userData.banReason,
          banExpires: userData.banExpires
        });
      }

      // Calculate ban expiration
      const banExpires = new Date();
      banExpires.setDate(banExpires.getDate() + expiresInDays);

      // Update user
      const updated = await db
        .update(user)
        .set({
          banned: true,
          banReason: reason.trim(),
          banExpires,
        })
        .where(eq(user.id, userId))
        .returning();

      if (updated.length === 0) {
        return res.status(500).json({ error: 'Failed to ban user' });
      }

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'user.ban',
        targetType: 'user',
        targetId: userId,
        details: {
          reason: reason.trim(),
          expiresInDays,
          banExpires: banExpires.toISOString(),
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      const response: BanUserResponse = {
        userId,
        banned: true,
        bannedAt: new Date(),
        bannedUntil: banExpires,
        reason: reason.trim(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ 
        error: 'Failed to ban user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/admin/users/:id/unban
 * Unban a user (sets banned=false, clears banReason and banExpires)
 * 
 * Params:
 * - id: string - User ID
 * 
 * Returns:
 * - { message: string, userId: string } - Success confirmation
 */
router.post(
  '/:id/unban',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user
      const users = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = users[0]!;

      // Check if currently banned
      if (userData.banned !== true) {
        return res.status(400).json({ error: 'User is not currently banned' });
      }

      // Update user
      const updated = await db
        .update(user)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
        })
        .where(eq(user.id, userId))
        .returning();

      if (updated.length === 0) {
        return res.status(500).json({ error: 'Failed to unban user' });
      }

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'user.unban',
        targetType: 'user',
        targetId: userId,
        details: {
          previousBanReason: userData.banReason,
          previousBanExpires: userData.banExpires?.toISOString() || null,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({ 
        message: 'User unbanned successfully',
        userId,
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ 
        error: 'Failed to unban user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/admin/users/:id/grant-admin
 * Grant platform admin role (sets role='admin')
 * 
 * Params:
 * - id: string - User ID
 * 
 * Returns:
 * - { message: string, userId: string, role: string } - Success confirmation
 */
router.post(
  '/:id/grant-admin',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user
      const users = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = users[0]!;

      // Check if already admin
      if (userData.role === 'admin') {
        return res.status(400).json({ error: 'User already has admin role' });
      }

      // Update user
      const updated = await db
        .update(user)
        .set({ role: 'admin' })
        .where(eq(user.id, userId))
        .returning();

      if (updated.length === 0) {
        return res.status(500).json({ error: 'Failed to grant admin role' });
      }

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'user.grant_admin',
        targetType: 'user',
        targetId: userId,
        details: {
          previousRole: userData.role,
          newRole: 'admin',
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({ 
        message: 'Admin role granted successfully',
        userId,
        role: 'admin',
      });
    } catch (error) {
      console.error('Error granting admin role:', error);
      res.status(500).json({ 
        error: 'Failed to grant admin role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/admin/users/:id/revoke-admin
 * Revoke platform admin role (sets role=null)
 * Prevents revoking own admin role for safety
 * 
 * Params:
 * - id: string - User ID
 * 
 * Returns:
 * - { message: string, userId: string } - Success confirmation
 */
router.post(
  '/:id/revoke-admin',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Prevent revoking own admin role
      if (userId === actor.id) {
        return res.status(403).json({ 
          error: 'Forbidden: Cannot revoke your own admin role',
          hint: 'Have another admin revoke your role if needed'
        });
      }

      // Get user
      const users = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = users[0]!;

      // Check if user has admin role
      if (userData.role !== 'admin') {
        return res.status(400).json({ 
          error: 'User does not have admin role',
          currentRole: userData.role || null
        });
      }

      // Update user
      const updated = await db
        .update(user)
        .set({ role: null })
        .where(eq(user.id, userId))
        .returning();

      if (updated.length === 0) {
        return res.status(500).json({ error: 'Failed to revoke admin role' });
      }

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'user.revoke_admin',
        targetType: 'user',
        targetId: userId,
        details: {
          previousRole: 'admin',
          newRole: null,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({ 
        message: 'Admin role revoked successfully',
        userId,
      });
    } catch (error) {
      console.error('Error revoking admin role:', error);
      res.status(500).json({ 
        error: 'Failed to revoke admin role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

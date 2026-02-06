import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { user, organization, session, subscription_details } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import type { 
  AnalyticsDashboardResponse, 
  UserGrowthDataPoint,
  RevenueTrendDataPoint,
  FeatureAdoptionMetric
} from '../../types/admin-types.js';

/**
 * Admin Analytics Routes
 * Platform admins can view user growth, revenue trends, and organization metrics
 * 
 * Security:
 * - Requires admin role
 * - Read-only operations
 * - All queries aggregated (no PII exposed)
 */

const router = Router();

/**
 * GET /api/admin/analytics
 * Get comprehensive analytics dashboard with user growth, revenue, and org metrics
 * 
 * Query params:
 * - days: number (default 30) - Number of days to include in analytics
 * 
 * Returns:
 * - timestamp: Current date/time
 * - period: Start and end dates for analytics period
 * - userGrowth: User growth data and totals
 * - revenueTrend: Revenue trend data (placeholder until Stripe integration)
 * - organizationMetrics: Organization statistics
 * - featureAdoption: Feature adoption rates (placeholder)
 * - topOrganizations: Top organizations by member count
 */
router.get(
  '/',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const days = Math.min(parseInt(req.query.days as string) || 30, 365);
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // ====================================================================
      // USER GROWTH METRICS
      // ====================================================================

      // Get user signups per day
      const userGrowthData = await db
        .select({
          date: sql<string>`DATE(${user.createdAt})`,
          newUsers: count(),
        })
        .from(user)
        .where(gte(user.createdAt, startDate))
        .groupBy(sql`DATE(${user.createdAt})`)
        .orderBy(sql`DATE(${user.createdAt})`);

      // Calculate cumulative totals
      let cumulativeUsers = 0;
      const userGrowthPoints: UserGrowthDataPoint[] = userGrowthData.map(row => {
        cumulativeUsers += row.newUsers;
        return {
          date: new Date(row.date),
          totalUsers: cumulativeUsers,
          newUsers: row.newUsers,
          activeUsers: 0, // Will calculate separately
        };
      });

      // Get total users
      const totalUsersResult = await db
        .select({ count: count() })
        .from(user);
      const totalUsers = totalUsersResult[0]?.count || 0;

      // Get new users in period
      const newUsersResult = await db
        .select({ count: count() })
        .from(user)
        .where(gte(user.createdAt, startDate));
      const newUsersThisPeriod = newUsersResult[0]?.count || 0;

      // Get active users in period (users with sessions updated in last 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activeUsersResult = await db
        .select({ count: count() })
        .from(session)
        .where(gte(session.updatedAt, sevenDaysAgo));
      const activeUsersThisPeriod = activeUsersResult[0]?.count || 0;

      // ====================================================================
      // REVENUE TREND (PLACEHOLDER UNTIL PHASE 6B)
      // ====================================================================

      // TODO: Implement after Phase 6B Stripe integration
      // This will query stripe payment history and subscription changes
      const revenueTrendPoints: RevenueTrendDataPoint[] = [];
      const totalMrr = 0;
      const totalArr = 0;
      const periodRevenue = 0;

      // ====================================================================
      // ORGANIZATION METRICS
      // ====================================================================

      // Get total organizations
      const totalOrgsResult = await db
        .select({ count: count() })
        .from(organization);
      const totalOrganizations = totalOrgsResult[0]?.count || 0;

      // Get new organizations in period
      const newOrgsResult = await db
        .select({ count: count() })
        .from(organization)
        .where(gte(organization.createdAt, startDate));
      const newOrganizationsThisPeriod = newOrgsResult[0]?.count || 0;

      // Get active organizations (organizations with at least one user session in last 7 days)
      // Note: This is a simplified query - in production we'd use a more sophisticated definition
      const activeOrganizations = totalOrganizations; // Placeholder

      // Get average members per organization
      // Note: Simplified calculation - just total users / total orgs
      const averageMembersPerOrg = totalOrganizations > 0 
        ? Math.round(totalUsers / totalOrganizations) 
        : 0;

      // ====================================================================
      // FEATURE ADOPTION (PLACEHOLDER)
      // ====================================================================

      // TODO: Define feature adoption metrics
      // Examples: shift scheduling, time tracking, swaps, reporting
      const featureAdoptionMetrics: FeatureAdoptionMetric[] = [
        {
          feature: 'Time Tracking',
          adoptionRate: 0,
          activeOrganizations: 0,
          totalOrganizations,
        },
        {
          feature: 'Shift Scheduling',
          adoptionRate: 0,
          activeOrganizations: 0,
          totalOrganizations,
        },
        {
          feature: 'Swap Requests',
          adoptionRate: 0,
          activeOrganizations: 0,
          totalOrganizations,
        },
      ];

      // ====================================================================
      // TOP ORGANIZATIONS
      // ====================================================================

      // Get top organizations by member count
      const topOrgs = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          createdAt: organization.createdAt,
          tier: subscription_details.tier,
          seatCount: subscription_details.seat_count,
        })
        .from(organization)
        .leftJoin(subscription_details, eq(organization.id, subscription_details.organization_id))
        .orderBy(desc(subscription_details.seat_count))
        .limit(10);

      const topOrganizations = topOrgs.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug || 'unknown',
        memberCount: org.seatCount || 0,
        subscriptionTier: org.tier || 'starter',
        mrr: 0, // TODO: Calculate from subscription_details
      }));

      // ====================================================================
      // BUILD RESPONSE
      // ====================================================================

      const response: AnalyticsDashboardResponse = {
        timestamp: now,
        period: {
          startDate,
          endDate: now,
        },
        userGrowth: {
          data: userGrowthPoints,
          totalUsers,
          newUsersThisPeriod,
          activeUsersThisPeriod,
        },
        revenueTrend: {
          data: revenueTrendPoints,
          totalMrr,
          totalArr,
          periodRevenue,
        },
        organizationMetrics: {
          totalOrganizations,
          activeOrganizations,
          newOrganizationsThisPeriod,
          averageMembersPerOrg: Math.round(averageMembersPerOrg * 100) / 100,
        },
        featureAdoption: featureAdoptionMetrics,
        topOrganizations,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error);
      res.status(500).json({ 
        error: 'Failed to fetch analytics dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/analytics/user-growth
 * Get detailed user growth data with daily signups
 * 
 * Query params:
 * - date_from: ISO date string (optional, default 90 days ago)
 * - date_to: ISO date string (optional, default today)
 * 
 * Returns:
 * - period: Start and end dates
 * - data: Array of user growth data points (date, signups, cumulative)
 * - totalNewUsers: Total new users in period
 * - averagePerDay: Average signups per day
 */
router.get(
  '/user-growth',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const defaultStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      const dateFrom = req.query.date_from 
        ? new Date(req.query.date_from as string) 
        : defaultStartDate;
      const dateTo = req.query.date_to 
        ? new Date(req.query.date_to as string) 
        : now;

      // Validate date range
      if (isNaN(dateFrom.getTime())) {
        return res.status(400).json({ 
          error: 'Invalid date_from format. Use ISO 8601 format.'
        });
      }
      if (isNaN(dateTo.getTime())) {
        return res.status(400).json({ 
          error: 'Invalid date_to format. Use ISO 8601 format.'
        });
      }

      // Get user signups per day
      const userGrowthData = await db
        .select({
          date: sql<string>`DATE(${user.createdAt})`,
          signups: count(),
        })
        .from(user)
        .where(
          and(
            gte(user.createdAt, dateFrom),
            lte(user.createdAt, dateTo)
          )
        )
        .groupBy(sql`DATE(${user.createdAt})`)
        .orderBy(sql`DATE(${user.createdAt})`);

      // Calculate cumulative totals
      let cumulative = 0;
      const dataPoints = userGrowthData.map(row => {
        cumulative += row.signups;
        return {
          date: row.date,
          signups: row.signups,
          cumulative,
        };
      });

      // Calculate statistics
      const totalNewUsers = dataPoints.reduce((sum, point) => sum + point.signups, 0);
      const dayCount = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000)));
      const averagePerDay = Math.round((totalNewUsers / dayCount) * 100) / 100;

      res.json({
        period: {
          startDate: dateFrom,
          endDate: dateTo,
        },
        data: dataPoints,
        totalNewUsers,
        averagePerDay,
        dayCount,
      });
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user growth data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/analytics/revenue-trend
 * Get revenue trend data over time
 * 
 * PLACEHOLDER: This endpoint will be implemented after Phase 6B Stripe integration
 * 
 * Query params:
 * - date_from: ISO date string (optional, default 90 days ago)
 * - date_to: ISO date string (optional, default today)
 * 
 * Returns:
 * - Empty array until Stripe integration is complete
 */
router.get(
  '/revenue-trend',
  requireAdmin,
  async (_req: Request, res: Response) => {
    // TODO: Implement after Phase 6B Stripe integration
    // This will query:
    // 1. stripe_payment_history for completed payments
    // 2. subscription_details changes for MRR/ARR trends
    // 3. cancellation events for churned revenue
    res.json({
      message: 'Revenue trend analytics will be available after Phase 6B Stripe integration',
      data: [],
      totalMrr: 0,
      totalArr: 0,
    });
  }
);

/**
 * GET /api/admin/analytics/organization-growth
 * Get organization signup trends over time
 * 
 * Query params:
 * - date_from: ISO date string (optional, default 90 days ago)
 * - date_to: ISO date string (optional, default today)
 * 
 * Returns:
 * - period: Start and end dates
 * - data: Array of organization growth data points
 * - totalNewOrganizations: Total new organizations in period
 * - averagePerDay: Average organizations created per day
 */
router.get(
  '/organization-growth',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const defaultStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      const dateFrom = req.query.date_from 
        ? new Date(req.query.date_from as string) 
        : defaultStartDate;
      const dateTo = req.query.date_to 
        ? new Date(req.query.date_to as string) 
        : now;

      // Validate date range
      if (isNaN(dateFrom.getTime())) {
        return res.status(400).json({ 
          error: 'Invalid date_from format. Use ISO 8601 format.'
        });
      }
      if (isNaN(dateTo.getTime())) {
        return res.status(400).json({ 
          error: 'Invalid date_to format. Use ISO 8601 format.'
        });
      }

      // Get organization signups per day
      const orgGrowthData = await db
        .select({
          date: sql<string>`DATE(${organization.createdAt})`,
          signups: count(),
        })
        .from(organization)
        .where(
          and(
            gte(organization.createdAt, dateFrom),
            lte(organization.createdAt, dateTo)
          )
        )
        .groupBy(sql`DATE(${organization.createdAt})`)
        .orderBy(sql`DATE(${organization.createdAt})`);

      // Calculate cumulative totals
      let cumulative = 0;
      const dataPoints = orgGrowthData.map(row => {
        cumulative += row.signups;
        return {
          date: row.date,
          signups: row.signups,
          cumulative,
        };
      });

      // Calculate statistics
      const totalNewOrganizations = dataPoints.reduce((sum, point) => sum + point.signups, 0);
      const dayCount = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000)));
      const averagePerDay = Math.round((totalNewOrganizations / dayCount) * 100) / 100;

      res.json({
        period: {
          startDate: dateFrom,
          endDate: dateTo,
        },
        data: dataPoints,
        totalNewOrganizations,
        averagePerDay,
        dayCount,
      });
    } catch (error) {
      console.error('Error fetching organization growth data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch organization growth data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

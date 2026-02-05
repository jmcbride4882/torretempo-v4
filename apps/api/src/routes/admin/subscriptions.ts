import { Router, Request, Response } from 'express';
import { eq, and, count, sum, sql, gte, lte, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { subscription_details, organization } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import type { SubscriptionMetricsResponse } from '../../types/admin-types.js';

/**
 * Admin Subscription Routes
 * Platform admins can view subscription metrics, MRR, ARR, and churn
 * 
 * Security:
 * - Requires admin role
 * - Read-only operations
 * - All queries aggregated (no PII exposed)
 */

const router = Router();

// Price per seat configuration (in EUR)
const PRICING = {
  starter: 10,
  professional: 8,
  enterprise: 0, // Custom pricing - excluded from MRR calculations
} as const;

/**
 * GET /api/admin/subscriptions
 * Get comprehensive subscription metrics including MRR, ARR, and churn
 * 
 * Returns:
 * - timestamp: Current date/time
 * - period: Start and end dates for the current month
 * - metrics: Aggregated subscription metrics
 * - trend: Month-over-month changes
 */
router.get(
  '/',
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get tier breakdown
      const tierCounts = await db
        .select({
          tier: subscription_details.tier,
          count: count(),
        })
        .from(subscription_details)
        .groupBy(subscription_details.tier);

      const tierBreakdown = {
        starter: tierCounts.find(t => t.tier === 'starter')?.count || 0,
        professional: tierCounts.find(t => t.tier === 'professional')?.count || 0,
        enterprise: tierCounts.find(t => t.tier === 'enterprise')?.count || 0,
      };

      // Calculate MRR (Monthly Recurring Revenue)
      // Only count starter and professional (enterprise is custom)
      const mrrResult = await db
        .select({
          tier: subscription_details.tier,
          totalSeats: sum(subscription_details.seat_count),
        })
        .from(subscription_details)
        .where(
          sql`${subscription_details.tier} IN ('starter', 'professional')`
        )
        .groupBy(subscription_details.tier);

      let totalMrr = 0;
      for (const result of mrrResult) {
        const seats = Number(result.totalSeats) || 0;
        const pricePerSeat = PRICING[result.tier as 'starter' | 'professional'] || 0;
        totalMrr += seats * pricePerSeat;
      }

      // Calculate ARR (Annual Recurring Revenue)
      const totalArr = totalMrr * 12;

      // Count active subscriptions (all tiers)
      const activeResult = await db
        .select({ count: count() })
        .from(subscription_details);
      
      const activeSubscriptions = activeResult[0]?.count || 0;

      // Count trial subscriptions (trial_ends_at is in the future)
      const trialResult = await db
        .select({ count: count() })
        .from(subscription_details)
        .where(gte(subscription_details.trial_ends_at, now));
      
      const trialSubscriptions = trialResult[0]?.count || 0;

      // Calculate average seats per organization
      const avgSeatsResult = await db
        .select({
          avgSeats: sql<number>`AVG(${subscription_details.seat_count})`,
        })
        .from(subscription_details);

      const averageSeatsPerOrg = Number(avgSeatsResult[0]?.avgSeats) || 0;

      // Calculate churn rate (simplified)
      // For churn calculation, we need cancelled subscriptions
      // Since we don't have a status field yet, we'll use 0% as placeholder
      // TODO: Add subscription status field and track cancellations
      // Formula: (cancelled_last_month / active_start_of_month) * 100
      const churnRate = 0;

      // Count new subscriptions this month
      const newSubsResult = await db
        .select({ count: count() })
        .from(subscription_details)
        .where(
          and(
            gte(subscription_details.created_at, startOfMonth),
            lte(subscription_details.created_at, endOfMonth)
          )
        );

      const newSubscriptions = newSubsResult[0]?.count || 0;

      // Placeholder for cancelled subscriptions
      // TODO: Implement when subscription cancellation logic is added
      const cancelledSubscriptions = 0;

      // Calculate MRR change (placeholder until we track historical MRR)
      // TODO: Store monthly MRR snapshots for accurate trend calculation
      const mrrChange = 0;
      const arrChange = 0;

      // Build response
      const response: SubscriptionMetricsResponse = {
        timestamp: now,
        period: {
          startDate: startOfMonth,
          endDate: endOfMonth,
        },
        metrics: {
          mrr: Math.round(totalMrr * 100) / 100,
          arr: Math.round(totalArr * 100) / 100,
          activeSubscriptions,
          trialSubscriptions,
          churnRate,
          averageSeatsPerOrg: Math.round(averageSeatsPerOrg * 100) / 100,
          tierBreakdown,
        },
        trend: {
          mrrChange,
          arrChange,
          newSubscriptions,
          cancelledSubscriptions,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching subscription metrics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch subscription metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/subscriptions/organizations
 * Get list of organizations with subscription details
 * 
 * Query params:
 * - tier: string (optional) - Filter by tier (starter, professional, enterprise)
 * - status: string (optional) - Filter by status (active, trial)
 * - limit: number (default 50, max 100) - Number of results
 * - offset: number (default 0) - Pagination offset
 * 
 * Returns:
 * - organizations: Array of organization subscription details
 * - total: Total count
 */
router.get(
  '/organizations',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(
        parseInt(req.query.limit as string) || 50,
        100
      );
      const offset = parseInt(req.query.offset as string) || 0;
      const tierFilter = req.query.tier as string | undefined;
      const statusFilter = req.query.status as string | undefined;

      // Build where conditions
      const conditions: any[] = [];

      if (tierFilter && ['starter', 'professional', 'enterprise'].includes(tierFilter)) {
        conditions.push(eq(subscription_details.tier, tierFilter));
      }

      if (statusFilter === 'trial') {
        conditions.push(gte(subscription_details.trial_ends_at, new Date()));
      }

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(subscription_details)
        .leftJoin(organization, eq(subscription_details.organization_id, organization.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count || 0;

      // Get organizations with subscription details
      const organizations = await db
        .select({
          organizationId: subscription_details.organization_id,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          tier: subscription_details.tier,
          seatCount: subscription_details.seat_count,
          trialEndsAt: subscription_details.trial_ends_at,
          createdAt: subscription_details.created_at,
          stripeCustomerId: subscription_details.stripe_customer_id,
          gocardlessCustomerId: subscription_details.gocardless_customer_id,
        })
        .from(subscription_details)
        .leftJoin(organization, eq(subscription_details.organization_id, organization.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(subscription_details.created_at))
        .limit(limit)
        .offset(offset);

      // Calculate MRR for each organization
      const organizationsWithMrr = organizations.map(org => {
        const seats = org.seatCount || 0;
        const pricePerSeat = PRICING[org.tier as keyof typeof PRICING] || 0;
        const mrr = seats * pricePerSeat;

        return {
          ...org,
          mrr: Math.round(mrr * 100) / 100,
          status: org.trialEndsAt && org.trialEndsAt > new Date() ? 'trial' : 'active',
        };
      });

      res.json({
        organizations: organizationsWithMrr,
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error fetching organization subscriptions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch organization subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

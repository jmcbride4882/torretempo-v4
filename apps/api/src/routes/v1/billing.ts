import { Router, Request, Response } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import {
  getSubscriptionStatus,
  cancelSubscription,
  changeSubscriptionPlan,
} from '../../services/billing.service.js';
import { getOrganizationPlan, checkEmployeeLimit } from '../../services/subscription.service.js';
import { db } from '../../db/index.js';
import { subscription_plans } from '../../db/schema.js';
import { logAudit } from '../../services/audit.service.js';
import logger from '../../lib/logger.js';

/**
 * Customer Self-Service Billing Routes
 * Mounted at /api/v1/org/:slug/billing
 * Accessible by tenantAdmin and owner roles
 */

const router = Router({ mergeParams: true });

/**
 * GET /api/v1/org/:slug/billing/status
 * Get current subscription status for the organization
 */
router.get(
  '/status',
  requireRole(['tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization not found' });
      }

      const status = await getSubscriptionStatus(organizationId);
      if (!status) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      res.json({ data: status });
    } catch (error) {
      logger.error('Error fetching billing status:', error);
      res.status(500).json({ error: 'Failed to fetch billing status' });
    }
  }
);

/**
 * GET /api/v1/org/:slug/billing/plan
 * Get current plan with usage details
 */
router.get(
  '/plan',
  requireRole(['tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization not found' });
      }

      const plan = await getOrganizationPlan(organizationId);
      if (!plan) {
        return res.status(404).json({ error: 'No plan found' });
      }

      const limitCheck = await checkEmployeeLimit(organizationId);

      res.json({
        data: {
          ...plan,
          usage: {
            employees: limitCheck.current,
            limit: limitCheck.limit,
            atCapacity: limitCheck.atCapacity,
            percentUsed: limitCheck.limit
              ? Math.round((limitCheck.current / limitCheck.limit) * 100)
              : 0,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching plan:', error);
      res.status(500).json({ error: 'Failed to fetch plan details' });
    }
  }
);

/**
 * GET /api/v1/org/:slug/billing/plans
 * List available subscription plans for upgrade/downgrade
 */
router.get(
  '/plans',
  requireRole(['tenantAdmin', 'owner']),
  async (_req: Request, res: Response) => {
    try {
      const plans = await db
        .select()
        .from(subscription_plans)
        .orderBy(subscription_plans.price_cents);

      res.json({ data: plans });
    } catch (error) {
      logger.error('Error fetching plans:', error);
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  }
);

/**
 * POST /api/v1/org/:slug/billing/change-plan
 * Upgrade or downgrade subscription plan
 */
router.post(
  '/change-plan',
  requireRole(['owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId;
      const actor = req.session?.user as any;

      if (!organizationId || !actor) {
        return res.status(400).json({ error: 'Organization or user not found' });
      }

      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ error: 'planId is required' });
      }

      const result = await changeSubscriptionPlan(organizationId, planId);

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'subscription.plan_changed',
        entityType: 'subscription',
        entityId: organizationId,
        newData: { previousPlan: result.previousPlan, newPlan: result.newPlan },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({
        message: 'Plan changed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Error changing plan:', error);
      res.status(500).json({
        error: 'Failed to change plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/v1/org/:slug/billing/cancel
 * Cancel the subscription (effective at end of billing period)
 */
router.post(
  '/cancel',
  requireRole(['owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId;
      const actor = req.session?.user as any;

      if (!organizationId || !actor) {
        return res.status(400).json({ error: 'Organization or user not found' });
      }

      const { reason } = req.body;

      const result = await cancelSubscription(organizationId, reason);

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'subscription.cancelled',
        entityType: 'subscription',
        entityId: organizationId,
        newData: { reason, canceledAt: result.canceledAt, effectiveDate: result.effectiveDate },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({
        message: 'Subscription cancelled. It will remain active until the end of the current billing period.',
        data: result,
      });
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      res.status(500).json({
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;

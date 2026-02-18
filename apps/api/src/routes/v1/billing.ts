import { Router, Request, Response } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import {
  getSubscriptionStatus,
  cancelSubscription,
  changeSubscriptionPlan,
} from '../../services/billing.service.js';
import { getOrganizationPlan, checkEmployeeLimit } from '../../services/subscription.service.js';
import { stripe } from '../../services/payment.service.js';
import { db } from '../../db/index.js';
import { subscription_details, subscription_plans } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { trialQueue } from '../../lib/queue.js';
import { logAudit } from '../../services/audit.service.js';
import logger from '../../lib/logger.js';

/**
 * Customer Self-Service Billing Routes
 * Mounted at /api/v1/org/:slug/billing
 * Accessible by tenantAdmin and owner roles
 */

const router = Router({ mergeParams: true });

// ============================================================================
// READ ENDPOINTS (tenantAdmin + owner)
// ============================================================================

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

// ============================================================================
// TRIAL PROVISIONING (any authenticated member — called once after org creation)
// ============================================================================

/**
 * POST /api/v1/org/:slug/billing/provision-trial
 * Auto-provisions a 14-day trial when an organization is first created.
 * Idempotent — returns 200 if trial already exists.
 */
router.post(
  '/provision-trial',
  requireRole(['owner', 'tenantAdmin']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization not found' });
      }

      // Check if subscription already exists (idempotent)
      const existing = await db
        .select()
        .from(subscription_details)
        .where(eq(subscription_details.organization_id, organizationId))
        .limit(1);

      if (existing.length > 0) {
        return res.json({
          message: 'Subscription already exists',
          data: {
            status: existing[0]!.subscription_status,
            tier: existing[0]!.tier,
            trialEndsAt: existing[0]!.trial_ends_at,
          },
        });
      }

      // Calculate trial end date (14 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // Create subscription_details row with trial status
      await db.insert(subscription_details).values({
        organization_id: organizationId,
        tier: 'trial' as any,
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
        plan_employee_limit: 30, // Trial gets Growth-tier limits
        current_employee_count: 1, // The owner counts as 1
      });

      // Queue trial reminder for day 11 (3 days before expiration)
      const reminderDate = new Date(trialEndsAt);
      reminderDate.setDate(reminderDate.getDate() - 3);

      await trialQueue.add(
        'trial-reminder',
        {
          type: 'trial-reminder',
          organizationId,
          daysUntilTrialEnds: 3,
          trialEndsAt,
        },
        { delay: Math.max(0, reminderDate.getTime() - Date.now()) }
      );

      logger.info(`Trial provisioned for org ${organizationId}, expires ${trialEndsAt.toISOString()}`);

      res.status(201).json({
        message: 'Trial started! You have 14 days to explore Torre Tempo.',
        data: {
          status: 'trial',
          tier: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
          daysRemaining: 14,
          employeeLimit: 30,
        },
      });
    } catch (error) {
      logger.error('Error provisioning trial:', error);
      res.status(500).json({ error: 'Failed to provision trial' });
    }
  }
);

// ============================================================================
// STRIPE CHECKOUT (owner only)
// ============================================================================

/**
 * POST /api/v1/org/:slug/billing/checkout
 * Creates a Stripe Checkout Session for subscribing to a plan.
 * Returns { url } for client-side redirect.
 */
router.post(
  '/checkout',
  requireRole(['owner']),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId;
      const actor = req.session?.user as any;

      if (!organizationId || !actor) {
        return res.status(400).json({ error: 'Organization or user not found' });
      }

      if (!stripe) {
        return res.status(503).json({ error: 'Payment processing not available' });
      }

      const { planCode } = req.body;
      if (!planCode) {
        return res.status(400).json({ error: 'planCode is required (starter, growth, business)' });
      }

      // Look up the plan
      const plans = await db
        .select()
        .from(subscription_plans)
        .where(eq(subscription_plans.code, planCode))
        .limit(1);

      if (plans.length === 0) {
        return res.status(404).json({ error: `Plan "${planCode}" not found` });
      }

      const plan = plans[0]!;

      // Get or create Stripe customer
      const existingSub = await db
        .select()
        .from(subscription_details)
        .where(eq(subscription_details.organization_id, organizationId))
        .limit(1);

      let stripeCustomerId = existingSub[0]?.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: actor.email,
          name: actor.name,
          metadata: { organization_id: organizationId },
        });
        stripeCustomerId = customer.id;

        // Persist the Stripe customer ID
        if (existingSub.length > 0) {
          await db
            .update(subscription_details)
            .set({ stripe_customer_id: stripeCustomerId, updated_at: new Date() })
            .where(eq(subscription_details.organization_id, organizationId));
        }
      }

      // Create or find a Stripe price for this plan
      // In production, you'd create these in Stripe dashboard and store IDs.
      // Here we use lookup_keys for simplicity.
      const lookupKey = `${plan.code}_monthly`;

      // Search for existing price by lookup key
      const prices = await stripe.prices.search({
        query: `lookup_key:"${lookupKey}"`,
        limit: 1,
      });

      let priceId: string;

      if (prices.data.length > 0) {
        priceId = prices.data[0]!.id;
      } else {
        // Create the price on the fly (with a product)
        const product = await stripe.products.create({
          name: `Torre Tempo ${plan.name}`,
          description: plan.description || `${plan.name} plan`,
          metadata: { plan_code: plan.code },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price_cents,
          currency: plan.currency.toLowerCase(),
          recurring: { interval: 'month' },
          lookup_key: lookupKey,
        });

        priceId = price.id;
      }

      // Determine success/cancel URLs
      const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:5173';
      const slug = req.params.slug;

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/t/${slug}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/t/${slug}/billing?checkout=cancelled`,
        subscription_data: {
          metadata: {
            organization_id: organizationId,
            plan_id: plan.id,
            plan_code: plan.code,
          },
        },
        metadata: {
          organization_id: organizationId,
          plan_id: plan.id,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true },
      });

      logger.info(`Checkout session created for org ${organizationId}: ${session.id}`);

      res.json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      res.status(500).json({
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================================================
// PLAN CHANGE (owner only)
// ============================================================================

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

// ============================================================================
// CANCEL (owner only)
// ============================================================================

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

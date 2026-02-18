import { Router, Request, Response } from 'express';
import { verifyStripeWebhook } from '../../services/payment.service.js';
import { db } from '../../db/index.js';
import { subscription_details, subscription_plans } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { paymentQueue } from '../../lib/queue.js';
import type Stripe from 'stripe';
import logger from '../../lib/logger.js';

/**
 * Stripe Webhook Handler
 * CRITICAL: This route MUST use express.raw() not express.json()
 *
 * Fast-acks the webhook, then queues heavy processing via paymentQueue
 */

const router = Router();

router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).send('No signature');
  }

  // Verify webhook signature
  const event = verifyStripeWebhook(req.body, signature);

  if (!event) {
    return res.status(400).send('Invalid signature');
  }

  logger.info(`Stripe webhook received: ${event.type}`);

  try {
    // Handle events that need immediate DB updates
    switch (event.type) {
      // ================================================================
      // Checkout Session Completed — activate subscription after payment
      // ================================================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        // Queue async processing (notifications, cleanup)
        await paymentQueue.add('stripe_webhook', {
          type: 'stripe_webhook',
          provider: 'stripe',
          eventId: event.id,
          eventType: event.type,
          organizationId: subscription.metadata.organization_id,
          payload: { subscriptionId: subscription.id },
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info(`Invoice paid: ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find organization
        const org = await db.select()
          .from(subscription_details)
          .where(eq(subscription_details.stripe_customer_id, customerId))
          .limit(1);

        const orgId = org[0]?.organization_id;

        // Queue dunning processing asynchronously
        await paymentQueue.add('stripe_payment_failed', {
          type: 'stripe_webhook',
          provider: 'stripe',
          eventId: event.id,
          eventType: event.type,
          organizationId: orgId,
          payload: {
            invoiceId: invoice.id,
            customerId,
            dunningAttempt: 1,
          },
        });
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info(`Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    // Fast-ack the webhook
    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle checkout.session.completed
 * This fires after the customer completes Stripe Checkout.
 * Activates the subscription in our database.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organization_id;
  const planId = session.metadata?.plan_id;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!organizationId) {
    logger.error('No organization_id in checkout session metadata');
    return;
  }

  logger.info(`Checkout completed for org ${organizationId}, subscription ${subscriptionId}`);

  // Look up the plan to get tier and limits
  let tier = 'starter';
  let planPriceCents = 2900;
  let planEmployeeLimit: number | null = 10;

  if (planId) {
    const plans = await db
      .select()
      .from(subscription_plans)
      .where(eq(subscription_plans.id, planId))
      .limit(1);

    if (plans.length > 0) {
      const plan = plans[0]!;
      tier = plan.code;
      planPriceCents = plan.price_cents;
      planEmployeeLimit = plan.employee_limit;
    }
  }

  // Update subscription_details: trial → active paid subscription
  await db
    .update(subscription_details)
    .set({
      subscription_status: 'active',
      tier: tier as 'starter' | 'professional' | 'enterprise',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_id: planId || null,
      plan_price_cents: planPriceCents,
      plan_employee_limit: planEmployeeLimit,
      trial_ends_at: null, // Clear trial — they're now a paying customer
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, organizationId));

  logger.info(`✅ Subscription activated for org ${organizationId}: ${tier} plan`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organization_id;

  if (!organizationId) {
    logger.error('No organization_id in subscription metadata');
    return;
  }

  const status = subscription.status === 'active' ? 'active' :
                 subscription.status === 'past_due' ? 'past_due' :
                 subscription.status === 'canceled' ? 'cancelled' : 'suspended';

  await db.update(subscription_details)
    .set({
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, organizationId));

  logger.info(`Updated subscription for org ${organizationId}: ${status}`);
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organization_id;

  if (!organizationId) {
    logger.error('No organization_id in subscription metadata');
    return;
  }

  await db.update(subscription_details)
    .set({
      subscription_status: 'cancelled',
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, organizationId));

  logger.info(`Cancelled subscription for org ${organizationId}`);
}

export default router;

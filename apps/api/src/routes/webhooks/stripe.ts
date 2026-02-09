import { Router, Request, Response } from 'express';
import { verifyStripeWebhook } from '../../services/payment.service.js';
import { db } from '../../db/index.js';
import { subscription_details } from '../../db/schema.js';
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

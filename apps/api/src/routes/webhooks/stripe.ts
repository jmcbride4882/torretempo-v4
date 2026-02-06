import { Router, Request, Response } from 'express';
import { verifyStripeWebhook } from '../../services/payment.service.js';
import { db } from '../../db/index.js';
import { subscription_details } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * CRITICAL: This route MUST use express.raw() not express.json()
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

  console.log(`📨 Stripe webhook received: ${event.type}`);

  try {
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
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`✅ Invoice paid: ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`❌ Invoice payment failed: ${invoice.id}`);
        await handlePaymentFailure(invoice);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organization_id;
  
  if (!organizationId) {
    console.error('No organization_id in subscription metadata');
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

  console.log(`✅ Updated subscription for org ${organizationId}: ${status}`);
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organization_id;
  
  if (!organizationId) {
    console.error('No organization_id in subscription metadata');
    return;
  }

  await db.update(subscription_details)
    .set({
      subscription_status: 'cancelled',
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, organizationId));

  console.log(`✅ Cancelled subscription for org ${organizationId}`);
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Find organization by Stripe customer ID
  const org = await db.select()
    .from(subscription_details)
    .where(eq(subscription_details.stripe_customer_id, customerId))
    .limit(1);

  if (org.length === 0) {
    console.error(`No organization found for customer ${customerId}`);
    return;
  }

  // Update status to past_due
  await db.update(subscription_details)
    .set({
      subscription_status: 'past_due',
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, org[0]!.organization_id));

  console.log(`⚠️ Payment failed for org ${org[0]!.organization_id}`);
}

export default router;

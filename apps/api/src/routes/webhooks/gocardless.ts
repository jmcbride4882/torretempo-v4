import { Router, Request, Response } from 'express';
import { verifyGoCardlessWebhook } from '../../services/payment.service.js';
import { db } from '../../db/index.js';
import { subscription_details } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * GoCardless Webhook Handler
 * CRITICAL: This route MUST use express.raw() not express.json()
 */

const router = Router();

interface GoCardlessEvent {
  id: string;
  created_at: string;
  resource_type: string;
  action: string;
  links: {
    payment?: string;
    subscription?: string;
    mandate?: string;
    customer?: string;
    organisation?: string;
  };
  details?: {
    origin?: string;
    cause?: string;
    description?: string;
    scheme?: string;
    reason_code?: string;
  };
}

interface GoCardlessWebhookPayload {
  events: GoCardlessEvent[];
}

router.post('/gocardless', async (req: Request, res: Response) => {
  const signature = req.headers['webhook-signature'] as string;
  
  if (!signature) {
    return res.status(400).send('No signature');
  }

  // Get raw body as string
  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  // Verify webhook signature
  const isValid = verifyGoCardlessWebhook(payload, signature);
  
  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }

  // Parse the payload
  let webhookData: GoCardlessWebhookPayload;
  try {
    webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).send('Invalid JSON payload');
  }

  console.log(`📨 GoCardless webhook received: ${webhookData.events.length} event(s)`);

  try {
    // Process each event
    for (const event of webhookData.events) {
      console.log(`  Processing: ${event.resource_type}.${event.action}`);
      
      switch (event.resource_type) {
        case 'payments':
          await handlePaymentEvent(event);
          break;
        case 'subscriptions':
          await handleSubscriptionEvent(event);
          break;
        case 'mandates':
          await handleMandateEvent(event);
          break;
        default:
          console.log(`  Unhandled resource type: ${event.resource_type}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing GoCardless webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentEvent(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  
  switch (event.action) {
    case 'confirmed':
      console.log(`✅ Payment confirmed: ${paymentId}`);
      // Payment successful - update last_payment_at if needed
      break;
      
    case 'failed':
      console.log(`❌ Payment failed: ${paymentId}`);
      // Find organization by mandate and update status
      if (event.links.mandate) {
        await updateSubscriptionStatusByMandate(event.links.mandate, 'past_due');
      }
      break;
      
    case 'cancelled':
      console.log(`⚠️ Payment cancelled: ${paymentId}`);
      break;
      
    case 'charged_back':
      console.log(`⚠️ Payment charged back: ${paymentId}`);
      break;
      
    default:
      console.log(`  Unhandled payment action: ${event.action}`);
  }
}

async function handleSubscriptionEvent(event: GoCardlessEvent) {
  const subscriptionId = event.links.subscription;
  
  switch (event.action) {
    case 'created':
      console.log(`✅ Subscription created: ${subscriptionId}`);
      break;
      
    case 'cancelled':
      console.log(`⚠️ Subscription cancelled: ${subscriptionId}`);
      if (subscriptionId) {
        await updateSubscriptionStatusByGocardlessId(subscriptionId, 'cancelled');
      }
      break;
      
    case 'finished':
      console.log(`✅ Subscription finished: ${subscriptionId}`);
      if (subscriptionId) {
        await updateSubscriptionStatusByGocardlessId(subscriptionId, 'cancelled');
      }
      break;
      
    case 'payment_created':
      console.log(`📝 Subscription payment created: ${subscriptionId}`);
      break;
      
    default:
      console.log(`  Unhandled subscription action: ${event.action}`);
  }
}

async function handleMandateEvent(event: GoCardlessEvent) {
  const mandateId = event.links.mandate;
  
  switch (event.action) {
    case 'created':
      console.log(`✅ Mandate created: ${mandateId}`);
      break;
      
    case 'active':
      console.log(`✅ Mandate active: ${mandateId}`);
      break;
      
    case 'cancelled':
    case 'failed':
    case 'expired':
      console.log(`⚠️ Mandate ${event.action}: ${mandateId}`);
      // Mandate is no longer valid - update subscription status
      if (mandateId) {
        await updateSubscriptionStatusByMandate(mandateId, 'suspended');
      }
      break;
      
    default:
      console.log(`  Unhandled mandate action: ${event.action}`);
  }
}

async function updateSubscriptionStatusByMandate(
  mandateId: string,
  status: 'active' | 'past_due' | 'cancelled' | 'suspended'
) {
  const result = await db
    .update(subscription_details)
    .set({
      subscription_status: status,
      updated_at: new Date(),
    })
    .where(eq(subscription_details.gocardless_mandate_id, mandateId))
    .returning();

  if (result.length > 0) {
    console.log(`  Updated subscription status to ${status} for mandate ${mandateId}`);
  }
}

async function updateSubscriptionStatusByGocardlessId(
  subscriptionId: string,
  status: 'active' | 'past_due' | 'cancelled' | 'suspended'
) {
  const result = await db
    .update(subscription_details)
    .set({
      subscription_status: status,
      updated_at: new Date(),
    })
    .where(eq(subscription_details.gocardless_subscription_id, subscriptionId))
    .returning();

  if (result.length > 0) {
    console.log(`  Updated subscription status to ${status} for subscription ${subscriptionId}`);
  }
}

export default router;

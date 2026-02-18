import { Router, Request, Response } from 'express';
import { verifyGoCardlessWebhook } from '../../services/payment.service.js';
import { db } from '../../db/index.js';
import { subscription_details } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { paymentQueue } from '../../lib/queue.js';
import logger from '../../lib/logger.js';

/**
 * GoCardless Webhook Handler
 * CRITICAL: This route MUST use express.raw() not express.json()
 *
 * Fast-acks the webhook, queues heavy processing via paymentQueue
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

router.post('/', async (req: Request, res: Response) => {
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

  logger.info(`GoCardless webhook received: ${webhookData.events.length} event(s)`);

  try {
    // Process each event
    for (const event of webhookData.events) {
      const eventKey = `${event.resource_type}.${event.action}`;
      logger.info(`  Processing: ${eventKey}`);

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
          logger.info(`  Unhandled resource type: ${event.resource_type}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing GoCardless webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentEvent(event: GoCardlessEvent) {
  const paymentId = event.links.payment;

  switch (event.action) {
    case 'confirmed':
      logger.info(`Payment confirmed: ${paymentId}`);
      break;

    case 'failed':
      logger.info(`Payment failed: ${paymentId}`);
      // Find org by mandate and queue dunning
      if (event.links.mandate) {
        const org = await findOrgByMandate(event.links.mandate);
        if (org) {
          await paymentQueue.add('gocardless_payment_failed', {
            type: 'gocardless_webhook',
            provider: 'gocardless',
            eventId: event.id,
            eventType: 'payments.failed',
            organizationId: org.organization_id,
            payload: {
              paymentId,
              mandateId: event.links.mandate,
              dunningAttempt: 1,
            },
          });
        } else {
          await updateSubscriptionStatusByMandate(event.links.mandate, 'past_due');
        }
      }
      break;

    case 'cancelled':
      logger.info(`Payment cancelled: ${paymentId}`);
      break;

    case 'charged_back':
      logger.info(`Payment charged back: ${paymentId}`);
      break;

    default:
      logger.info(`  Unhandled payment action: ${event.action}`);
  }
}

async function handleSubscriptionEvent(event: GoCardlessEvent) {
  const subscriptionId = event.links.subscription;

  switch (event.action) {
    case 'created':
      logger.info(`Subscription created: ${subscriptionId}`);
      break;

    case 'cancelled':
      logger.info(`Subscription cancelled: ${subscriptionId}`);
      if (subscriptionId) {
        await updateSubscriptionStatusByGocardlessId(subscriptionId, 'cancelled');
      }
      break;

    case 'finished':
      logger.info(`Subscription finished: ${subscriptionId}`);
      if (subscriptionId) {
        await updateSubscriptionStatusByGocardlessId(subscriptionId, 'cancelled');
      }
      break;

    case 'payment_created':
      logger.info(`Subscription payment created: ${subscriptionId}`);
      break;

    default:
      logger.info(`  Unhandled subscription action: ${event.action}`);
  }
}

async function handleMandateEvent(event: GoCardlessEvent) {
  const mandateId = event.links.mandate;

  switch (event.action) {
    case 'created':
      logger.info(`Mandate created: ${mandateId}`);
      break;

    case 'active':
      logger.info(`Mandate active: ${mandateId}`);
      break;

    case 'cancelled':
    case 'failed':
    case 'expired':
      logger.info(`Mandate ${event.action}: ${mandateId}`);
      if (mandateId) {
        await updateSubscriptionStatusByMandate(mandateId, 'suspended');
      }
      break;

    default:
      logger.info(`  Unhandled mandate action: ${event.action}`);
  }
}

async function findOrgByMandate(mandateId: string) {
  const result = await db.select()
    .from(subscription_details)
    .where(eq(subscription_details.gocardless_mandate_id, mandateId))
    .limit(1);
  return result[0] ?? null;
}

async function updateSubscriptionStatusByMandate(
  mandateId: string,
  status: 'active' | 'past_due' | 'cancelled' | 'suspended'
) {
  const result = await db
    .update(subscription_details)
    .set({ subscription_status: status, updated_at: new Date() })
    .where(eq(subscription_details.gocardless_mandate_id, mandateId))
    .returning();

  if (result.length > 0) {
    logger.info(`Updated subscription status to ${status} for mandate ${mandateId}`);
  }
}

async function updateSubscriptionStatusByGocardlessId(
  subscriptionId: string,
  status: 'active' | 'past_due' | 'cancelled' | 'suspended'
) {
  const result = await db
    .update(subscription_details)
    .set({ subscription_status: status, updated_at: new Date() })
    .where(eq(subscription_details.gocardless_subscription_id, subscriptionId))
    .returning();

  if (result.length > 0) {
    logger.info(`Updated subscription status to ${status} for subscription ${subscriptionId}`);
  }
}

export default router;

/**
 * Payment Worker
 * Processes payment webhook events asynchronously via BullMQ
 * Handles Stripe and GoCardless events, dunning retries, and usage sync
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/queue.js';
import type { PaymentJob } from '../lib/queue.js';
import { db } from '../db/index.js';
import { subscription_details } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { emailQueue } from '../lib/queue.js';
import logger from '../lib/logger.js';
import { getRetryDelayMs, getNextRetryDate, isDunningExhausted } from '../lib/dunning.js';

async function processPaymentJob(job: Job<PaymentJob>): Promise<void> {
  const { type, provider, eventType, organizationId } = job.data;

  logger.info(`Processing payment job: ${type} [${provider}] event=${eventType} org=${organizationId ?? 'N/A'}`);

  switch (type) {
    case 'stripe_webhook':
      await processStripeEvent(job.data);
      break;

    case 'gocardless_webhook':
      await processGoCardlessEvent(job.data);
      break;

    case 'dunning_retry':
      await processDunningRetry(job.data);
      break;

    case 'usage_sync':
      await processUsageSync(job.data);
      break;

    default:
      logger.warn(`Unknown payment job type: ${type}`);
  }
}

async function processStripeEvent(data: PaymentJob): Promise<void> {
  const { eventType, payload, organizationId } = data;

  switch (eventType) {
    case 'invoice.payment_failed': {
      if (!organizationId) break;
      // Initiate dunning sequence
      await initiateDunningSequence(organizationId, 'stripe', payload);
      break;
    }

    case 'customer.subscription.deleted': {
      if (!organizationId) break;
      await db.update(subscription_details)
        .set({ subscription_status: 'cancelled', updated_at: new Date() })
        .where(eq(subscription_details.organization_id, organizationId));
      break;
    }

    default:
      logger.info(`Stripe event ${eventType} processed (no-op)`);
  }
}

async function processGoCardlessEvent(data: PaymentJob): Promise<void> {
  const { eventType, payload, organizationId } = data;

  switch (eventType) {
    case 'payments.failed': {
      if (!organizationId) break;
      await initiateDunningSequence(organizationId, 'gocardless', payload);
      break;
    }

    case 'mandates.cancelled':
    case 'mandates.failed':
    case 'mandates.expired': {
      const mandateId = (payload as Record<string, string>).mandateId;
      if (mandateId) {
        await db.update(subscription_details)
          .set({ subscription_status: 'suspended', updated_at: new Date() })
          .where(eq(subscription_details.gocardless_mandate_id, mandateId));
      }
      break;
    }

    default:
      logger.info(`GoCardless event ${eventType} processed (no-op)`);
  }
}

/**
 * Dunning retry sequence: Day 1, Day 3, Day 7, then suspend
 */
async function initiateDunningSequence(
  organizationId: string,
  provider: 'stripe' | 'gocardless',
  payload: Record<string, unknown>
): Promise<void> {
  const attempt = (payload.dunningAttempt as number) || 1;

  logger.info(`Dunning attempt ${attempt}/3 for org ${organizationId} via ${provider}`);

  // Update status to past_due
  await db.update(subscription_details)
    .set({ subscription_status: 'past_due', updated_at: new Date() })
    .where(eq(subscription_details.organization_id, organizationId));

  // Send dunning notification email
  await emailQueue.add('dunning-notification', {
    to: 'billing@organization.com', // TODO: resolve org admin email
    subject: `Payment Failed - Attempt ${attempt} of 3`,
    template: 'dunningNotification.html',
    data: {
      organizationId,
      attempt,
      provider,
      nextRetryDate: getNextRetryDate(attempt),
    },
  });

  if (isDunningExhausted(attempt)) {
    // Final attempt failed - suspend the account
    logger.warn(`Dunning exhausted for org ${organizationId} - suspending`);
    await db.update(subscription_details)
      .set({ subscription_status: 'suspended', updated_at: new Date() })
      .where(eq(subscription_details.organization_id, organizationId));
    return;
  }

  // Schedule next retry (Day 1 → Day 3 → Day 7)
  const delayMs = getRetryDelayMs(attempt);
  const { paymentQueue } = await import('../lib/queue.js');
  await paymentQueue.add('dunning_retry', {
    type: 'dunning_retry',
    provider,
    eventId: `dunning-${organizationId}-${attempt + 1}`,
    eventType: 'dunning_retry',
    organizationId,
    payload: { ...payload, dunningAttempt: attempt + 1 },
  }, { delay: delayMs });

  logger.info(`Next dunning retry scheduled in ${delayMs / (1000 * 60 * 60 * 24)} days for org ${organizationId}`);
}

async function processDunningRetry(data: PaymentJob): Promise<void> {
  const { organizationId, provider, payload } = data;
  if (!organizationId) return;

  // Check if the org is still past_due (they may have paid in the meantime)
  const org = await db.select()
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (org.length === 0 || org[0]!.subscription_status !== 'past_due') {
    logger.info(`Dunning retry skipped for org ${organizationId} - no longer past_due`);
    return;
  }

  // Re-initiate dunning with incremented attempt
  await initiateDunningSequence(organizationId, provider, payload);
}

async function processUsageSync(data: PaymentJob): Promise<void> {
  // Usage-based billing sync - to be implemented with employee count tracking
  logger.info(`Usage sync for org ${data.organizationId}`);
}

// Create worker
const paymentWorker = new Worker('payment', processPaymentJob, {
  connection: redisConnection,
});

paymentWorker.on('completed', (job) => {
  logger.info(`Payment job ${job.id} completed`);
});

paymentWorker.on('failed', (job, err) => {
  logger.error(`Payment job ${job?.id} failed:`, err);
});

process.on('SIGTERM', async () => {
  await paymentWorker.close();
});

export default paymentWorker;

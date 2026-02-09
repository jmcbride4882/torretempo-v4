/**
 * Trial Scheduler Worker
 * BullMQ worker that processes trial queue jobs:
 * reminders, expirations, downgrades, grace period endings, extensions.
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/queue.js';
import type { TrialJob } from '../lib/queue.js';
import { checkTrialExpirations, extendTrialPeriod } from './trial.worker.js';
import logger from '../lib/logger.js';

async function processTrialJob(job: Job<TrialJob>): Promise<void> {
  const { type, organizationId } = job.data;

  logger.info(`Processing trial job: ${type} for org ${organizationId}`);

  switch (type) {
    case 'trial-reminder':
      // Reminder notifications are handled by the email worker via emailQueue
      logger.info(`Trial reminder queued for org ${organizationId}`);
      break;

    case 'trial-expired':
      // Run the full expiration check
      await checkTrialExpirations();
      break;

    case 'trial-downgraded':
      logger.info(`Trial downgrade processed for org ${organizationId}`);
      break;

    case 'trial-grace_ended':
      logger.info(`Trial grace period ended for org ${organizationId}`);
      break;

    case 'trial-extended':
      if (job.data.daysAdded && organizationId) {
        await extendTrialPeriod(organizationId, job.data.daysAdded);
      }
      break;

    default:
      logger.warn(`Unknown trial job type: ${type}`);
  }
}

// Create worker listening on the 'trial' queue
const trialSchedulerWorker = new Worker('trial', processTrialJob, {
  connection: redisConnection,
});

trialSchedulerWorker.on('completed', (job) => {
  logger.info(`Trial job ${job.id} completed`);
});

trialSchedulerWorker.on('failed', (job, err) => {
  logger.error(`Trial job ${job?.id} failed:`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await trialSchedulerWorker.close();
});

export default trialSchedulerWorker;

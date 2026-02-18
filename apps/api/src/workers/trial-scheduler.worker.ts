/**
 * Trial Scheduler Worker
 * BullMQ worker that processes trial queue jobs:
 * reminders, expirations, downgrades, grace period endings, extensions.
 *
 * Also schedules a repeatable daily job to check all trial expirations.
 */

import { Worker, Job } from 'bullmq';
import { redisConnection, trialQueue } from '../lib/queue.js';
import type { TrialJob } from '../lib/queue.js';
import { checkTrialExpirations, extendTrialPeriod } from './trial.worker.js';
import logger from '../lib/logger.js';

async function processTrialJob(job: Job<TrialJob>): Promise<void> {
  const { type, organizationId } = job.data;

  logger.info(`Processing trial job: ${type} for org ${organizationId || 'all'}`);

  switch (type) {
    case 'trial-reminder':
      // Reminder notifications are handled by the email worker via emailQueue
      logger.info(`Trial reminder queued for org ${organizationId}`);
      break;

    case 'trial-expired':
      // Run the full expiration check across all orgs
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

// ============================================================================
// Schedule daily trial expiration check at 09:00 UTC
// ============================================================================
async function scheduleDailyTrialCheck() {
  try {
    await trialQueue.add(
      'daily-trial-check',
      {
        type: 'trial-expired',
        organizationId: '', // Checks ALL organizations
      },
      {
        repeat: { pattern: '0 9 * * *' }, // Every day at 09:00 UTC
        jobId: 'daily-trial-check', // Prevent duplicate scheduled jobs
      }
    );
    logger.info('✅ Daily trial expiration check scheduled (09:00 UTC)');
  } catch (error) {
    logger.error('Failed to schedule daily trial check:', error);
  }
}

scheduleDailyTrialCheck();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await trialSchedulerWorker.close();
});

export default trialSchedulerWorker;

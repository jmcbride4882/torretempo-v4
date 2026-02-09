import { Queue } from 'bullmq';
import Redis from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis connection
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Default queue options
const defaultQueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 100, // keep completed jobs for 100 seconds
    },
    removeOnFail: {
      age: 1000, // keep failed jobs for 1000 seconds
    },
  },
};

// ============================================================================
// EMAIL QUEUE
// ============================================================================
export const emailQueue = new Queue('email', defaultQueueOptions);

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

// ============================================================================
// PDF QUEUE
// ============================================================================
export const pdfQueue = new Queue('pdf', defaultQueueOptions);

export interface PdfJob {
  type: 'monthly_summary' | 'report' | 'export';
  organizationId: string;
  userId?: string;
  data: Record<string, unknown>;
}

// ============================================================================
// NOTIFICATION QUEUE
// ============================================================================
export const notificationQueue = new Queue('notification', defaultQueueOptions);

export interface NotificationJob {
  type: 'shift_published' | 'swap_request' | 'time_entry_reminder' | 'approval_needed';
  userId: string;
  organizationId: string;
  data: Record<string, unknown>;
}

// ============================================================================
// COMPLIANCE QUEUE
// ============================================================================
export const complianceQueue = new Queue('compliance', defaultQueueOptions);

export interface ComplianceJob {
  type: 'audit_check' | 'data_retention' | 'gdpr_export' | 'verification';
  organizationId: string;
  data: Record<string, unknown>;
}

// ============================================================================
// MONTHLY QUEUE
// ============================================================================
export const monthlyQueue = new Queue('monthly', defaultQueueOptions);

export interface MonthlyJob {
  type: 'generate_summaries' | 'send_reports' | 'cleanup';
  organizationId?: string;
  year: number;
  month: number;
}

// ============================================================================
// BACKUP QUEUE
// ============================================================================
export const backupQueue = new Queue('backup', defaultQueueOptions);

export interface BackupJob {
  type: 'full_backup' | 'incremental_backup' | 'restore';
  organizationId?: string;
  timestamp: number;
}

// ============================================================================
// TRIAL QUEUE
// ============================================================================
export const trialQueue = new Queue('trial', defaultQueueOptions);

export interface TrialJob {
  type: 'trial-reminder' | 'trial-expired' | 'trial-downgraded' | 'trial-grace_ended' | 'trial-extended';
  organizationId: string;
  to?: string;
  daysUntilTrialEnds?: number;
  trialEndsAt?: Date;
  trialEndedAt?: Date;
  daysAdded?: number;
  newTrialEndsAt?: Date;
}

// ============================================================================
// PAYMENT QUEUE
// ============================================================================
export const paymentQueue = new Queue('payment', defaultQueueOptions);

export interface PaymentJob {
  type: 'stripe_webhook' | 'gocardless_webhook' | 'dunning_retry' | 'usage_sync';
  provider: 'stripe' | 'gocardless';
  eventId: string;
  eventType: string;
  organizationId?: string;
  payload: Record<string, unknown>;
}

// ============================================================================
// QUEUE EXPORTS
// ============================================================================
export const queues = {
  email: emailQueue,
  pdf: pdfQueue,
  notification: notificationQueue,
  compliance: complianceQueue,
  monthly: monthlyQueue,
  backup: backupQueue,
  trial: trialQueue,
  payment: paymentQueue,
} as const;

// Health check function
export async function checkQueueHealth(): Promise<boolean> {
  try {
    await redisConnection.ping();
    return true;
  } catch (error) {
    console.error('Queue health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    emailQueue.close(),
    pdfQueue.close(),
    notificationQueue.close(),
    complianceQueue.close(),
    monthlyQueue.close(),
    backupQueue.close(),
    trialQueue.close(),
    paymentQueue.close(),
    redisConnection.quit(),
  ]);
}

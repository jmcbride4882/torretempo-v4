/**
 * Trial Period Worker
 * Handles trial expiration checks and notifications
 */

import { db } from '../db/index.js';
import { subscription_details, user, member } from '../db/schema.js';
import { eq, and, lt, gt } from 'drizzle-orm';
import { emailQueue } from '../lib/queue.js';
import logger from '../lib/logger.js';

// Payment provider initialization moved to services



export interface TrialExpirationCheck {
  organizationId: string;
  email: string;
  daysUntilTrialEnds: number;
  trialEndsAt: Date;
}

export interface TrialGracePeriod {
  organizationId: string;
  email: string;
  trialEndedAt: Date;
  gracePeriodEndsAt: Date;
}

export interface TrialExtension {
  organizationId: string;
  daysAdded: number;
  newTrialEndsAt: Date;
}

/**
 * Check for trial expirations and send notifications
 * Run this daily via scheduled job
 */
export async function checkTrialExpirations() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

  try {
    // 1. Find trials ending in next 3 days (send reminder)
    const upcomingTrials = await db
      .select({
        organization_id: subscription_details.organization_id,
        email: user.email,
        trial_ends_at: subscription_details.trial_ends_at,
      })
      .from(subscription_details)
      .innerJoin(member, eq(member.organizationId, subscription_details.organization_id))
      .innerJoin(user, eq(user.id, member.userId))
      .where(
          and(
          eq(subscription_details.subscription_status, 'trial'),
          lt(subscription_details.trial_ends_at, threeDaysFromNow),
          gt(subscription_details.trial_ends_at, now)
        )
      );

    for (const trial of upcomingTrials) {
      if (!trial.trial_ends_at) continue;
      
      const daysUntilTrialEnds = Math.ceil(
        (trial.trial_ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      await sendTrialReminder(trial.organization_id, trial.email, daysUntilTrialEnds, trial.trial_ends_at);
      logger.info(`Sent trial reminder for organization ${trial.organization_id}: ${daysUntilTrialEnds} days remaining`);
    }

    // 2. Find trials that ended in last 2 days (send payment prompt)
    const recentlyExpiredTrials = await db
      .select({
        organization_id: subscription_details.organization_id,
        email: user.email,
        trial_ends_at: subscription_details.trial_ends_at,
      })
      .from(subscription_details)
      .innerJoin(member, eq(member.organizationId, subscription_details.organization_id))
      .innerJoin(user, eq(user.id, member.userId))
      .where(
        and(
          eq(subscription_details.subscription_status, 'trial'),
          lt(subscription_details.trial_ends_at, now),
          gt(subscription_details.trial_ends_at, twoDaysAgo)
        )
      );

    for (const trial of recentlyExpiredTrials) {
      if (!trial.trial_ends_at) continue;
      
      await sendPaymentPrompt(trial.organization_id, trial.email, trial.trial_ends_at);
      logger.info(`Sent payment prompt for organization ${trial.organization_id}: trial ended ${trial.trial_ends_at}`);
    }

    // 3. Find trials that ended more than 2 days ago (downgrade to free tier)
    const expiredTrials = await db
      .select({
        organization_id: subscription_details.organization_id,
        email: user.email,
        trial_ends_at: subscription_details.trial_ends_at,
      })
      .from(subscription_details)
      .innerJoin(member, eq(member.organizationId, subscription_details.organization_id))
      .innerJoin(user, eq(user.id, member.userId))
      .where(
        and(
          eq(subscription_details.subscription_status, 'trial'),
          lt(subscription_details.trial_ends_at, fourDaysAgo)
        )
      );

    for (const trial of expiredTrials) {
      if (!trial.trial_ends_at) continue;
      
      await downgradeToFreeTier(trial.organization_id, trial.email, trial.trial_ends_at);
      logger.info(`Downgraded to free tier for organization ${trial.organization_id}: trial ended ${trial.trial_ends_at}`);
    }

    return {
      upcomingReminders: upcomingTrials.length,
      paymentPrompts: recentlyExpiredTrials.length,
      downgrades: expiredTrials.length,
    };

  } catch (error) {
    logger.error('Error checking trial expirations:', error);
    throw error;
  }
}

/**
 * Send trial reminder email
 */
async function sendTrialReminder(
  organizationId: string,
  email: string,
  daysUntilTrialEnds: number,
  trialEndsAt: Date
) {
  await emailQueue.add('trial-reminder', {
    to: email,
    subject: `Tu prueba gratuita termina en ${daysUntilTrialEnds} días`,
    template: 'trial-reminder.html',
    data: { organizationId, daysUntilTrialEnds, trialEndsAt: trialEndsAt.toISOString() },
  });
}

/**
 * Send payment prompt email after trial expired
 */
async function sendPaymentPrompt(
  organizationId: string,
  email: string,
  trialEndedAt: Date
) {
  await emailQueue.add('trial-expired', {
    to: email,
    subject: 'Tu prueba gratuita ha terminado — Activa tu plan',
    template: 'trial-expired.html',
    data: { organizationId, trialEndedAt: trialEndedAt.toISOString() },
  });
}

/**
 * Downgrade subscription to free tier after grace period
 */
async function downgradeToFreeTier(
  organizationId: string,
  email: string,
  trialEndedAt: Date
) {
  try {
    // Get current subscription details
    const details = await db
      .select()
      .from(subscription_details)
      .where(eq(subscription_details.organization_id, organizationId))
      .limit(1);

    if (details.length === 0) {
      logger.warn(`No subscription found for organization ${organizationId}`);
      return;
    }

    const sub = details[0]!;

    // TODO: Cancel payment subscriptions when payment services are available
    // if (sub.stripe_subscription_id) {
    //   await cancelStripeSubscription(sub.stripe_subscription_id);
    // } else if (sub.gocardless_subscription_id) {
    //   await cancelGoCardlessSubscription(sub.gocardless_subscription_id);
    // }
    
    // Use sub variable to avoid unused warning
    logger.info('Processing subscription for organization:', sub.organization_id);

    // Update to free tier (tier: 'free', status: 'expired')
    await db
      .update(subscription_details)
      .set({
        subscription_status: 'expired',
        tier: 'free' as const,
        plan_id: null,
        plan_price_cents: 0,
        plan_employee_limit: 0,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        gocardless_customer_id: null,
        gocardless_mandate_id: null,
        gocardless_subscription_id: null,
        trial_ends_at: null,
        updated_at: new Date(),
      })
      .where(eq(subscription_details.organization_id, organizationId));

    logger.info(`Downgraded to free tier for organization ${organizationId}`);

    // Send notification email
    await emailQueue.add('trial-downgraded', {
      to: email,
      subject: 'Tu cuenta ha sido degradada al plan gratuito',
      template: 'trial-downgraded.html',
      data: { organizationId, trialEndedAt: trialEndedAt.toISOString() },
    });

  } catch (error) {
    logger.error(`Error downgrading to free tier for organization ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Extend trial period for an organization
 * Used by admin when providing extra trial time
 */
export async function extendTrialPeriod(
  organizationId: string,
  daysToAdd: number
): Promise<TrialExtension> {
  if (daysToAdd <= 0) {
    throw new Error('Days to add must be positive');
  }

  // Get current subscription details
  const details = await db
    .select()
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (details.length === 0) {
    throw new Error('Subscription not found');
  }

  const sub = details[0]!;

  if (sub.subscription_status !== 'trial') {
    throw new Error('Only trial subscriptions can be extended');
  }

  if (!sub.trial_ends_at) {
      throw new Error('Trial end date is required');
    }
    const newTrialEndsAt = new Date(sub.trial_ends_at);
    newTrialEndsAt.setDate(newTrialEndsAt.getDate() + daysToAdd);

  // Update trial end date
  await db
    .update(subscription_details)
    .set({
      trial_ends_at: newTrialEndsAt,
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, organizationId));

  // Resolve org admin/owner email for extension notification
  const orgOwner = await db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, organizationId), eq(member.role, 'owner')))
    .limit(1);
  const adminEmail = orgOwner[0]?.email || `admin-${organizationId}@noreply.lsltgroup.es`;

  // Send extension notification
  await emailQueue.add('trial-extended', {
    to: adminEmail,
    subject: `Tu prueba se ha extendido ${daysToAdd} días`,
    template: 'trial-extended.html',
    data: { organizationId, daysAdded: daysToAdd, newTrialEndsAt: newTrialEndsAt.toISOString() },
  });

  return {
    organizationId,
    daysAdded: daysToAdd, // Match interface property name
    newTrialEndsAt,
  };
}

/**
 * Get trial status for an organization
 */
export async function getTrialStatus(organizationId: string) {
  const details = await db
    .select({
      id: subscription_details.id,
      tier: subscription_details.tier,
      status: subscription_details.subscription_status,
      trialEndsAt: subscription_details.trial_ends_at,
      createdAt: subscription_details.created_at,
      updatedAt: subscription_details.updated_at,
    })
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (details.length === 0) {
    return null;
  }

  const sub = details[0]!;
  const isTrialing = sub.tier === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date();
  const daysUntilTrialEnds = isTrialing && sub.trialEndsAt
    ? Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    ...sub,
    isTrialing,
    daysUntilTrialEnds,
    trialExpired: sub.tier === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date(),
    gracePeriodActive: sub.tier === 'trial' && sub.trialEndsAt && 
      new Date(sub.trialEndsAt) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  };
}

/**
 * Get all organizations with upcoming trial expirations
 * Used for admin dashboard monitoring
 */
export async function getUpcomingTrialExpirations() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const results = await db
    .select({
      organization_id: subscription_details.organization_id,
      email: user.email,
      tier: subscription_details.tier,
      status: subscription_details.subscription_status,
      trial_ends_at: subscription_details.trial_ends_at,
    })
    .from(subscription_details)
    .innerJoin(member, eq(member.organizationId, subscription_details.organization_id))
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(subscription_details.subscription_status, 'trial'),
        lt(subscription_details.trial_ends_at, sevenDaysFromNow),
        gt(subscription_details.trial_ends_at, now)
      )
    )
    .orderBy(subscription_details.trial_ends_at);

  return results;
}

/**
 * Add trial check to scheduled jobs
 */
export function setupTrialWorker() {
  // This would be called from your queue setup
  // Example: queue.add('daily-job', { type: 'trial-check' });
  logger.info('Trial worker setup complete');
}

export default {
  checkTrialExpirations,
  extendTrialPeriod,
  getTrialStatus,
  getUpcomingTrialExpirations,
  setupTrialWorker,
};

/**
 * Subscription Enforcement Middleware
 *
 * Checks that the organization has an active subscription (or valid trial)
 * before allowing access to tenant API routes.
 *
 * Status logic:
 *   trial    + trial_ends_at > now()  → allow (active trial)
 *   trial    + trial_ends_at <= now() → 402 (trial expired)
 *   active                            → allow
 *   past_due                          → allow + warning header
 *   cancelled / expired / suspended   → 402
 *   no record                         → 402
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { subscription_details } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger.js';

export async function subscriptionEnforcement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const organizationId = req.organizationId;

  // If no org ID set yet (shouldn't happen after tenantMiddleware), skip
  if (!organizationId) {
    res.status(400).json({ error: 'Organization context required' });
    return;
  }

  try {
    const rows = await db
      .select({
        subscriptionStatus: subscription_details.subscription_status,
        trialEndsAt: subscription_details.trial_ends_at,
        tier: subscription_details.tier,
      })
      .from(subscription_details)
      .where(eq(subscription_details.organization_id, organizationId))
      .limit(1);

    // No subscription record at all → block
    if (rows.length === 0) {
      res.status(402).json({
        error: 'no_subscription',
        message: 'No subscription found. Please set up a subscription to continue.',
        upgradeUrl: '/billing',
      });
      return;
    }

    const sub = rows[0]!;
    const status = sub.subscriptionStatus;

    // Trial logic
    if (status === 'trial') {
      const now = new Date();
      const trialEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;

      if (trialEnd && trialEnd > now) {
        // Active trial — allow but set header with days remaining
        const daysRemaining = Math.ceil(
          (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        res.setHeader('X-Trial-Days-Remaining', String(daysRemaining));
        next();
        return;
      }

      // Trial expired
      res.status(402).json({
        error: 'trial_expired',
        message: 'Your free trial has expired. Upgrade to continue using Torre Tempo.',
        upgradeUrl: '/billing',
      });
      return;
    }

    // Active subscription — allow
    if (status === 'active') {
      next();
      return;
    }

    // Past due — allow with warning header
    if (status === 'past_due') {
      res.setHeader('X-Subscription-Warning', 'past_due');
      next();
      return;
    }

    // Cancelled, expired, suspended — block
    if (['cancelled', 'expired', 'suspended'].includes(status)) {
      res.status(402).json({
        error: 'subscription_inactive',
        message: `Your subscription is ${status}. Please update your payment method or resubscribe.`,
        status,
        upgradeUrl: '/billing',
      });
      return;
    }

    // Unknown status — default allow (be permissive for unknown states)
    logger.warn(`Unknown subscription status "${status}" for org ${organizationId}`);
    next();
  } catch (error) {
    logger.error('Subscription enforcement error:', error);
    // On error, allow through (fail open) to avoid blocking paying customers
    // due to transient DB issues
    next();
  }
}

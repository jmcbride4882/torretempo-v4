/**
 * Push Notification Service
 *
 * Manages Web Push subscriptions and sends push notifications.
 * Uses the web-push library (VAPID protocol) for browser push.
 *
 * Environment variables required:
 * - VAPID_PUBLIC_KEY: Base64-encoded VAPID public key
 * - VAPID_PRIVATE_KEY: Base64-encoded VAPID private key
 * - VAPID_SUBJECT: mailto: or https:// URL identifying the sender
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { push_subscriptions } from '../db/schema.js';
import logger from '../lib/logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// WEB PUSH WRAPPER (lazy-loaded to avoid import errors when not installed)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webPush: any = null;

async function getWebPush(): Promise<any> {
  if (webPush) return webPush;
  try {
    // Dynamic import — web-push is an optional dependency
    webPush = await import(/* webpackIgnore: true */ 'web-push' as string);
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@lsltgroup.es';

    if (publicKey && privateKey) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      logger.info('Web Push VAPID credentials configured');
    } else {
      logger.warn('VAPID keys not configured — push notifications will be unavailable');
      webPush = null;
    }
  } catch {
    logger.warn('web-push module not installed — push notifications disabled');
    webPush = null;
  }
  return webPush;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Save or update a push subscription for a user
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionData,
  userAgent?: string
): Promise<{ id: string }> {
  // Remove any existing subscription with the same endpoint
  await db
    .delete(push_subscriptions)
    .where(
      and(
        eq(push_subscriptions.user_id, userId),
        eq(push_subscriptions.endpoint, subscription.endpoint)
      )
    );

  const [result] = await db
    .insert(push_subscriptions)
    .values({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent,
    })
    .returning({ id: push_subscriptions.id });

  logger.info(`Push subscription saved for user ${userId}`);
  return result!;
}

/**
 * Remove a push subscription
 */
export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(push_subscriptions)
    .where(
      and(
        eq(push_subscriptions.user_id, userId),
        eq(push_subscriptions.endpoint, endpoint)
      )
    );
  logger.info(`Push subscription removed for user ${userId}`);
}

/**
 * Get all push subscriptions for a user
 */
export async function getUserSubscriptions(userId: string) {
  return db
    .select()
    .from(push_subscriptions)
    .where(eq(push_subscriptions.user_id, userId));
}

// ============================================================================
// SENDING PUSH NOTIFICATIONS
// ============================================================================

/**
 * Send a push notification to a specific user (all their devices)
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const wp = await getWebPush();
  if (!wp) return 0;

  const subscriptions = await getUserSubscriptions(userId);
  if (subscriptions.length === 0) return 0;

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subscriptions) {
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/apple-touch-icon.png',
          badge: payload.badge || '/favicon.ico',
          tag: payload.tag,
          data: {
            url: payload.url || '/',
            ...payload.data,
          },
        })
      );
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        // Subscription expired or unsubscribed — mark for cleanup
        staleEndpoints.push(sub.endpoint);
      } else {
        logger.error(`Push send failed for user ${userId}:`, err);
      }
    }
  }

  // Clean up stale subscriptions
  for (const endpoint of staleEndpoints) {
    await removeSubscription(userId, endpoint);
  }

  return sent;
}

/**
 * Send a push notification to multiple users
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  let totalSent = 0;
  for (const userId of userIds) {
    totalSent += await sendPushToUser(userId, payload);
  }
  return totalSent;
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

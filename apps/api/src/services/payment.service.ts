/**
 * Payment Service
 * Handles Stripe and GoCardless payment operations
 */

import Stripe from 'stripe';
import { GoCardlessClient } from 'gocardless-nodejs/client.js';
import { Environments } from 'gocardless-nodejs/constants.js';
import type {
  SubscriptionIntervalUnit,
  PaymentCurrency,
} from 'gocardless-nodejs/types/Types.js';
import 'dotenv/config';

// Re-export GoCardless types for external use
export { SubscriptionIntervalUnit, PaymentCurrency } from 'gocardless-nodejs/types/Types.js';

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2026-01-28.clover',
}) : null;

// Initialize GoCardless
const gocardlessToken = process.env.GOCARDLESS_ACCESS_TOKEN || '';
const gocardlessEnv = process.env.GOCARDLESS_ENVIRONMENT === 'live'
  ? Environments.Live
  : Environments.Sandbox;

export const gocardlessClient = gocardlessToken
  ? new GoCardlessClient(gocardlessToken, gocardlessEnv)
  : null;

export const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || 'EUR';

/**
 * SEPA Zone Countries
 * Used to determine whether to route payments through GoCardless (SEPA) or Stripe (cards)
 */
const SEPA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'NO',
  'IS', 'LI', 'MC', 'SM', 'VA'
]);

/**
 * Determine if a country should use GoCardless (SEPA Direct Debit)
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns true if the country is in the SEPA zone
 */
export function shouldUseGoCardless(countryCode: string): boolean {
  return SEPA_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Get the appropriate payment provider for a country
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns 'gocardless' for SEPA countries, 'stripe' for others
 */
export function getPaymentProvider(countryCode: string): 'gocardless' | 'stripe' {
  return shouldUseGoCardless(countryCode) ? 'gocardless' : 'stripe';
}

/**
 * Stripe Functions
 */

export async function createStripeCustomer(email: string, name: string, metadata?: Record<string, string>) {
  if (!stripe) throw new Error('Stripe not configured');
  
  return await stripe.customers.create({
    email,
    name,
    metadata,
  });
}

export async function createStripeSubscription(
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
) {
  if (!stripe) throw new Error('Stripe not configured');
  
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata,
  });
}

export async function cancelStripeSubscription(subscriptionId: string) {
  if (!stripe) throw new Error('Stripe not configured');
  
  return await stripe.subscriptions.cancel(subscriptionId);
}

export async function createStripeInvoice(
  customerId: string,
  amount: number,
  description: string,
  metadata?: Record<string, string>
) {
  if (!stripe) throw new Error('Stripe not configured');
  
  // Create invoice item
  await stripe.invoiceItems.create({
    customer: customerId,
    amount: Math.round(amount * 100), // Convert to cents
    currency: PAYMENT_CURRENCY.toLowerCase(),
    description,
  });
  
  // Create and finalize invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    metadata,
  });
  
  return await stripe.invoices.finalizeInvoice(invoice.id);
}

export async function createStripeRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
) {
  if (!stripe) throw new Error('Stripe not configured');
  
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
    reason,
  });
}

export async function applyStripeCredit(
  customerId: string,
  amount: number,
  _description: string
) {
  if (!stripe) throw new Error('Stripe not configured');
  
  // Create a credit using customer balance
  return await stripe.customers.update(customerId, {
    balance: -Math.round(amount * 100), // Negative = credit
  });
}

export async function createStripePaymentIntent(
  customerId: string,
  amount: number,
  metadata?: Record<string, string>
) {
  if (!stripe) throw new Error('Stripe not configured');
  
  return await stripe.paymentIntents.create({
    customer: customerId,
    amount: Math.round(amount * 100),
    currency: PAYMENT_CURRENCY.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata,
  });
}

/**
 * GoCardless Functions
 * Note: GoCardless SDK v7 requires string amounts and specific enum types
 */

export async function createGoCardlessCustomer(
  email: string,
  givenName: string,
  familyName: string,
  metadata?: Record<string, string>
): Promise<unknown> {
  if (!gocardlessClient) throw new Error('GoCardless not configured');
  
  return await gocardlessClient.customers.create({
    email,
    given_name: givenName,
    family_name: familyName,
    metadata,
  });
}

export async function createGoCardlessMandateFlow(
  customerId: string,
  redirectUrl: string
): Promise<unknown> {
  if (!gocardlessClient) throw new Error('GoCardless not configured');
  
  return await gocardlessClient.redirectFlows.create({
    description: 'Torre Tempo Subscription',
    session_token: `customer_${customerId}_${Date.now()}`,
    success_redirect_url: redirectUrl,
    prefilled_customer: {
      email: '',
    },
  });
}

export async function createGoCardlessSubscription(
  mandateId: string,
  amount: number,
  name: string,
  interval: number = 1,
  intervalUnit: SubscriptionIntervalUnit
): Promise<unknown> {
  if (!gocardlessClient) throw new Error('GoCardless not configured');
  
  // GoCardless SDK v7 requires string amounts in minor units (cents/pence)
  return await gocardlessClient.subscriptions.create({
    amount: String(Math.round(amount * 100)),
    currency: PAYMENT_CURRENCY as PaymentCurrency,
    name,
    interval: String(interval),
    interval_unit: intervalUnit,
    links: {
      mandate: mandateId,
    },
  });
}

export async function cancelGoCardlessSubscription(subscriptionId: string): Promise<unknown> {
  if (!gocardlessClient) throw new Error('GoCardless not configured');
  
  return await gocardlessClient.subscriptions.cancel(subscriptionId, {});
}

export async function createGoCardlessPayment(
  mandateId: string,
  amount: number,
  description: string,
  metadata?: Record<string, string>
): Promise<unknown> {
  if (!gocardlessClient) throw new Error('GoCardless not configured');
  
  // GoCardless SDK v7 requires string amounts in minor units (cents/pence)
  return await gocardlessClient.payments.create({
    amount: String(Math.round(amount * 100)),
    currency: PAYMENT_CURRENCY as PaymentCurrency,
    description,
    links: {
      mandate: mandateId,
    },
    metadata,
  });
}

export async function createGoCardlessRefund(
  paymentId: string,
  amount: number
): Promise<unknown> {
  if (!gocardlessClient) throw new Error('GoCardless not configured');
  
  // GoCardless SDK v7 requires string amounts in minor units (cents/pence)
  // Amount is required for GoCardless refunds
  return await gocardlessClient.refunds.create({
    amount: String(Math.round(amount * 100)),
    links: {
      payment: paymentId,
    },
  });
}

/**
 * Webhook Signature Verification
 */

export function verifyStripeWebhook(payload: string, signature: string): Stripe.Event | null {
  if (!stripe) return null;
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return null;
  }
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return null;
  }
}

export function verifyGoCardlessWebhook(payload: string, signature: string): boolean {
  const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('GoCardless webhook secret not configured');
    return false;
  }
  
  const crypto = require('crypto');
  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  return computedSignature === signature;
}

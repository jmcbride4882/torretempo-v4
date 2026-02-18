/**
 * Billing Service
 * Orchestrates Stripe and GoCardless payment processors with smart routing
 */

import { db } from '../db/index.js';
import { subscription_details, subscription_plans } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  stripe,
  gocardlessClient,
  getPaymentProvider,
  createStripeCustomer,
  createStripeSubscription,
  cancelStripeSubscription,
  createGoCardlessCustomer,
  createGoCardlessSubscription,
  cancelGoCardlessSubscription,
  SubscriptionIntervalUnit,
} from './payment.service.js';

export interface CreateSubscriptionParams {
  organizationId: string;
  planId: string;
  countryCode: string;
  email: string;
  name: string;
  paymentMethodId?: string; // Stripe payment method ID (for card payments)
  mandateId?: string; // GoCardless mandate ID (for SEPA)
}

export interface SubscriptionResult {
  processor: 'stripe' | 'gocardless';
  subscriptionId: string;
  customerId: string;
  status: string;
}

export interface BillingError extends Error {
  code: string;
  processor?: 'stripe' | 'gocardless';
}

/**
 * Create a new subscription for an organization
 * Routes to Stripe or GoCardless based on country
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<SubscriptionResult> {
  const { organizationId, planId, countryCode, email, name, paymentMethodId, mandateId } = params;

  // Get the plan details
  const plans = await db
    .select()
    .from(subscription_plans)
    .where(eq(subscription_plans.id, planId))
    .limit(1);

  if (plans.length === 0) {
    const error = new Error('Plan not found') as BillingError;
    error.code = 'PLAN_NOT_FOUND';
    throw error;
  }

  const plan = plans[0]!;
  const provider = getPaymentProvider(countryCode);

  if (provider === 'gocardless') {
    return await createGoCardlessSubscriptionFlow({
      organizationId,
      plan,
      email,
      name,
      mandateId,
    });
  } else {
    return await createStripeSubscriptionFlow({
      organizationId,
      plan,
      email,
      name,
      paymentMethodId,
    });
  }
}

/**
 * Create subscription via Stripe (for non-SEPA countries)
 */
async function createStripeSubscriptionFlow(params: {
  organizationId: string;
  plan: typeof subscription_plans.$inferSelect;
  email: string;
  name: string;
  paymentMethodId?: string;
}): Promise<SubscriptionResult> {
  const { organizationId, plan, email, name, paymentMethodId } = params;

  if (!stripe) {
    const error = new Error('Stripe not configured') as BillingError;
    error.code = 'STRIPE_NOT_CONFIGURED';
    error.processor = 'stripe';
    throw error;
  }

  // Check if customer already exists
  const existing = await db
    .select()
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  let customerId: string;

  if (existing.length > 0 && existing[0]!.stripe_customer_id) {
    customerId = existing[0]!.stripe_customer_id;
  } else {
    // Create new Stripe customer
    const customer = await createStripeCustomer(email, name, {
      organization_id: organizationId,
    });
    customerId = customer.id;
  }

  // Attach payment method if provided
  if (paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  // Use stripe_price_id from the plan (set in seed/admin panel)
  const priceId = plan.stripe_price_id;
  if (!priceId) {
    const error = new Error(`Plan "${plan.code}" has no Stripe Price ID configured`) as BillingError;
    error.code = 'STRIPE_PRICE_NOT_CONFIGURED';
    error.processor = 'stripe';
    throw error;
  }

  // Create subscription
  const subscription = await createStripeSubscription(customerId, priceId, {
    organization_id: organizationId,
    plan_id: plan.id,
  });

  // Upsert subscription_details (INSERT if not exists, UPDATE if exists)
  const existingDetails = await db
    .select({ id: subscription_details.id })
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (existingDetails.length > 0) {
    await db
      .update(subscription_details)
      .set({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        tier: plan.code as 'starter' | 'professional' | 'enterprise',
        plan_id: plan.id,
        plan_price_cents: plan.price_cents,
        plan_employee_limit: plan.employee_limit,
        updated_at: new Date(),
      })
      .where(eq(subscription_details.organization_id, organizationId));
  } else {
    await db.insert(subscription_details).values({
      organization_id: organizationId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: 'active',
      tier: plan.code as 'starter' | 'professional' | 'enterprise',
      plan_id: plan.id,
      plan_price_cents: plan.price_cents,
      plan_employee_limit: plan.employee_limit,
    });
  }

  return {
    processor: 'stripe',
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
  };
}

/**
 * Create subscription via GoCardless (for SEPA countries)
 */
async function createGoCardlessSubscriptionFlow(params: {
  organizationId: string;
  plan: typeof subscription_plans.$inferSelect;
  email: string;
  name: string;
  mandateId?: string;
}): Promise<SubscriptionResult> {
  const { organizationId, plan, email, name, mandateId } = params;

  if (!gocardlessClient) {
    const error = new Error('GoCardless not configured') as BillingError;
    error.code = 'GOCARDLESS_NOT_CONFIGURED';
    error.processor = 'gocardless';
    throw error;
  }

  if (!mandateId) {
    const error = new Error('Mandate ID required for GoCardless subscriptions') as BillingError;
    error.code = 'MANDATE_REQUIRED';
    error.processor = 'gocardless';
    throw error;
  }

  // Check if customer already exists
  const existing = await db
    .select()
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  let customerId: string;

  if (existing.length > 0 && existing[0]!.gocardless_customer_id) {
    customerId = existing[0]!.gocardless_customer_id;
  } else {
    // Create new GoCardless customer
    const nameParts = name.split(' ');
    const givenName = nameParts[0] || 'Customer';
    const familyName = nameParts.slice(1).join(' ') || givenName;
    
    const customerResult = await createGoCardlessCustomer(
      email,
      givenName,
      familyName,
      { organization_id: organizationId }
    );
    
    // Extract customer ID from result
    customerId = (customerResult as { customers?: { id: string } }).customers?.id || '';
  }

  // Determine interval unit based on billing period
  const intervalUnit: SubscriptionIntervalUnit = 
    plan.billing_period === 'yearly' 
      ? SubscriptionIntervalUnit.Yearly 
      : SubscriptionIntervalUnit.Monthly;

  // Create subscription
  const subscriptionResult = await createGoCardlessSubscription(
    mandateId,
    plan.price_cents / 100, // Convert cents to euros
    `${plan.name} - Torre Tempo`,
    1,
    intervalUnit
  );

  // Extract subscription ID from result
  const subscriptionId = (subscriptionResult as { subscriptions?: { id: string } }).subscriptions?.id || '';

  // Upsert subscription_details (INSERT if not exists, UPDATE if exists)
  const existingGc = await db
    .select({ id: subscription_details.id })
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (existingGc.length > 0) {
    await db
      .update(subscription_details)
      .set({
        gocardless_customer_id: customerId,
        gocardless_mandate_id: mandateId,
        gocardless_subscription_id: subscriptionId,
        subscription_status: 'active',
        tier: plan.code as 'starter' | 'professional' | 'enterprise',
        plan_id: plan.id,
        plan_price_cents: plan.price_cents,
        plan_employee_limit: plan.employee_limit,
        updated_at: new Date(),
      })
      .where(eq(subscription_details.organization_id, organizationId));
  } else {
    await db.insert(subscription_details).values({
      organization_id: organizationId,
      gocardless_customer_id: customerId,
      gocardless_mandate_id: mandateId,
      gocardless_subscription_id: subscriptionId,
      subscription_status: 'active',
      tier: plan.code as 'starter' | 'professional' | 'enterprise',
      plan_id: plan.id,
      plan_price_cents: plan.price_cents,
      plan_employee_limit: plan.employee_limit,
    });
  }

  return {
    processor: 'gocardless',
    subscriptionId,
    customerId,
    status: 'active',
  };
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  organizationId: string,
  _reason?: string
): Promise<{ canceledAt: Date; effectiveDate: Date }> {
  // Get current subscription details
  const details = await db
    .select()
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (details.length === 0) {
    const error = new Error('Subscription not found') as BillingError;
    error.code = 'SUBSCRIPTION_NOT_FOUND';
    throw error;
  }

  const sub = details[0]!;
  const canceledAt = new Date();
  
  // Cancel at end of billing period
  const effectiveDate = new Date();
  effectiveDate.setMonth(effectiveDate.getMonth() + 1);
  effectiveDate.setDate(1); // First of next month

  // Cancel with the appropriate processor
  if (sub.stripe_subscription_id && stripe) {
    await cancelStripeSubscription(sub.stripe_subscription_id);
  } else if (sub.gocardless_subscription_id && gocardlessClient) {
    await cancelGoCardlessSubscription(sub.gocardless_subscription_id);
  }

  // Update database
  await db
    .update(subscription_details)
    .set({
      subscription_status: 'cancelled',
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, organizationId));

  return { canceledAt, effectiveDate };
}

/**
 * Upgrade or downgrade a subscription
 */
export async function changeSubscriptionPlan(
  organizationId: string,
  newPlanId: string
): Promise<{ previousPlan: string; newPlan: string; prorationAmount?: number }> {
  // Get current subscription
  const details = await db
    .select()
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (details.length === 0) {
    const error = new Error('Subscription not found') as BillingError;
    error.code = 'SUBSCRIPTION_NOT_FOUND';
    throw error;
  }

  const sub = details[0]!;
  const previousPlanId = sub.plan_id;

  // Get new plan details
  const newPlans = await db
    .select()
    .from(subscription_plans)
    .where(eq(subscription_plans.id, newPlanId))
    .limit(1);

  if (newPlans.length === 0) {
    const error = new Error('New plan not found') as BillingError;
    error.code = 'PLAN_NOT_FOUND';
    throw error;
  }

  const newPlan = newPlans[0]!;

  // For Stripe, update the subscription
  if (sub.stripe_subscription_id && stripe) {
    const priceId = newPlan.stripe_price_id;
    if (!priceId) {
      const error = new Error(`Plan "${newPlan.code}" has no Stripe Price ID configured`) as BillingError;
      error.code = 'STRIPE_PRICE_NOT_CONFIGURED';
      throw error;
    }

    const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{
        id: subscription.items.data[0]?.id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    });
  }

  // For GoCardless, we need to cancel and recreate (GoCardless doesn't support plan changes)
  // This is a limitation - in production, you'd handle this differently

  // Update database
  await db
    .update(subscription_details)
    .set({
      tier: newPlan.code as 'starter' | 'professional' | 'enterprise',
      plan_id: newPlan.id,
      plan_price_cents: newPlan.price_cents,
      plan_employee_limit: newPlan.employee_limit,
      updated_at: new Date(),
    })
    .where(eq(subscription_details.organization_id, organizationId));

  return {
    previousPlan: previousPlanId || 'none',
    newPlan: newPlan.code,
  };
}

/**
 * Get subscription status for an organization
 */
export async function getSubscriptionStatus(organizationId: string) {
  const details = await db
    .select({
      id: subscription_details.id,
      tier: subscription_details.tier,
      status: subscription_details.subscription_status,
      trialEndsAt: subscription_details.trial_ends_at,
      stripeCustomerId: subscription_details.stripe_customer_id,
      gocardlessCustomerId: subscription_details.gocardless_customer_id,
      planId: subscription_details.plan_id,
      planPriceCents: subscription_details.plan_price_cents,
      currentEmployeeCount: subscription_details.current_employee_count,
      planEmployeeLimit: subscription_details.plan_employee_limit,
    })
    .from(subscription_details)
    .where(eq(subscription_details.organization_id, organizationId))
    .limit(1);

  if (details.length === 0) {
    return null;
  }

  const sub = details[0]!;
  const isTrialing = sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date();
  const processor = sub.gocardlessCustomerId ? 'gocardless' : sub.stripeCustomerId ? 'stripe' : null;

  return {
    ...sub,
    isTrialing,
    processor,
    daysUntilTrialEnds: isTrialing && sub.trialEndsAt
      ? Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  };
}

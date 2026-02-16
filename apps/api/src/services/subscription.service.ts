import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subscription_details, subscription_plans } from '../db/schema.js';
import logger from '../lib/logger.js';

/**
 * Organization plan details with current usage
 */
export interface OrganizationPlan {
  id: string;
  planCode: string;
  planName: string;
  priceEurCents: number;
  billingPeriod: string;
  employeeLimit: number | null;
  includedModules: string[];
  currentEmployeeCount: number;
  isGrandfathered: boolean;
  grandfatheredPlanCode?: string;
}

/**
 * Employee limit check result
 */
export interface EmployeeLimitCheck {
  withinLimit: boolean;
  current: number;
  limit: number | null;
  atCapacity: boolean;
}

/**
 * Get organization's current plan with usage details
 * Returns null if no subscription found
 */
export async function getOrganizationPlan(
  organizationId: string
): Promise<OrganizationPlan | null> {
  try {
    const result = await db
      .select({
        subId: subscription_details.id,
        planId: subscription_details.plan_id,
        planCode: subscription_plans.code,
        planName: subscription_plans.name,
        priceEurCents: subscription_plans.price_cents,
        billingPeriod: subscription_plans.billing_period,
        employeeLimit: subscription_plans.employee_limit,
        includedModules: subscription_plans.included_modules,
        currentEmployeeCount: subscription_details.current_employee_count,
        grandfatheredPlanCode: subscription_details.grandfathered_plan_code,
      })
      .from(subscription_details)
      .leftJoin(
        subscription_plans,
        eq(subscription_details.plan_id, subscription_plans.id)
      )
      .where(eq(subscription_details.organization_id, organizationId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0]!;

    return {
      id: row.subId,
      planCode: row.planCode || 'unknown',
      planName: row.planName || 'Unknown Plan',
      priceEurCents: row.priceEurCents || 0,
      billingPeriod: row.billingPeriod || 'monthly',
      employeeLimit: row.employeeLimit,
      includedModules: Array.isArray(row.includedModules)
        ? row.includedModules
        : [],
      currentEmployeeCount: row.currentEmployeeCount || 0,
      isGrandfathered: !!row.grandfatheredPlanCode,
      grandfatheredPlanCode: row.grandfatheredPlanCode || undefined,
    };
  } catch (error) {
    logger.error('Error fetching organization plan:', error);
    return null;
  }
}

/**
 * Check if organization has access to a specific module
 */
export async function checkModuleAccess(
  organizationId: string,
  moduleName: string
): Promise<boolean> {
  try {
    const plan = await getOrganizationPlan(organizationId);

    if (!plan) {
      return false;
    }

    return plan.includedModules.includes(moduleName);
  } catch (error) {
    logger.error('Error checking module access:', error);
    return false;
  }
}

/**
 * Check if organization is within employee limit
 */
export async function checkEmployeeLimit(
  organizationId: string
): Promise<EmployeeLimitCheck> {
  try {
    const plan = await getOrganizationPlan(organizationId);

    if (!plan) {
      return {
        withinLimit: false,
        current: 0,
        limit: null,
        atCapacity: false,
      };
    }

    const withinLimit =
      plan.employeeLimit === null || plan.currentEmployeeCount < plan.employeeLimit;
    const atCapacity =
      plan.employeeLimit !== null && plan.currentEmployeeCount >= plan.employeeLimit;

    return {
      withinLimit,
      current: plan.currentEmployeeCount,
      limit: plan.employeeLimit,
      atCapacity,
    };
  } catch (error) {
    logger.error('Error checking employee limit:', error);
    return {
      withinLimit: false,
      current: 0,
      limit: null,
      atCapacity: false,
    };
  }
}

/**
 * Get list of available modules for organization
 */
export async function getAvailableModules(
  organizationId: string
): Promise<string[]> {
  try {
    const plan = await getOrganizationPlan(organizationId);

    if (!plan) {
      return [];
    }

    return plan.includedModules;
  } catch (error) {
    logger.error('Error fetching available modules:', error);
    return [];
  }
}

/**
 * Update current employee count for organization
 * Used when members are added/removed
 */
export async function updateEmployeeCount(
  organizationId: string,
  count: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db
      .update(subscription_details)
      .set({
        current_employee_count: count,
        updated_at: new Date(),
      })
      .where(eq(subscription_details.organization_id, organizationId))
      .returning();

    if (result.length === 0) {
      return { success: false, error: 'Subscription not found' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error updating employee count:', error);
    return { success: false, error: 'Failed to update employee count' };
  }
}

/**
 * Increment employee count by 1
 * Used when a new member is invited
 */
export async function incrementEmployeeCount(
  organizationId: string
): Promise<{ success: boolean; error?: string; newCount?: number }> {
  try {
    // First get current count
    const current = await db
      .select({ count: subscription_details.current_employee_count })
      .from(subscription_details)
      .where(eq(subscription_details.organization_id, organizationId))
      .limit(1);

    if (current.length === 0) {
      return { success: false, error: 'Subscription not found' };
    }

    const newCount = (current[0]!.count || 0) + 1;

    await db
      .update(subscription_details)
      .set({
        current_employee_count: newCount,
        updated_at: new Date(),
      })
      .where(eq(subscription_details.organization_id, organizationId));

    return { success: true, newCount };
  } catch (error) {
    logger.error('Error incrementing employee count:', error);
    return { success: false, error: 'Failed to increment employee count' };
  }
}

/**
 * Decrement employee count by 1
 * Used when a member is removed
 */
export async function decrementEmployeeCount(
  organizationId: string
): Promise<{ success: boolean; error?: string; newCount?: number }> {
  try {
    // First get current count
    const current = await db
      .select({ count: subscription_details.current_employee_count })
      .from(subscription_details)
      .where(eq(subscription_details.organization_id, organizationId))
      .limit(1);

    if (current.length === 0) {
      return { success: false, error: 'Subscription not found' };
    }

    const newCount = Math.max(0, (current[0]!.count || 0) - 1);

    await db
      .update(subscription_details)
      .set({
        current_employee_count: newCount,
        updated_at: new Date(),
      })
      .where(eq(subscription_details.organization_id, organizationId));

    return { success: true, newCount };
  } catch (error) {
    logger.error('Error decrementing employee count:', error);
    return { success: false, error: 'Failed to decrement employee count' };
  }
}

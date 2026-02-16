import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import { db } from '../../db/index.js';
import { subscription_plans } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../../lib/logger.js';

/**
 * Admin Subscription Plans Routes
 * Manage subscription tiers and pricing
 * 
 * Security:
 * - Platform admin only
 * - All mutations logged to audit trail
 * - Plans can be deactivated but not deleted (preserve history)
 */

const router = Router();

/**
 * GET /api/admin/plans
 * List all subscription plans (active and inactive)
 */
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(subscription_plans)
      .orderBy(subscription_plans.price_cents);

    res.json({ plans });
  } catch (error) {
    logger.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/admin/plans/:id
 * Get a specific plan by ID
 */
router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const planId = req.params.id as string;

    const plans = await db
      .select()
      .from(subscription_plans)
      .where(eq(subscription_plans.id, planId))
      .limit(1);

    if (!plans.length) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.json({ plan: plans[0] });
  } catch (error) {
    logger.error('Error fetching plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/plans
 * Create a new subscription plan
 * 
 * Body:
 * - code: string (unique, e.g., "starter", "pro", "enterprise")
 * - name: string (e.g., "Starter Plan")
 * - description: string (optional)
 * - price_cents: number (e.g., 2900 = €29.00)
 * - currency: string (e.g., "EUR", "USD", "GBP")
 * - billing_period: string (e.g., "monthly", "annual")
 * - employee_limit: number | null (null = unlimited)
 * - included_modules: object (e.g., { timeTracking: true, scheduling: true })
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      code,
      name,
      description,
      price_cents,
      currency,
      billing_period,
      employee_limit,
      included_modules,
    } = req.body;

    // Validation
    if (!code || !name || price_cents === undefined || !currency || !billing_period) {
      return res.status(400).json({ 
        message: 'Missing required fields: code, name, price_cents, currency, billing_period' 
      });
    }

    if (price_cents < 0) {
      return res.status(400).json({ message: 'Price must be non-negative' });
    }

    if (!['EUR', 'USD', 'GBP'].includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency. Must be EUR, USD, or GBP' });
    }

    if (!['monthly', 'annual'].includes(billing_period)) {
      return res.status(400).json({ message: 'Invalid billing period. Must be monthly or annual' });
    }

    // Create plan
    const newPlan = await db
      .insert(subscription_plans)
      .values({
        code,
        name,
        description: description || null,
        price_cents,
        currency,
        billing_period,
        employee_limit: employee_limit || null,
        included_modules: included_modules || {},
        is_active: true,
      })
      .returning();

    if (!newPlan[0]) {
      return res.status(500).json({ message: 'Failed to create plan' });
    }

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'plan.create',
      targetType: 'plan',
      targetId: newPlan[0].id,
      details: {
        plan_code: code,
        plan_name: name,
        price_cents,
        currency,
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.status(201).json({ 
      message: 'Plan created successfully',
      plan: newPlan[0],
    });
  } catch (error: any) {
    logger.error('Error creating plan:', error);
    
    // Check for unique constraint violation
    if (error?.code === '23505' && error?.constraint?.includes('code')) {
      return res.status(409).json({ message: 'Plan code already exists' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/plans/:id
 * Update an existing subscription plan
 * 
 * Body: Partial plan data (only provided fields will be updated)
 * 
 * Note: Cannot change code after creation (preserve referential integrity)
 */
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const planId = req.params.id as string;
    const {
      name,
      description,
      price_cents,
      currency,
      billing_period,
      employee_limit,
      included_modules,
      is_active,
    } = req.body;

    // Check if plan exists
    const existingPlans = await db
      .select()
      .from(subscription_plans)
      .where(eq(subscription_plans.id, planId))
      .limit(1);

    if (!existingPlans.length) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Build update object (only include provided fields)
    const updates: any = {
      updated_at: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price_cents !== undefined) {
      if (price_cents < 0) {
        return res.status(400).json({ message: 'Price must be non-negative' });
      }
      updates.price_cents = price_cents;
    }
    if (currency !== undefined) {
      if (!['EUR', 'USD', 'GBP'].includes(currency)) {
        return res.status(400).json({ message: 'Invalid currency' });
      }
      updates.currency = currency;
    }
    if (billing_period !== undefined) {
      if (!['monthly', 'annual'].includes(billing_period)) {
        return res.status(400).json({ message: 'Invalid billing period' });
      }
      updates.billing_period = billing_period;
    }
    if (employee_limit !== undefined) updates.employee_limit = employee_limit;
    if (included_modules !== undefined) updates.included_modules = included_modules;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update plan
    const updatedPlan = await db
      .update(subscription_plans)
      .set(updates)
      .where(eq(subscription_plans.id, planId))
      .returning();

    if (!updatedPlan[0]) {
      return res.status(500).json({ message: 'Failed to update plan' });
    }

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'plan.update',
      targetType: 'plan',
      targetId: planId,
      details: {
        plan_code: existingPlans[0]!.code,
        plan_name: existingPlans[0]!.name,
        updated_fields: Object.keys(updates),
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.json({ 
      message: 'Plan updated successfully',
      plan: updatedPlan[0],
    });
  } catch (error) {
    logger.error('Error updating plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/plans/:id
 * Soft delete a plan (set is_active = false)
 * 
 * Note: Plans are never hard deleted to preserve subscription history
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const planId = req.params.id as string;

    // Check if plan exists
    const existingPlans = await db
      .select()
      .from(subscription_plans)
      .where(eq(subscription_plans.id, planId))
      .limit(1);

    if (!existingPlans.length) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Soft delete (deactivate)
    await db
      .update(subscription_plans)
      .set({ 
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(subscription_plans.id, planId));

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'plan.deactivate',
      targetType: 'plan',
      targetId: planId,
      details: {
        plan_code: existingPlans[0]!.code,
        plan_name: existingPlans[0]!.name,
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.json({ message: 'Plan deactivated successfully' });
  } catch (error) {
    logger.error('Error deactivating plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

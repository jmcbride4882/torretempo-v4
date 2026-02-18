/**
 * Seed Subscription Plans
 * Idempotent script — safe to run multiple times.
 * Upserts the 3 flat-rate monthly plans into subscription_plans.
 *
 * Usage:  npx tsx src/db/seed-plans.ts
 */

import { db } from './index.js';
import { subscription_plans } from './schema.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

interface PlanSeed {
  code: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  billing_period: string;
  employee_limit: number | null;
  included_modules: Record<string, boolean>;
  is_active: boolean;
}

const PLANS: PlanSeed[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Ideal para equipos pequeños. Gestión básica de turnos, fichaje y cumplimiento laboral.',
    price_cents: 2900,
    currency: 'EUR',
    billing_period: 'monthly',
    employee_limit: 10,
    included_modules: {
      roster: true,
      timeClock: true,
      compliance: true,
      reports: true,
      leave: true,
    },
    is_active: true,
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Para empresas en crecimiento. Todo de Starter más turnos abiertos, intercambios y geofencing.',
    price_cents: 6900,
    currency: 'EUR',
    billing_period: 'monthly',
    employee_limit: 30,
    included_modules: {
      roster: true,
      timeClock: true,
      compliance: true,
      reports: true,
      leave: true,
      openShifts: true,
      swaps: true,
      geofencing: true,
      shiftTemplates: true,
    },
    is_active: true,
  },
  {
    code: 'business',
    name: 'Business',
    description: 'Para empresas establecidas. Empleados ilimitados, API de inspectores ITSS y soporte prioritario.',
    price_cents: 14900,
    currency: 'EUR',
    billing_period: 'monthly',
    employee_limit: null, // unlimited
    included_modules: {
      roster: true,
      timeClock: true,
      compliance: true,
      reports: true,
      leave: true,
      openShifts: true,
      swaps: true,
      geofencing: true,
      shiftTemplates: true,
      inspectorApi: true,
      advancedReports: true,
      payrollExport: true,
      prioritySupport: true,
    },
    is_active: true,
  },
];

async function seedPlans() {
  console.log('🌱 Seeding subscription plans...');

  for (const plan of PLANS) {
    // Check if plan already exists
    const existing = await db
      .select()
      .from(subscription_plans)
      .where(eq(subscription_plans.code, plan.code))
      .limit(1);

    if (existing.length > 0) {
      // Update existing plan
      await db
        .update(subscription_plans)
        .set({
          name: plan.name,
          description: plan.description,
          price_cents: plan.price_cents,
          currency: plan.currency,
          billing_period: plan.billing_period,
          employee_limit: plan.employee_limit,
          included_modules: plan.included_modules,
          is_active: plan.is_active,
          updated_at: new Date(),
        })
        .where(eq(subscription_plans.code, plan.code));

      console.log(`  ✅ Updated: ${plan.name} (€${plan.price_cents / 100}/mo, ${plan.employee_limit ?? '∞'} employees)`);
    } else {
      // Insert new plan
      await db.insert(subscription_plans).values({
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price_cents: plan.price_cents,
        currency: plan.currency,
        billing_period: plan.billing_period,
        employee_limit: plan.employee_limit,
        included_modules: plan.included_modules,
        is_active: plan.is_active,
      });

      console.log(`  ✅ Created: ${plan.name} (€${plan.price_cents / 100}/mo, ${plan.employee_limit ?? '∞'} employees)`);
    }
  }

  console.log('\n✅ All plans seeded successfully!');
  console.log('   Starter:  €29/mo  (10 employees)');
  console.log('   Growth:   €69/mo  (30 employees)');
  console.log('   Business: €149/mo (unlimited)');
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error('❌ Failed to seed plans:', err);
  process.exit(1);
});

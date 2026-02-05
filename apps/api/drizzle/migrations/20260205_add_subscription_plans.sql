-- Migration: Add subscription_plans table and update subscription_details
-- Purpose: Support flat-tier pricing with employee limits and module entitlements
-- Date: 2026-02-05

-- ============================================================================
-- CREATE subscription_plans TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  employee_limit INTEGER, -- NULL = unlimited
  included_modules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_code ON subscription_plans(code);
CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);

-- ============================================================================
-- UPDATE subscription_details TABLE
-- ============================================================================
ALTER TABLE subscription_details
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS plan_price_cents INTEGER, -- snapshot at purchase
  ADD COLUMN IF NOT EXISTS plan_employee_limit INTEGER, -- snapshot at purchase
  ADD COLUMN IF NOT EXISTS grandfathered_plan_code VARCHAR(20), -- legacy customers
  ADD COLUMN IF NOT EXISTS current_employee_count INTEGER DEFAULT 0;

CREATE INDEX idx_subscription_details_plan_id ON subscription_details(plan_id);

-- ============================================================================
-- SEED subscription_plans (4 compliance-focused tiers)
-- ============================================================================
INSERT INTO subscription_plans (code, name, description, price_cents, employee_limit, included_modules, is_active) VALUES
  (
    'starter',
    'Starter',
    'Cumplimiento básico para pequeños equipos',
    1900, -- €19/month
    10,
    '{
      "tempo": true,
      "rota": false,
      "payrollExport": false,
      "inspectorPack": true,
      "multiSiteOps": false,
      "hrLite": false
    }'::jsonb,
    true
  ),
  (
    'pro',
    'Pro',
    'Cumplimiento completo + exportación nóminas',
    4900, -- €49/month
    25,
    '{
      "tempo": true,
      "rota": true,
      "payrollExport": true,
      "inspectorPack": true,
      "multiSiteOps": false,
      "hrLite": false
    }'::jsonb,
    true
  ),
  (
    'business',
    'Business',
    'Multi-sede + operaciones avanzadas',
    9900, -- €99/month
    75,
    '{
      "tempo": true,
      "rota": true,
      "payrollExport": true,
      "inspectorPack": true,
      "multiSiteOps": true,
      "hrLite": false
    }'::jsonb,
    true
  ),
  (
    'enterprise',
    'Enterprise',
    'Solución completa con HR y soporte dedicado',
    24900, -- €249/month
    NULL, -- unlimited
    '{
      "tempo": true,
      "rota": true,
      "payrollExport": true,
      "inspectorPack": true,
      "multiSiteOps": true,
      "hrLite": true
    }'::jsonb,
    true
  );

-- ============================================================================
-- MIGRATE existing subscriptions to new model
-- ============================================================================
-- Map existing tier enum to plan_id
UPDATE subscription_details sd
SET 
  plan_id = sp.id,
  plan_price_cents = sp.price_cents,
  plan_employee_limit = sp.employee_limit,
  grandfathered_plan_code = sd.tier -- preserve old tier
FROM subscription_plans sp
WHERE sd.tier = sp.code AND sd.plan_id IS NULL;

-- ============================================================================
-- FUNCTION: Update current_employee_count on member changes
-- ============================================================================
CREATE OR REPLACE FUNCTION update_org_employee_count()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT or DELETE, recalculate employee count for the organization
  IF TG_OP = 'INSERT' THEN
    UPDATE subscription_details
    SET current_employee_count = (
      SELECT COUNT(*) 
      FROM member 
      WHERE "organizationId" = NEW."organizationId"
    )
    WHERE organization_id = NEW."organizationId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE subscription_details
    SET current_employee_count = (
      SELECT COUNT(*) 
      FROM member 
      WHERE "organizationId" = OLD."organizationId"
    )
    WHERE organization_id = OLD."organizationId";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update employee count
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_employee_count ON member;

CREATE TRIGGER trigger_update_employee_count
AFTER INSERT OR DELETE ON member
FOR EACH ROW
EXECUTE FUNCTION update_org_employee_count();

-- ============================================================================
-- INITIAL employee count calculation for existing orgs
-- ============================================================================
UPDATE subscription_details sd
SET current_employee_count = (
  SELECT COUNT(*)
  FROM member m
  WHERE m."organizationId" = sd.organization_id
);

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================
COMMENT ON TABLE subscription_plans IS 'Flat-tier pricing plans with employee limits and module entitlements';
COMMENT ON COLUMN subscription_plans.employee_limit IS 'Maximum employees allowed (NULL = unlimited)';
COMMENT ON COLUMN subscription_plans.included_modules IS 'JSONB object with module access flags';
COMMENT ON COLUMN subscription_details.plan_id IS 'Current plan reference';
COMMENT ON COLUMN subscription_details.grandfathered_plan_code IS 'Legacy tier for existing customers (starter, professional, enterprise)';
COMMENT ON COLUMN subscription_details.current_employee_count IS 'Cached count of active employees (updated by trigger)';

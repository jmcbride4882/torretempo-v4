-- Fix organization_id column type mismatch
-- Change from UUID to TEXT to match Better Auth's organization.id

ALTER TABLE locations ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE skills ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE availability ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE shifts ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE swap_requests ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE time_entries ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE break_entries ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE correction_requests ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE monthly_summaries ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE audit_log ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE subscription_details ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE inspector_tokens ALTER COLUMN organization_id TYPE TEXT;

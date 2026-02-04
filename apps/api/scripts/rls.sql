-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Torre Tempo V4 - T16
-- ============================================================================
-- This script enables RLS on all business tables and creates tenant isolation
-- policies using the app.organization_id setting.
--
-- CRITICAL: Middleware must SET LOCAL app.organization_id before queries
-- ============================================================================

-- ============================================================================
-- 1. LOCATIONS TABLE
-- ============================================================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON locations
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 2. SKILLS TABLE
-- ============================================================================
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON skills
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 3. MEMBER_SKILLS JUNCTION TABLE
-- ============================================================================
-- Note: member_skills doesn't have organization_id directly
-- RLS is enforced through foreign key relationships to members table
ALTER TABLE member_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON member_skills
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM users WHERE organization_id::text = current_setting('app.organization_id', true)
    )
  );

-- ============================================================================
-- 4. AVAILABILITY TABLE
-- ============================================================================
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON availability
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 5. SHIFTS TABLE
-- ============================================================================
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON shifts
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 6. SWAP_REQUESTS TABLE
-- ============================================================================
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON swap_requests
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 7. TIME_ENTRIES TABLE
-- ============================================================================
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON time_entries
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 8. BREAK_ENTRIES TABLE
-- ============================================================================
ALTER TABLE break_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON break_entries
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 9. CORRECTION_REQUESTS TABLE
-- ============================================================================
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON correction_requests
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 10. MONTHLY_SUMMARIES TABLE
-- ============================================================================
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON monthly_summaries
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 11. AUDIT_LOG TABLE (Business audit trail)
-- ============================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON audit_log
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- Prevent direct updates/deletes on audit_log (append-only)
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- ============================================================================
-- 12. SUBSCRIPTION_DETAILS TABLE
-- ============================================================================
ALTER TABLE subscription_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON subscription_details
  FOR ALL
  USING (organization_id::text = current_setting('app.organization_id', true));

-- ============================================================================
-- 13. ADMIN_AUDIT_LOG TABLE (Admin audit trail)
-- ============================================================================
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin audit log is global but should not be modified by regular users
CREATE POLICY admin_only ON admin_audit_log
  FOR ALL
  USING (true);

-- Prevent direct updates/deletes on admin_audit_log (append-only)
REVOKE UPDATE, DELETE ON admin_audit_log FROM PUBLIC;

-- ============================================================================
-- VERIFICATION QUERIES (run after applying policies)
-- ============================================================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

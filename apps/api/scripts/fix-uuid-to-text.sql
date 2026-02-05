-- Migration: Fix UUID to TEXT for user ID fields
-- Purpose: Better Auth uses TEXT IDs, not UUIDs
-- Date: 2026-02-05

-- Drop RLS policies before altering columns
DROP POLICY IF EXISTS rls_availability_select ON availability;
DROP POLICY IF EXISTS rls_availability_insert ON availability;
DROP POLICY IF EXISTS rls_availability_update ON availability;
DROP POLICY IF EXISTS rls_availability_delete ON availability;

DROP POLICY IF EXISTS rls_shifts_select ON shifts;
DROP POLICY IF EXISTS rls_shifts_insert ON shifts;
DROP POLICY IF EXISTS rls_shifts_update ON shifts;
DROP POLICY IF EXISTS rls_shifts_delete ON shifts;

DROP POLICY IF EXISTS rls_swap_requests_select ON swap_requests;
DROP POLICY IF EXISTS rls_swap_requests_insert ON swap_requests;
DROP POLICY IF EXISTS rls_swap_requests_update ON swap_requests;
DROP POLICY IF EXISTS rls_swap_requests_delete ON swap_requests;

DROP POLICY IF EXISTS rls_notifications_select ON notifications;
DROP POLICY IF EXISTS rls_notifications_insert ON notifications;
DROP POLICY IF EXISTS rls_notifications_update ON notifications;
DROP POLICY IF EXISTS rls_notifications_delete ON notifications;

DROP POLICY IF EXISTS rls_time_entries_select ON time_entries;
DROP POLICY IF EXISTS rls_time_entries_insert ON time_entries;
DROP POLICY IF EXISTS rls_time_entries_update ON time_entries;
DROP POLICY IF EXISTS rls_time_entries_delete ON time_entries;

DROP POLICY IF EXISTS rls_correction_requests_select ON correction_requests;
DROP POLICY IF EXISTS rls_correction_requests_insert ON correction_requests;
DROP POLICY IF EXISTS rls_correction_requests_update ON correction_requests;
DROP POLICY IF EXISTS rls_correction_requests_delete ON correction_requests;

DROP POLICY IF EXISTS rls_monthly_summaries_select ON monthly_summaries;
DROP POLICY IF EXISTS rls_monthly_summaries_insert ON monthly_summaries;
DROP POLICY IF EXISTS rls_monthly_summaries_update ON monthly_summaries;
DROP POLICY IF EXISTS rls_monthly_summaries_delete ON monthly_summaries;

DROP POLICY IF EXISTS rls_audit_log_select ON audit_log;
DROP POLICY IF EXISTS rls_audit_log_insert ON audit_log;

DROP POLICY IF EXISTS rls_admin_audit_log_select ON admin_audit_log;
DROP POLICY IF EXISTS rls_admin_audit_log_insert ON admin_audit_log;

DROP POLICY IF EXISTS rls_inspector_tokens_select ON inspector_tokens;
DROP POLICY IF EXISTS rls_inspector_tokens_insert ON inspector_tokens;
DROP POLICY IF EXISTS rls_inspector_tokens_update ON inspector_tokens;
DROP POLICY IF EXISTS rls_inspector_tokens_delete ON inspector_tokens;

-- Alter columns from UUID to TEXT
ALTER TABLE member_skills ALTER COLUMN member_id TYPE TEXT USING member_id::TEXT;

ALTER TABLE availability ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE shifts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE shifts ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

ALTER TABLE swap_requests ALTER COLUMN requester_id TYPE TEXT USING requester_id::TEXT;
ALTER TABLE swap_requests ALTER COLUMN recipient_id TYPE TEXT USING recipient_id::TEXT;
ALTER TABLE swap_requests ALTER COLUMN manager_id TYPE TEXT USING manager_id::TEXT;

ALTER TABLE notifications ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE time_entries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE correction_requests ALTER COLUMN requested_by TYPE TEXT USING requested_by::TEXT;
ALTER TABLE correction_requests ALTER COLUMN reviewed_by TYPE TEXT USING reviewed_by::TEXT;

ALTER TABLE monthly_summaries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE audit_log ALTER COLUMN actor_id TYPE TEXT USING actor_id::TEXT;

ALTER TABLE admin_audit_log ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;

ALTER TABLE inspector_tokens ALTER COLUMN issued_by TYPE TEXT USING issued_by::TEXT;

-- Recreate RLS policies
-- Note: These are basic policies - adjust based on your security requirements

-- availability policies
CREATE POLICY rls_availability_select ON availability FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_availability_insert ON availability FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_availability_update ON availability FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_availability_delete ON availability FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- shifts policies
CREATE POLICY rls_shifts_select ON shifts FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_shifts_insert ON shifts FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_shifts_update ON shifts FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_shifts_delete ON shifts FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- swap_requests policies
CREATE POLICY rls_swap_requests_select ON swap_requests FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_swap_requests_insert ON swap_requests FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_swap_requests_update ON swap_requests FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_swap_requests_delete ON swap_requests FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- notifications policies
CREATE POLICY rls_notifications_select ON notifications FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_notifications_insert ON notifications FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_notifications_update ON notifications FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_notifications_delete ON notifications FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- time_entries policies
CREATE POLICY rls_time_entries_select ON time_entries FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_time_entries_insert ON time_entries FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_time_entries_update ON time_entries FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_time_entries_delete ON time_entries FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- correction_requests policies
CREATE POLICY rls_correction_requests_select ON correction_requests FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_correction_requests_insert ON correction_requests FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_correction_requests_update ON correction_requests FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_correction_requests_delete ON correction_requests FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- monthly_summaries policies
CREATE POLICY rls_monthly_summaries_select ON monthly_summaries FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_monthly_summaries_insert ON monthly_summaries FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_monthly_summaries_update ON monthly_summaries FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_monthly_summaries_delete ON monthly_summaries FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- audit_log policies (INSERT only, immutable)
CREATE POLICY rls_audit_log_select ON audit_log FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_audit_log_insert ON audit_log FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- admin_audit_log policies (INSERT only, immutable)
CREATE POLICY rls_admin_audit_log_select ON admin_audit_log FOR SELECT USING (TRUE);
CREATE POLICY rls_admin_audit_log_insert ON admin_audit_log FOR INSERT WITH CHECK (TRUE);

-- inspector_tokens policies
CREATE POLICY rls_inspector_tokens_select ON inspector_tokens FOR SELECT USING (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_inspector_tokens_insert ON inspector_tokens FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_inspector_tokens_update ON inspector_tokens FOR UPDATE USING (
  organization_id = current_setting('app.organization_id', TRUE)
) WITH CHECK (
  organization_id = current_setting('app.organization_id', TRUE)
);
CREATE POLICY rls_inspector_tokens_delete ON inspector_tokens FOR DELETE USING (
  organization_id = current_setting('app.organization_id', TRUE)
);

-- Verify the changes
\dt+ availability
\dt+ shifts
\dt+ swap_requests
\dt+ notifications
\dt+ time_entries

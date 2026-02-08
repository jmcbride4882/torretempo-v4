-- Migration: Add 6 new tables for HR, compliance, and notifications
-- Purpose: Support employee profiles, leave requests, reports, compliance checks, notification preferences, and organization settings
-- Date: 2026-02-08

-- ============================================================================
-- CREATE employee_profiles TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Personal Information (ENCRYPTED - stored as Base64 strings)
  dni_nie_encrypted TEXT NOT NULL,
  social_security_number_encrypted TEXT NOT NULL,
  date_of_birth TIMESTAMPTZ NOT NULL,
  nationality VARCHAR(3),
  tax_id_encrypted TEXT,
  phone_number_encrypted TEXT,
  address_encrypted TEXT,
  emergency_contact_encrypted TEXT,

  -- Employment Information
  employee_number VARCHAR(50),
  job_title VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  employment_type VARCHAR(50) NOT NULL,
  contract_start_date TIMESTAMPTZ NOT NULL,
  contract_end_date TIMESTAMPTZ,
  base_salary_cents INTEGER,
  working_hours_per_week NUMERIC(4, 2) NOT NULL,
  work_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Leave Balance
  vacation_days_accrued NUMERIC(4, 1) DEFAULT '0',
  vacation_days_used NUMERIC(4, 1) DEFAULT '0',
  sick_days_used INTEGER DEFAULT 0,

  -- Compliance
  health_safety_training_date TIMESTAMPTZ,
  work_permit_number_encrypted TEXT,
  work_permit_expiry TIMESTAMPTZ,

  -- GDPR
  gdpr_consent_date TIMESTAMPTZ,
  data_processing_consent BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX employee_profiles_user_org_unique ON employee_profiles(user_id, organization_id);
CREATE INDEX employee_profiles_org_idx ON employee_profiles(organization_id);
CREATE INDEX employee_profiles_dni_idx ON employee_profiles(dni_nie_encrypted);

-- ============================================================================
-- CREATE leave_requests TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Leave Details
  leave_type VARCHAR(50) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  days_count NUMERIC(3, 1) NOT NULL,

  -- Request Info
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Approval
  approved_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Sick Leave Specific
  doctors_note_url TEXT,
  doctors_note_verified BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX leave_requests_user_idx ON leave_requests(user_id);
CREATE INDEX leave_requests_org_idx ON leave_requests(organization_id);
CREATE INDEX leave_requests_dates_idx ON leave_requests(start_date, end_date);
CREATE INDEX leave_requests_status_idx ON leave_requests(status);

-- ============================================================================
-- CREATE generated_reports TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Report Details
  report_type VARCHAR(50) NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  -- Generation Info
  generated_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- File Info
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_hash VARCHAR(64) NOT NULL,

  -- Access Control
  access_level VARCHAR(20) NOT NULL DEFAULT 'internal',
  inspector_token_id UUID REFERENCES inspector_tokens(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX generated_reports_org_idx ON generated_reports(organization_id);
CREATE INDEX generated_reports_type_idx ON generated_reports(report_type);
CREATE INDEX generated_reports_period_idx ON generated_reports(period_start, period_end);

-- ============================================================================
-- CREATE compliance_checks TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,

  -- Check Details
  check_type VARCHAR(50) NOT NULL,
  check_result VARCHAR(20) NOT NULL,
  severity VARCHAR(20),

  -- Context
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  related_data JSONB,

  -- Violation Details
  rule_reference VARCHAR(255),
  message TEXT NOT NULL,
  recommended_action TEXT,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Metadata
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX compliance_checks_org_idx ON compliance_checks(organization_id);
CREATE INDEX compliance_checks_user_idx ON compliance_checks(user_id);
CREATE INDEX compliance_checks_result_idx ON compliance_checks(check_result);
CREATE INDEX compliance_checks_unresolved_idx ON compliance_checks(resolved, organization_id);

-- ============================================================================
-- CREATE notification_preferences TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,

  -- Do Not Disturb
  dnd_enabled BOOLEAN DEFAULT false,
  dnd_start_time VARCHAR(5),
  dnd_end_time VARCHAR(5),
  dnd_days TEXT[],
  dnd_urgent_override BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE organization_settings TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL UNIQUE REFERENCES organization(id) ON DELETE CASCADE,

  -- Compliance Policies (Spanish Labor Law)
  max_daily_hours NUMERIC(3, 1) NOT NULL DEFAULT '9.0',
  max_weekly_hours NUMERIC(4, 1) NOT NULL DEFAULT '40.0',
  min_rest_hours NUMERIC(3, 1) NOT NULL DEFAULT '12.0',
  break_required_after_hours NUMERIC(3, 1) NOT NULL DEFAULT '6.0',
  min_break_minutes INTEGER NOT NULL DEFAULT 15,

  -- Clock In/Out Settings
  clock_in_tolerance_minutes INTEGER NOT NULL DEFAULT 5,
  clock_out_tolerance_minutes INTEGER NOT NULL DEFAULT 5,
  require_manager_approval_corrections BOOLEAN DEFAULT true,

  -- Geofencing
  geofence_enabled BOOLEAN DEFAULT true,
  geofence_radius_meters INTEGER DEFAULT 100,
  strict_geofence_enforcement BOOLEAN DEFAULT false,

  -- Notification Defaults
  notify_shift_published BOOLEAN DEFAULT true,
  notify_swap_request BOOLEAN DEFAULT true,
  notify_compliance_violation BOOLEAN DEFAULT true,
  notification_advance_hours INTEGER DEFAULT 24,

  -- Extensible Settings
  metadata JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================
COMMENT ON TABLE employee_profiles IS 'Stores employment data separately from auth for security. Contains PII with encrypted fields for compliance.';
COMMENT ON TABLE leave_requests IS 'Tracks vacation, sick leave, personal days, and unpaid leave. Supports half-days and manager approval workflow.';
COMMENT ON TABLE generated_reports IS 'Audit trail for all generated reports with SHA-256 integrity verification. Links to inspector tokens for ITSS access control.';
COMMENT ON TABLE compliance_checks IS 'Logs all automated compliance checks against Spanish labor law. Tracks violations and resolutions.';
COMMENT ON TABLE notification_preferences IS 'User-specific notification settings including Do Not Disturb (DND). Implements Right to Disconnect (Ley Orgánica 3/2018).';
COMMENT ON TABLE organization_settings IS 'Per-organization compliance policies and defaults. Spanish labor law defaults: Max 9h/day, Max 40h/week, Min 12h rest between shifts.';

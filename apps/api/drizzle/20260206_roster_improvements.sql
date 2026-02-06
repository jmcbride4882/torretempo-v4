-- ============================================================================
-- ROSTER IMPROVEMENTS - SHIFT TEMPLATES & DRAFT/PUBLISH WORKFLOW
-- Created: 2026-02-06
-- Purpose: Add shift templates and enhance shifts table for Deputy-style roster
-- ============================================================================

-- ============================================================================
-- 1. CREATE SHIFT_TEMPLATES TABLE
-- ============================================================================
-- Reusable shift definitions (Morning, Afternoon, Night, etc.)
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  
  -- Template details
  name VARCHAR(100) NOT NULL,  -- "Morning Shift", "Afternoon Shift", etc.
  start_time VARCHAR(5) NOT NULL,  -- HH:mm format (e.g., "08:00")
  end_time VARCHAR(5) NOT NULL,    -- HH:mm format (e.g., "16:00")
  break_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Optional defaults
  location_id UUID,  -- Default location (nullable)
  color VARCHAR(7),  -- Hex color for visual distinction
  required_skill_id UUID,  -- Required skill (nullable)
  
  -- Soft delete
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT shift_templates_time_format_check CHECK (
    start_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' AND
    end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  )
);

-- Indexes for shift_templates
CREATE INDEX shift_templates_org_idx ON shift_templates(organization_id);
CREATE INDEX shift_templates_is_active_idx ON shift_templates(is_active) WHERE is_active = true;
CREATE INDEX shift_templates_location_idx ON shift_templates(location_id) WHERE location_id IS NOT NULL;

-- ============================================================================
-- 2. ADD TEMPLATE REFERENCE TO SHIFTS TABLE
-- ============================================================================
-- Link shifts to templates (optional - for creating shifts from templates)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL;

-- Index for template lookups
CREATE INDEX IF NOT EXISTS shifts_template_idx ON shifts(template_id) WHERE template_id IS NOT NULL;

-- ============================================================================
-- 3. ADD IS_PUBLISHED FLAG TO SHIFTS TABLE
-- ============================================================================
-- Separate published state from status field for draft/publish workflow
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Index for published shifts (employees see only published)
CREATE INDEX IF NOT EXISTS shifts_published_idx ON shifts(is_published, organization_id, user_id) WHERE is_published = true;

-- ============================================================================
-- 4. ROW-LEVEL SECURITY FOR SHIFT_TEMPLATES
-- ============================================================================
-- Enable RLS
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation
CREATE POLICY tenant_isolation ON shift_templates
  USING (organization_id = current_setting('app.current_tenant_id', TRUE));

-- ============================================================================
-- 5. SEED DEFAULT SHIFT TEMPLATES
-- ============================================================================
-- Insert common shift templates for testing
-- Note: These will be created per tenant via API, not seeded globally

-- ============================================================================
-- 6. UPDATE TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Trigger for shift_templates.updated_at
CREATE OR REPLACE FUNCTION update_shift_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shift_templates_updated_at
  BEFORE UPDATE ON shift_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_templates_updated_at();

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE shift_templates IS 'Reusable shift definitions (Morning, Afternoon, Night) for Deputy-style scheduling';
COMMENT ON COLUMN shift_templates.start_time IS 'Start time in HH:mm format (e.g., "08:00")';
COMMENT ON COLUMN shift_templates.end_time IS 'End time in HH:mm format (e.g., "16:00")';
COMMENT ON COLUMN shift_templates.is_active IS 'Soft delete flag - inactive templates are hidden from UI';
COMMENT ON COLUMN shifts.template_id IS 'Optional reference to shift template used to create this shift';
COMMENT ON COLUMN shifts.is_published IS 'Draft/publish workflow - only published shifts visible to employees';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Verify shift_templates table exists
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shift_templates');

-- Verify new columns exist on shifts
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shifts' AND column_name IN ('template_id', 'is_published');

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'shift_templates';

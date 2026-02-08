/**
 * Organization Settings Types
 * 
 * Per-organization compliance policies and defaults.
 * 
 * Spanish law defaults (Estatuto de los Trabajadores):
 * - Max 9 hours/day (Art. 34.3)
 * - Max 40 hours/week (Art. 34.1)
 * - Min 12 hours rest between shifts (Art. 34.3)
 * - Break after 6 continuous hours (Art. 34.4)
 */

/**
 * Organization settings stored in database
 */
export interface OrganizationSettings {
  id: string;
  organization_id: string;

  // Compliance Policies (Spanish Labor Law)
  max_daily_hours: number; // Default: 9.0
  max_weekly_hours: number; // Default: 40.0
  min_rest_hours: number; // Default: 12.0
  break_required_after_hours: number; // Default: 6.0
  min_break_minutes: number; // Default: 15

  // Clock In/Out Settings
  clock_in_tolerance_minutes: number; // Default: 5
  clock_out_tolerance_minutes: number; // Default: 5
  require_manager_approval_corrections: boolean; // Default: true

  // Geofencing
  geofence_enabled: boolean; // Default: true
  geofence_radius_meters: number; // Default: 100
  strict_geofence_enforcement: boolean; // Default: false (warning only)

  // Notification Defaults
  notify_shift_published: boolean; // Default: true
  notify_swap_request: boolean; // Default: true
  notify_compliance_violation: boolean; // Default: true
  notification_advance_hours: number; // Default: 24 (notify 24h before shift)

  // Extensible Settings
  metadata?: OrganizationSettingsMetadata;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Additional custom settings (extensible)
 */
export interface OrganizationSettingsMetadata {
  overtime_enabled?: boolean;
  overtime_multiplier?: number; // 1.5x, 2x, etc.
  night_shift_premium?: number; // Percentage premium for night shifts
  holiday_premium?: number; // Percentage premium for holidays
  [key: string]: unknown;
}

/**
 * Create/update organization settings
 */
export interface UpdateOrganizationSettingsRequest {
  organization_id: string;
  
  // Compliance Policies
  max_daily_hours?: number;
  max_weekly_hours?: number;
  min_rest_hours?: number;
  break_required_after_hours?: number;
  min_break_minutes?: number;
  
  // Clock In/Out Settings
  clock_in_tolerance_minutes?: number;
  clock_out_tolerance_minutes?: number;
  require_manager_approval_corrections?: boolean;
  
  // Geofencing
  geofence_enabled?: boolean;
  geofence_radius_meters?: number;
  strict_geofence_enforcement?: boolean;
  
  // Notification Defaults
  notify_shift_published?: boolean;
  notify_swap_request?: boolean;
  notify_compliance_violation?: boolean;
  notification_advance_hours?: number;
  
  // Extensible Settings
  metadata?: OrganizationSettingsMetadata;
}

/**
 * Default organization settings (Spanish law compliant)
 */
export const DEFAULT_ORGANIZATION_SETTINGS: Omit<
  OrganizationSettings,
  'id' | 'organization_id' | 'created_at' | 'updated_at' | 'metadata'
> = {
  // Compliance Policies (Spanish Labor Law)
  max_daily_hours: 9.0,
  max_weekly_hours: 40.0,
  min_rest_hours: 12.0,
  break_required_after_hours: 6.0,
  min_break_minutes: 15,
  
  // Clock In/Out Settings
  clock_in_tolerance_minutes: 5,
  clock_out_tolerance_minutes: 5,
  require_manager_approval_corrections: true,
  
  // Geofencing
  geofence_enabled: true,
  geofence_radius_meters: 100,
  strict_geofence_enforcement: false,
  
  // Notification Defaults
  notify_shift_published: true,
  notify_swap_request: true,
  notify_compliance_violation: true,
  notification_advance_hours: 24,
};

/**
 * Validate compliance settings against Spanish law minimums
 */
export interface ComplianceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

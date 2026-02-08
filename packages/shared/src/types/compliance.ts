/**
 * Compliance Check Types
 * 
 * Automated compliance checks against Spanish labor law.
 * Tracks violations and resolutions.
 * 
 * Spanish law: Estatuto de los Trabajadores Art. 34 (working time limits)
 */

export const COMPLIANCE_CHECK_TYPES = {
  DAILY_LIMIT: 'daily_limit',
  WEEKLY_LIMIT: 'weekly_limit',
  REST_PERIOD: 'rest_period',
  BREAK_REQUIRED: 'break_required',
} as const;

export type ComplianceCheckType = typeof COMPLIANCE_CHECK_TYPES[keyof typeof COMPLIANCE_CHECK_TYPES];

export const COMPLIANCE_CHECK_RESULTS = {
  PASS: 'pass',
  WARNING: 'warning',
  VIOLATION: 'violation',
} as const;

export type ComplianceCheckResult = typeof COMPLIANCE_CHECK_RESULTS[keyof typeof COMPLIANCE_CHECK_RESULTS];

export const COMPLIANCE_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ComplianceSeverity = typeof COMPLIANCE_SEVERITIES[keyof typeof COMPLIANCE_SEVERITIES];

/**
 * Compliance check stored in database
 */
export interface ComplianceCheck {
  id: string;
  organization_id: string;
  user_id?: string;

  // Check Details
  check_type: ComplianceCheckType;
  check_result: ComplianceCheckResult;
  severity?: ComplianceSeverity;

  // Context
  time_entry_id?: string;
  shift_id?: string;
  related_data?: ComplianceRelatedData;

  // Violation Details
  rule_reference?: string; // e.g., "Estatuto Art. 34.3"
  message: string;
  recommended_action?: string;

  // Resolution
  resolved: boolean;
  resolved_at?: Date;
  resolved_by?: string;
  resolution_notes?: string;

  // Metadata
  checked_at: Date;
}

/**
 * Related data for compliance checks
 */
export interface ComplianceRelatedData {
  hours_worked?: number;
  hours_limit?: number;
  rest_hours?: number;
  required_rest_hours?: number;
  break_minutes?: number;
  required_break_minutes?: number;
  [key: string]: unknown;
}

/**
 * Create compliance check
 */
export interface CreateComplianceCheckRequest {
  organization_id: string;
  user_id?: string;
  check_type: ComplianceCheckType;
  check_result: ComplianceCheckResult;
  severity?: ComplianceSeverity;
  time_entry_id?: string;
  shift_id?: string;
  related_data?: ComplianceRelatedData;
  rule_reference?: string;
  message: string;
  recommended_action?: string;
}

/**
 * Resolve compliance check
 */
export interface ResolveComplianceCheckRequest {
  resolved_by: string;
  resolution_notes?: string;
}

/**
 * Compliance check with user info
 */
export interface ComplianceCheckWithUser extends ComplianceCheck {
  user_name?: string;
  user_email?: string;
  resolved_by_name?: string;
}

/**
 * Compliance summary
 */
export interface ComplianceSummary {
  organization_id: string;
  period_start: Date;
  period_end: Date;
  total_checks: number;
  pass_count: number;
  warning_count: number;
  violation_count: number;
  unresolved_count: number;
  by_type: {
    [key in ComplianceCheckType]: {
      total: number;
      pass: number;
      warning: number;
      violation: number;
    };
  };
}

/**
 * Daily limit check data
 */
export interface DailyLimitCheckData extends ComplianceRelatedData {
  hours_worked: number;
  hours_limit: number;
  date: string;
}

/**
 * Weekly limit check data
 */
export interface WeeklyLimitCheckData extends ComplianceRelatedData {
  hours_worked: number;
  hours_limit: number;
  week_start: string;
  week_end: string;
}

/**
 * Rest period check data
 */
export interface RestPeriodCheckData extends ComplianceRelatedData {
  rest_hours: number;
  required_rest_hours: number;
  previous_shift_end: string;
  current_shift_start: string;
}

/**
 * Break required check data
 */
export interface BreakRequiredCheckData extends ComplianceRelatedData {
  hours_worked: number;
  break_minutes: number;
  required_break_minutes: number;
}

/**
 * Generated Report Types
 * 
 * Audit trail for all generated reports with SHA-256 integrity verification.
 * Links to inspector tokens for ITSS access control.
 */

export const REPORT_TYPES = {
  MONTHLY_TIMESHEET: 'monthly_timesheet',
  COMPLIANCE: 'compliance',
  VARIANCE: 'variance',
  INSPECTOR: 'inspector',
} as const;

export type ReportType = typeof REPORT_TYPES[keyof typeof REPORT_TYPES];

export const REPORT_ACCESS_LEVELS = {
  INTERNAL: 'internal',
  INSPECTOR: 'inspector',
  PUBLIC: 'public',
} as const;

export type ReportAccessLevel = typeof REPORT_ACCESS_LEVELS[keyof typeof REPORT_ACCESS_LEVELS];

/**
 * Generated report stored in database
 */
export interface GeneratedReport {
  id: string;
  organization_id: string;

  // Report Details
  report_type: ReportType;
  report_name: string;
  period_start?: Date;
  period_end?: Date;

  // Generation Info
  generated_by: string;
  generated_at: Date;

  // File Info
  file_path: string;
  file_size_bytes?: number;
  file_hash: string; // SHA-256

  // Access Control
  access_level: ReportAccessLevel;
  inspector_token_id?: string;
  expires_at?: Date;

  // Metadata
  metadata?: ReportMetadata;
  created_at: Date;
}

/**
 * Report metadata (flexible structure)
 */
export interface ReportMetadata {
  employee_count?: number;
  total_hours?: number;
  total_days?: number;
  violations_count?: number;
  warnings_count?: number;
  [key: string]: unknown;
}

/**
 * Generate report request
 */
export interface GenerateReportRequest {
  organization_id: string;
  report_type: ReportType;
  period_start?: Date | string;
  period_end?: Date | string;
  access_level?: ReportAccessLevel;
  metadata?: ReportMetadata;
}

/**
 * Report with generator info
 */
export interface GeneratedReportWithUser extends GeneratedReport {
  generated_by_name: string;
  generated_by_email: string;
}

/**
 * Monthly timesheet report metadata
 */
export interface MonthlyTimesheetMetadata extends ReportMetadata {
  user_id: string;
  user_name: string;
  year: number;
  month: number;
  total_hours: number;
  total_days: number;
  overtime_hours: number;
}

/**
 * Compliance report metadata
 */
export interface ComplianceReportMetadata extends ReportMetadata {
  violations_count: number;
  warnings_count: number;
  unresolved_count: number;
  check_types: string[];
}

/**
 * Variance report metadata
 */
export interface VarianceReportMetadata extends ReportMetadata {
  scheduled_hours: number;
  actual_hours: number;
  variance_hours: number;
  variance_percentage: number;
}

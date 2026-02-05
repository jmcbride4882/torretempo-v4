/**
 * Report Types for Torre Tempo V4 Phase 5
 * Comprehensive type definitions for monthly, variance, payroll, and compliance reports
 * Spanish labor law compliance (MIN_REST_HOURS=12, MAX_DAILY_HOURS=9, MAX_WEEKLY_HOURS=40)
 */

/**
 * Monthly Report
 * Aggregated summary of hours worked, days worked, and overtime for a specific month
 * Generated from time_entries and shifts data
 */
export interface MonthlyReport {
  id: string;
  organizationId: string;
  userId: string;
  year: number;
  month: number; // 1-12
  totalHours: number; // Total hours worked (decimal)
  totalDays: number; // Total days worked
  overtimeHours: number; // Hours exceeding MAX_WEEKLY_HOURS (40h/week)
  pdfUrl?: string; // URL to generated PDF report
  generatedAt?: Date;
  deliveredAt?: Date;
  deliveryMethod?: 'email' | 'download';
  createdAt: Date;
}

/**
 * Variance Report
 * Comparison between scheduled hours (shifts) and actual hours (time_entries)
 * Identifies discrepancies and compliance issues
 */
export interface VarianceReport {
  id: string;
  organizationId: string;
  userId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  scheduled: {
    totalHours: number;
    totalDays: number;
    shiftCount: number;
  };
  actual: {
    totalHours: number;
    totalDays: number;
    timeEntryCount: number;
  };
  variance: {
    hoursDifference: number; // actual - scheduled (positive = more hours worked)
    daysDifference: number;
    percentageVariance: number; // (actual - scheduled) / scheduled * 100
  };
  discrepancies: VarianceDiscrepancy[];
  generatedAt: Date;
}

/**
 * Variance Discrepancy
 * Individual shift/time entry mismatch
 */
export interface VarianceDiscrepancy {
  date: Date;
  shiftId?: string;
  timeEntryId?: string;
  scheduledHours: number;
  actualHours: number;
  difference: number;
  reason?: string; // e.g., "unscheduled overtime", "early departure", "no clock-in"
}

/**
 * Payroll Report
 * Compensation breakdown including base hours, overtime, and deductions
 * Supports Spanish labor law calculations
 */
export interface PayrollReport {
  id: string;
  organizationId: string;
  userId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  compensation: {
    baseHours: number; // Hours up to MAX_WEEKLY_HOURS
    baseRate: number; // Hourly rate (currency)
    basePay: number; // baseHours * baseRate
    overtimeHours: number; // Hours exceeding MAX_WEEKLY_HOURS
    overtimeRate: number; // Typically 1.25x or 1.5x base rate
    overtimePay: number; // overtimeHours * overtimeRate
    totalGrossPay: number; // basePay + overtimePay
  };
  deductions: {
    socialSecurity: number;
    incomeTax: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netPay: number; // totalGrossPay - totalDeductions
  generatedAt: Date;
}

/**
 * Compliance Report
 * Audit of labor law violations and compliance metrics
 * Spanish labor law: MIN_REST_HOURS=12, MAX_DAILY_HOURS=9, MAX_WEEKLY_HOURS=40
 */
export interface ComplianceReport {
  id: string;
  organizationId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalEmployees: number;
    employeesWithViolations: number;
    totalViolations: number;
    complianceScore: number; // 0-100, higher is better
  };
  violations: ComplianceViolation[];
  metrics: {
    avgDailyHours: number;
    avgWeeklyHours: number;
    maxDailyHours: number;
    maxWeeklyHours: number;
    restPeriodViolations: number; // Days with < 12h rest
    dailyLimitViolations: number; // Days with > 9h worked
    weeklyLimitViolations: number; // Weeks with > 40h worked
  };
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Compliance Violation
 * Individual violation record for audit trail
 */
export interface ComplianceViolation {
  id: string;
  userId: string;
  violationType: 'rest_period' | 'daily_limit' | 'weekly_limit' | 'break_violation';
  severity: 'warning' | 'critical';
  description: string;
  affectedDate: Date;
  details: {
    actualValue: number; // Hours worked, rest period, etc.
    limitValue: number; // Legal limit
    excess: number; // How much over the limit
  };
  correctionStatus: 'pending' | 'corrected' | 'acknowledged';
  correctionNotes?: string;
  createdAt: Date;
}

/**
 * Report Filter
 * Query parameters for filtering and generating reports
 */
export interface ReportFilter {
  organizationId: string;
  userId?: string; // Optional: filter by specific user
  reportType: 'monthly' | 'variance' | 'payroll' | 'compliance';
  startDate: Date;
  endDate: Date;
  includeArchived?: boolean;
  sortBy?: 'date' | 'user' | 'hours' | 'violations';
  sortOrder?: 'asc' | 'desc';
  pagination?: {
    page: number; // 1-indexed
    limit: number; // Items per page
  };
}

/**
 * Report Response Wrapper
 * Standard response format for all report endpoints
 */
export interface ReportResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    generatedAt: Date;
    generatedBy: string; // User ID or system
    reportType: string;
    periodStart: Date;
    periodEnd: Date;
  };
  errors?: string[];
}

/**
 * Paginated Report Response
 * For reports with multiple records
 */
export interface PaginatedReportResponse<T> extends ReportResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Report Generation Request
 * Parameters for triggering report generation
 */
export interface ReportGenerationRequest {
  organizationId: string;
  reportType: 'monthly' | 'variance' | 'payroll' | 'compliance';
  userId?: string;
  year?: number;
  month?: number;
  startDate?: Date;
  endDate?: Date;
  deliveryMethod?: 'email' | 'download';
  deliveryEmail?: string;
}

/**
 * Report Delivery Status
 * Tracks report generation and delivery
 */
export interface ReportDeliveryStatus {
  reportId: string;
  status: 'pending' | 'generating' | 'generated' | 'delivered' | 'failed';
  generationStartedAt?: Date;
  generationCompletedAt?: Date;
  deliveredAt?: Date;
  deliveryMethod?: 'email' | 'download';
  deliveryEmail?: string;
  pdfUrl?: string;
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: Date;
}

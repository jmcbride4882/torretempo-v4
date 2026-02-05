/**
 * Report Types for Torre Tempo V4 Phase 5
 * Frontend type definitions for monthly, variance, payroll, and compliance reports
 * Spanish labor law compliance (MIN_REST_HOURS=12, MAX_DAILY_HOURS=9, MAX_WEEKLY_HOURS=40)
 */

/**
 * Report Status
 */
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'delivered' | 'failed';

/**
 * Report Type
 */
export type ReportType = 'monthly' | 'variance' | 'payroll' | 'compliance';

/**
 * Violation Type
 */
export type ViolationType = 'rest_period' | 'daily_limit' | 'weekly_limit' | 'break_violation';

/**
 * Violation Severity
 */
export type ViolationSeverity = 'warning' | 'critical';

/**
 * Monthly Report
 * Aggregated summary of hours worked, days worked, and overtime for a specific month
 */
export interface MonthlyReport {
  id: string;
  organizationId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  year: number;
  month: number; // 1-12
  totalHours: number;
  totalDays: number;
  overtimeHours: number;
  pdfUrl?: string;
  status: ReportStatus;
  generatedAt?: string;
  deliveredAt?: string;
  deliveryMethod?: 'email' | 'download';
  createdAt: string;
}

/**
 * Variance Report
 * Comparison between scheduled hours (shifts) and actual hours (time_entries)
 */
export interface VarianceReport {
  id: string;
  organizationId: string;
  userId: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
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
    hoursDifference: number;
    daysDifference: number;
    percentageVariance: number;
  };
  discrepancies: VarianceDiscrepancy[];
  generatedAt: string;
}

/**
 * Variance Discrepancy
 * Individual shift/time entry mismatch
 */
export interface VarianceDiscrepancy {
  date: string;
  shiftId?: string;
  timeEntryId?: string;
  scheduledHours: number;
  actualHours: number;
  difference: number;
  reason?: string;
}

/**
 * Payroll Report
 * Compensation breakdown including base hours, overtime, and deductions
 */
export interface PayrollReport {
  id: string;
  organizationId: string;
  userId: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  compensation: {
    baseHours: number;
    baseRate: number;
    basePay: number;
    overtimeHours: number;
    overtimeRate: number;
    overtimePay: number;
    totalGrossPay: number;
  };
  deductions: {
    socialSecurity: number;
    incomeTax: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netPay: number;
  generatedAt: string;
}

/**
 * Compliance Report
 * Audit of labor law violations and compliance metrics
 */
export interface ComplianceReport {
  id: string;
  organizationId: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalEmployees: number;
    employeesWithViolations: number;
    totalViolations: number;
    complianceScore: number;
  };
  violations: ComplianceViolation[];
  metrics: {
    avgDailyHours: number;
    avgWeeklyHours: number;
    maxDailyHours: number;
    maxWeeklyHours: number;
    restPeriodViolations: number;
    dailyLimitViolations: number;
    weeklyLimitViolations: number;
  };
  recommendations: string[];
  generatedAt: string;
}

/**
 * Compliance Violation
 * Individual violation record
 */
export interface ComplianceViolation {
  id: string;
  userId: string;
  userName?: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  description: string;
  affectedDate: string;
  details: {
    actualValue: number;
    limitValue: number;
    excess: number;
  };
  correctionStatus: 'pending' | 'corrected' | 'acknowledged';
  correctionNotes?: string;
  createdAt: string;
}

/**
 * Report Filter
 * Query parameters for filtering reports
 */
export interface ReportFilter {
  year?: number;
  month?: number;
  userId?: string;
  reportType?: ReportType;
  status?: ReportStatus;
  startDate?: string;
  endDate?: string;
}

/**
 * Report Generation Request
 */
export interface ReportGenerationRequest {
  reportType: ReportType;
  userId?: string;
  year: number;
  month: number;
  deliveryMethod?: 'email' | 'download';
  deliveryEmail?: string;
}

/**
 * Reports Response
 */
export interface ReportsResponse {
  reports: MonthlyReport[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Single Report Response
 */
export interface ReportResponse {
  report: MonthlyReport;
  variance?: VarianceReport;
  payroll?: PayrollReport;
  compliance?: ComplianceReport;
}

/**
 * Report Generation Response
 */
export interface ReportGenerationResponse {
  reportId: string;
  status: ReportStatus;
  message: string;
}

/**
 * PDF Download Response
 */
export interface PDFDownloadResponse {
  pdfUrl: string;
  expiresAt: string;
}

/**
 * Team Member (for filter dropdown)
 */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

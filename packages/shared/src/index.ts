export { ac, roles, ROLES, type Role } from './permissions';

// Employee Profile Types
export type {
  EmployeeProfile,
  EmployeeProfileDecrypted,
  EmployeeAddress,
  EmergencyContact,
  CreateEmployeeProfileRequest,
  EmploymentType,
} from './types/employee';
export { EMPLOYMENT_TYPES } from './types/employee';

// Leave Request Types
export type {
  LeaveRequest,
  LeaveBalanceSummary,
  LeaveRequestWithUser,
  CreateLeaveRequestRequest,
  UpdateLeaveRequestStatusRequest,
  LeaveType,
  LeaveStatus,
} from './types/leave';
export { LEAVE_TYPES, LEAVE_STATUSES } from './types/leave';

// Generated Report Types
export type {
  GeneratedReport,
  GeneratedReportWithUser,
  ReportMetadata,
  MonthlyTimesheetMetadata,
  ComplianceReportMetadata,
  VarianceReportMetadata,
  GenerateReportRequest,
  ReportType,
  ReportAccessLevel,
} from './types/report';
export { REPORT_TYPES, REPORT_ACCESS_LEVELS } from './types/report';

// Compliance Check Types
export type {
  ComplianceCheck,
  ComplianceCheckWithUser,
  ComplianceSummary,
  ComplianceRelatedData,
  DailyLimitCheckData,
  WeeklyLimitCheckData,
  RestPeriodCheckData,
  BreakRequiredCheckData,
  CreateComplianceCheckRequest,
  ResolveComplianceCheckRequest,
  ComplianceCheckType,
  ComplianceCheckResult,
  ComplianceSeverity,
} from './types/compliance';
export { 
  COMPLIANCE_CHECK_TYPES,
  COMPLIANCE_CHECK_RESULTS,
  COMPLIANCE_SEVERITIES,
} from './types/compliance';

// Notification Preference Types
export type {
  NotificationPreferences,
  NotificationPreferencesWithDefaults,
  UpdateNotificationPreferencesRequest,
  ShouldNotifyResult,
  DndDay,
} from './types/notification-preferences';
export { DND_DAYS, DEFAULT_NOTIFICATION_PREFERENCES } from './types/notification-preferences';

// Organization Settings Types
export type {
  OrganizationSettings,
  OrganizationSettingsMetadata,
  UpdateOrganizationSettingsRequest,
  ComplianceValidationResult,
} from './types/organization-settings';
export { DEFAULT_ORGANIZATION_SETTINGS } from './types/organization-settings';

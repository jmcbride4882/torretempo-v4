/**
 * Leave Request Types
 * 
 * Vacation, sick leave, personal days tracking.
 * Supports half-days and manager approval workflow.
 * 
 * Spanish law: 30 calendar days vacation = 22 working days (Estatuto Art. 38)
 */

export const LEAVE_TYPES = {
  VACATION: 'vacation',
  SICK: 'sick',
  PERSONAL: 'personal',
  UNPAID: 'unpaid',
} as const;

export type LeaveType = typeof LEAVE_TYPES[keyof typeof LEAVE_TYPES];

export const LEAVE_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type LeaveStatus = typeof LEAVE_STATUSES[keyof typeof LEAVE_STATUSES];

/**
 * Leave request stored in database
 */
export interface LeaveRequest {
  id: string;
  user_id: string;
  organization_id: string;

  // Leave Details
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  days_count: number; // Supports half-days (e.g., 0.5, 1.5, 2.5)

  // Request Info
  reason?: string;
  status: LeaveStatus;
  requested_at: Date;

  // Approval
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;

  // Sick Leave Specific
  doctors_note_url?: string;
  doctors_note_verified: boolean;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Create leave request
 */
export interface CreateLeaveRequestRequest {
  user_id: string;
  organization_id: string;
  leave_type: LeaveType;
  start_date: Date | string;
  end_date: Date | string;
  days_count: number;
  reason?: string;
}

/**
 * Update leave request status (manager action)
 */
export interface UpdateLeaveRequestStatusRequest {
  status: LeaveStatus;
  approved_by?: string;
  rejection_reason?: string;
}

/**
 * Leave balance summary
 */
export interface LeaveBalanceSummary {
  user_id: string;
  organization_id: string;
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_days_pending: number;
  vacation_days_remaining: number;
  sick_days_used: number;
  personal_days_used: number;
  unpaid_days_used: number;
}

/**
 * Leave request with user info
 */
export interface LeaveRequestWithUser extends LeaveRequest {
  user_name: string;
  user_email: string;
  approver_name?: string;
}

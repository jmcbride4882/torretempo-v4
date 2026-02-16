const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface LeaveRequest {
  id: string;
  user_id: string;
  organization_id: string;
  leave_type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  start_date: string;
  end_date: string;
  days_count: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  doctors_note_url: string | null;
  doctors_note_verified: boolean;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
}

export interface LeaveRequestsResponse {
  leave_requests: LeaveRequest[];
  count: number;
}

export interface LeaveRequestResponse {
  leave_request: LeaveRequest;
}

export interface ApproveLeaveResponse {
  message: string;
  leave_request: LeaveRequest;
  updated_balance: {
    accrued: number;
    used: number;
    remaining: number;
  } | null;
}

export interface RejectLeaveResponse {
  message: string;
  leave_request: LeaveRequest;
}

export interface CreateLeaveRequestData {
  leave_type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  start_date: string;
  end_date: string;
  reason?: string;
  doctors_note_url?: string;
}

export interface LeaveRequestFilters {
  status?: string;
  leave_type?: string;
  user_id?: string;
}

class LeaveApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LeaveApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new LeaveApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchLeaveRequests(
  slug: string,
  params?: LeaveRequestFilters
): Promise<LeaveRequestsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.leave_type) searchParams.append('leave_type', params.leave_type);
  if (params?.user_id) searchParams.append('user_id', params.user_id);

  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/leave-requests?${searchParams.toString()}`,
    { credentials: 'include' }
  );
  return handleResponse<LeaveRequestsResponse>(response);
}

export async function fetchLeaveRequest(
  slug: string,
  id: string
): Promise<LeaveRequestResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/leave-requests/${id}`, {
    credentials: 'include',
  });
  return handleResponse<LeaveRequestResponse>(response);
}

export async function createLeaveRequest(
  slug: string,
  data: CreateLeaveRequestData
): Promise<LeaveRequestResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/leave-requests`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<LeaveRequestResponse>(response);
}

export async function approveLeaveRequest(
  slug: string,
  id: string
): Promise<ApproveLeaveResponse> {
  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/leave-requests/${id}/approve`,
    {
      method: 'PATCH',
      credentials: 'include',
    }
  );
  return handleResponse<ApproveLeaveResponse>(response);
}

export async function rejectLeaveRequest(
  slug: string,
  id: string,
  reason: string
): Promise<RejectLeaveResponse> {
  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/leave-requests/${id}/reject`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_reason: reason }),
    }
  );
  return handleResponse<RejectLeaveResponse>(response);
}

export async function cancelLeaveRequest(slug: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/leave-requests/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new LeaveApiError(
      data.message || data.error || 'Failed to cancel leave request',
      response.status,
      data
    );
  }
}

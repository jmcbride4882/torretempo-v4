/**
 * Time Entries API
 * Frontend API client for time entry operations (clock in/out, breaks, corrections)
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
}

export type ClockMethod = 'tap' | 'nfc' | 'qr' | 'pin';
export type TimeEntryStatus = 'active' | 'completed' | 'disputed';
export type BreakType = 'paid' | 'unpaid';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface TimeEntry {
  id: string;
  organization_id: string;
  user_id: string;
  linked_shift_id: string | null;
  entry_date: string; // ISO date
  clock_in: string; // ISO timestamp
  clock_out: string | null; // ISO timestamp
  clock_in_location: LocationData;
  clock_out_location: LocationData | null;
  clock_in_method: ClockMethod;
  clock_out_method: ClockMethod | null;
  break_minutes: number;
  total_minutes: number | null;
  notes: string | null;
  is_verified: boolean;
  status: TimeEntryStatus;
  created_at: string;
  updated_at: string;
}

export interface BreakEntry {
  id: string;
  organization_id: string;
  time_entry_id: string;
  break_start: string; // ISO timestamp
  break_end: string | null; // ISO timestamp
  break_type: BreakType;
  created_at: string;
  updated_at: string;
}

export interface CorrectionRequest {
  id: string;
  organization_id: string;
  time_entry_id: string;
  requested_by: string;
  reviewed_by: string | null;
  original_data: Partial<TimeEntry>;
  requested_data: Partial<TimeEntry>;
  reason: string;
  status: CorrectionStatus;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Request/Response types
export interface ClockInData {
  linked_shift_id?: string;
  clock_in_location: LocationData;
  clock_in_method: ClockMethod;
  notes?: string;
}

export interface ClockOutData {
  clock_out_location: LocationData;
  clock_out_method?: ClockMethod;
  notes?: string;
}

export interface CreateBreakData {
  break_type: BreakType;
}

export interface EndBreakData {
  // No fields required - server auto-fills break_end
}

export interface CreateCorrectionData {
  requested_data: Partial<TimeEntry>;
  reason: string;
}

export interface TimeEntryFilters {
  user_id?: string;
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  status?: TimeEntryStatus | TimeEntryStatus[];
  limit?: number;
  offset?: number;
}

export interface TimeEntriesResponse {
  entries: TimeEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface TimeEntryResponse {
  entry: TimeEntry;
}

export interface BreaksResponse {
  breaks: BreakEntry[];
}

export interface BreakResponse {
  break: BreakEntry;
}

export interface CorrectionsResponse {
  corrections: CorrectionRequest[];
}

export interface CorrectionResponse {
  correction: CorrectionRequest;
}

// ============================================================================
// Error Handling
// ============================================================================

export class TimeEntryApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TimeEntryApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new TimeEntryApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

// ============================================================================
// Time Entries API
// ============================================================================

/**
 * Fetch all time entries with optional filters
 */
export async function fetchTimeEntries(
  orgSlug: string,
  filters?: TimeEntryFilters
): Promise<TimeEntriesResponse> {
  const params = new URLSearchParams();

  if (filters?.user_id) params.append('user_id', filters.user_id);
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach(s => params.append('status', s));
  }
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries?${params.toString()}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<TimeEntriesResponse>(response);
}

/**
 * Fetch the active time entry for the current user
 * Returns null if no active entry
 */
export async function fetchActiveTimeEntry(
  orgSlug: string
): Promise<TimeEntry | null> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/active`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (response.status === 404) {
    return null;
  }

  const data = await handleResponse<TimeEntryResponse>(response);
  return data.entry;
}

/**
 * Fetch a single time entry by ID
 */
export async function fetchTimeEntry(
  orgSlug: string,
  entryId: string
): Promise<TimeEntryResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${entryId}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<TimeEntryResponse>(response);
}

/**
 * Clock in - Create a new time entry
 */
export async function clockIn(
  orgSlug: string,
  data: ClockInData
): Promise<TimeEntryResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<TimeEntryResponse>(response);
}

/**
 * Clock out - Complete an active time entry
 */
export async function clockOut(
  orgSlug: string,
  entryId: string,
  data: ClockOutData
): Promise<TimeEntryResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${entryId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<TimeEntryResponse>(response);
}

/**
 * Verify a time entry (manager only)
 */
export async function verifyTimeEntry(
  orgSlug: string,
  entryId: string
): Promise<TimeEntryResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${entryId}/verify`;

  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
  });

  return handleResponse<TimeEntryResponse>(response);
}

/**
 * Delete a time entry (unverified only)
 */
export async function deleteTimeEntry(
  orgSlug: string,
  entryId: string
): Promise<void> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${entryId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new TimeEntryApiError(
      data.message || data.error || `Failed to delete time entry`,
      response.status,
      data
    );
  }
}

// ============================================================================
// Breaks API
// ============================================================================

/**
 * Fetch all breaks for a time entry
 */
export async function fetchBreaks(
  orgSlug: string,
  timeEntryId: string
): Promise<BreaksResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${timeEntryId}/breaks`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<BreaksResponse>(response);
}

/**
 * Start a break
 */
export async function startBreak(
  orgSlug: string,
  timeEntryId: string,
  data: CreateBreakData
): Promise<BreakResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${timeEntryId}/breaks`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<BreakResponse>(response);
}

/**
 * End a break
 */
export async function endBreak(
  orgSlug: string,
  timeEntryId: string,
  breakId: string
): Promise<BreakResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${timeEntryId}/breaks/${breakId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
  });

  return handleResponse<BreakResponse>(response);
}

/**
 * Delete a break
 */
export async function deleteBreak(
  orgSlug: string,
  timeEntryId: string,
  breakId: string
): Promise<void> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/${timeEntryId}/breaks/${breakId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new TimeEntryApiError(
      data.message || data.error || `Failed to delete break`,
      response.status,
      data
    );
  }
}

// ============================================================================
// Corrections API
// ============================================================================

/**
 * Fetch all correction requests
 * Managers see all, employees see only their own
 */
export async function fetchCorrections(
  orgSlug: string
): Promise<CorrectionsResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/corrections`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<CorrectionsResponse>(response);
}

/**
 * Fetch a single correction request
 */
export async function fetchCorrection(
  orgSlug: string,
  correctionId: string
): Promise<CorrectionResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/corrections/${correctionId}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<CorrectionResponse>(response);
}

/**
 * Create a correction request
 */
export async function createCorrection(
  orgSlug: string,
  data: CreateCorrectionData
): Promise<CorrectionResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/corrections`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<CorrectionResponse>(response);
}

/**
 * Approve a correction request (manager only)
 */
export async function approveCorrection(
  orgSlug: string,
  correctionId: string
): Promise<CorrectionResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/corrections/${correctionId}/approve`;

  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
  });

  return handleResponse<CorrectionResponse>(response);
}

/**
 * Reject a correction request (manager only)
 */
export async function rejectCorrection(
  orgSlug: string,
  correctionId: string,
  reason?: string
): Promise<CorrectionResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/corrections/${correctionId}/reject`;

  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  return handleResponse<CorrectionResponse>(response);
}

/**
 * Cancel a pending correction request (employee only)
 */
export async function cancelCorrection(
  orgSlug: string,
  correctionId: string
): Promise<void> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/corrections/${correctionId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new TimeEntryApiError(
      data.message || data.error || `Failed to cancel correction`,
      response.status,
      data
    );
  }
}

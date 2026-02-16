/**
 * Time Entries API
 * Frontend API client for time entry operations (clock in/out, breaks, corrections)
 *
 * IMPORTANT: This client matches the backend API routes exactly:
 * - Time entries: apps/api/src/routes/v1/time-entries.ts
 *   POST /clock-in, POST /clock-out, GET /, GET /:id
 * - Breaks: apps/api/src/routes/v1/breaks.ts
 *   POST /start, POST /end, GET /?time_entry_id=...
 * - Corrections: apps/api/src/routes/v1/correction-requests.ts
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
  clock_in_location: LocationData | null;
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
  duration_minutes?: number | null; // Calculated by backend
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

// Request types — match backend body expectations
export interface ClockInData {
  linked_shift_id?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  method?: ClockMethod;
  notes?: string;
}

export interface ClockOutData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  method?: ClockMethod;
  notes?: string;
}

export interface CreateBreakData {
  break_type: BreakType;
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
  page?: number;
  limit?: number;
}

// Response types — match backend response shapes
export interface TimeEntriesResponse {
  time_entries: TimeEntry[];
  page: number;
  limit: number;
  count: number;
}

export interface TimeEntryResponse {
  time_entry: TimeEntry;
  message?: string;
}

export interface BreaksResponse {
  breaks: BreakEntry[];
}

export interface BreakStartResponse {
  message: string;
  break: BreakEntry;
}

export interface BreakEndResponse {
  message: string;
  duration_minutes: number;
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

  try {
    const data = await response.json();
    return data;
  } catch (error) {
    throw new TimeEntryApiError(
      'Failed to parse API response',
      500,
      { originalError: error }
    );
  }
}

// ============================================================================
// Time Entries API
// Backend: apps/api/src/routes/v1/time-entries.ts
// ============================================================================

/**
 * Fetch all time entries with optional filters
 * Backend: GET /api/v1/org/:slug/time-entries?page=1&limit=20&user_id=...&status=...
 * Response: { time_entries, page, limit, count }
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
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries?${params.toString()}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  const data = await handleResponse<TimeEntriesResponse>(response);

  // Validate response structure
  if (!data || typeof data !== 'object') {
    throw new TimeEntryApiError('Invalid API response: not an object', 500, { data });
  }

  if (!Array.isArray(data.time_entries)) {
    console.error('fetchTimeEntries: time_entries is not an array', data);
    // Return a valid structure with empty entries
    return {
      time_entries: [],
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 20,
      count: 0,
    };
  }

  return data;
}

/**
 * Fetch the active time entry for the current user
 * Uses the list endpoint with status=active filter
 * Returns null if no active entry
 */
export async function fetchActiveTimeEntry(
  orgSlug: string
): Promise<TimeEntry | null> {
  const data = await fetchTimeEntries(orgSlug, { status: 'active', limit: 1 });

  if (data.time_entries.length === 0) {
    return null;
  }

  return data.time_entries[0] ?? null;
}

/**
 * Fetch a single time entry by ID
 * Backend: GET /api/v1/org/:slug/time-entries/:id
 * Response: { time_entry }
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
 * Backend: POST /api/v1/org/:slug/time-entries/clock-in
 * Body: { linked_shift_id?, latitude?, longitude?, accuracy?, method? }
 * Response: { message, time_entry }
 */
export async function clockIn(
  orgSlug: string,
  data: ClockInData
): Promise<TimeEntryResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/clock-in`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<TimeEntryResponse>(response);
}

/**
 * Clock out - Complete the active time entry
 * Backend: POST /api/v1/org/:slug/time-entries/clock-out
 * Body: { latitude?, longitude?, accuracy?, method? }
 * Response: { message, time_entry, compliance }
 */
export async function clockOut(
  orgSlug: string,
  _entryId: string, // Kept for API compatibility but not used in URL
  data: ClockOutData
): Promise<TimeEntryResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/time-entries/clock-out`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<TimeEntryResponse>(response);
}

// ============================================================================
// Breaks API
// Backend: apps/api/src/routes/v1/breaks.ts
// ============================================================================

/**
 * Fetch all breaks for a time entry
 * Backend: GET /api/v1/org/:slug/breaks?time_entry_id=...
 * Response: { breaks: [..., duration_minutes] }
 */
export async function fetchBreaks(
  orgSlug: string,
  timeEntryId: string
): Promise<BreaksResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/breaks?time_entry_id=${timeEntryId}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<BreaksResponse>(response);
}

/**
 * Start a break
 * Backend: POST /api/v1/org/:slug/breaks/start
 * Body: { break_type }
 * Response: { message, break }
 * Note: Backend auto-detects active time entry, no need to pass timeEntryId
 */
export async function startBreak(
  orgSlug: string,
  _timeEntryId: string, // Kept for API compatibility but not used in URL
  data: CreateBreakData
): Promise<BreakStartResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/breaks/start`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<BreakStartResponse>(response);
}

/**
 * End the active break
 * Backend: POST /api/v1/org/:slug/breaks/end
 * Response: { message, duration_minutes }
 * Note: Backend auto-detects active break, no need to pass breakId
 */
export async function endBreak(
  orgSlug: string,
  _timeEntryId: string, // Kept for API compatibility but not used in URL
  _breakId: string // Kept for API compatibility but not used in URL
): Promise<BreakEndResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/breaks/end`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });

  return handleResponse<BreakEndResponse>(response);
}

// ============================================================================
// Corrections API
// Backend: apps/api/src/routes/v1/correction-requests.ts
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

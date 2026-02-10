const API_BASE = import.meta.env.VITE_API_URL || '';

export interface CorrectionRequest {
  id: string;
  organization_id: string;
  time_entry_id: string;
  requested_by: string;
  reviewed_by: string | null;
  original_data: {
    clock_in: string;
    clock_out: string | null;
    break_minutes: number;
  };
  requested_data: {
    clock_in: string;
    clock_out: string;
    break_minutes: number;
    rejection_reason?: string;
  };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  created_at: string;
}

export interface CorrectionsResponse {
  corrections: CorrectionRequest[];
  count: number;
}

export interface CorrectionResponse {
  message: string;
  correction: CorrectionRequest;
}

export interface CreateCorrectionData {
  time_entry_id: string;
  requested_clock_in?: string;
  requested_clock_out?: string;
  reason: string;
}

export interface CorrectionFilters {
  status?: string;
}

class CorrectionApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CorrectionApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new CorrectionApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchCorrections(
  slug: string,
  params?: CorrectionFilters
): Promise<CorrectionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);

  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/corrections?${searchParams.toString()}`,
    { credentials: 'include' }
  );
  return handleResponse<CorrectionsResponse>(response);
}

export async function createCorrection(
  slug: string,
  data: CreateCorrectionData
): Promise<CorrectionResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/corrections`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<CorrectionResponse>(response);
}

export async function approveCorrection(
  slug: string,
  id: string
): Promise<{ message: string; warnings: string[] }> {
  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/corrections/${id}/approve`,
    {
      method: 'PATCH',
      credentials: 'include',
    }
  );
  return handleResponse<{ message: string; warnings: string[] }>(response);
}

export async function rejectCorrection(
  slug: string,
  id: string,
  reason: string
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/corrections/${id}/reject`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_reason: reason }),
    }
  );
  return handleResponse<{ message: string }>(response);
}

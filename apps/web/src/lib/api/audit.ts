const API_BASE = import.meta.env.VITE_API_URL || '';

export interface AuditVerificationResult {
  valid: boolean;
  chainLength: number;
  lastHash: string;
  tamperedAt?: number;
}

class AuditApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuditApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new AuditApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function verifyAuditEntry(
  slug: string,
  entryId: string
): Promise<AuditVerificationResult> {
  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/audit/verify/${entryId}`,
    { credentials: 'include' }
  );
  return handleResponse<AuditVerificationResult>(response);
}

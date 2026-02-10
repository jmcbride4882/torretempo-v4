const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
}

export interface MembersResponse {
  members: Member[];
}

export interface PinResponse {
  message: string;
  hasPIN: boolean;
}

export interface VerifyPinResponse {
  message: string;
  valid: boolean;
  memberId: string;
  userId: string;
}

export interface PinStatusResponse {
  hasPIN: boolean;
}

class MemberApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemberApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new MemberApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchMembers(slug: string): Promise<MembersResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/members`, {
    credentials: 'include',
  });
  return handleResponse<MembersResponse>(response);
}

export async function setMemberPin(
  slug: string,
  memberId: string,
  pin: string
): Promise<PinResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/members/${memberId}/pin`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  return handleResponse<PinResponse>(response);
}

export async function verifyMemberPin(
  slug: string,
  memberId: string,
  pin: string
): Promise<VerifyPinResponse> {
  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/members/${memberId}/verify-pin`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }
  );
  return handleResponse<VerifyPinResponse>(response);
}

export async function fetchPinStatus(
  slug: string,
  memberId: string
): Promise<PinStatusResponse> {
  const response = await fetch(
    `${API_BASE}/api/v1/org/${slug}/members/${memberId}/pin-status`,
    { credentials: 'include' }
  );
  return handleResponse<PinStatusResponse>(response);
}

export async function removeMemberPin(
  slug: string,
  memberId: string
): Promise<PinResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/members/${memberId}/pin`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<PinResponse>(response);
}

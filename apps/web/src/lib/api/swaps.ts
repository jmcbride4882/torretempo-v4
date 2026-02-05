/**
 * Swap Requests API
 * Frontend API client for swap request operations
 */

import type {
  SwapRequest,
  SwapsResponse,
  SwapResponse,
  SwapFilters,
  CreateSwapRequestData,
  PeerAction,
  ManagerAction,
} from '@/types/swaps';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Error class for API errors
export class SwapApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SwapApiError';
  }
}

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new SwapApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

/**
 * Fetch all swaps with optional filters
 */
export async function fetchSwaps(
  orgSlug: string,
  filters?: SwapFilters
): Promise<SwapsResponse> {
  const params = new URLSearchParams();
  
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach(s => params.append('status', s));
  }
  if (filters?.from_date) params.append('from_date', filters.from_date);
  if (filters?.to_date) params.append('to_date', filters.to_date);
  if (filters?.requester_id) params.append('requester_id', filters.requester_id);
  if (filters?.recipient_id) params.append('recipient_id', filters.recipient_id);

  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps?${params.toString()}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<SwapsResponse>(response);
}

/**
 * Fetch swaps created by the current user
 */
export async function fetchMySwaps(orgSlug: string): Promise<SwapsResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/mine`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<SwapsResponse>(response);
}

/**
 * Fetch swaps pending for the current user to respond to
 */
export async function fetchPendingSwaps(orgSlug: string): Promise<SwapsResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/pending`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<SwapsResponse>(response);
}

/**
 * Fetch a single swap by ID
 */
export async function fetchSwap(
  orgSlug: string,
  swapId: string
): Promise<SwapResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/${swapId}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<SwapResponse>(response);
}

/**
 * Create a new swap request
 */
export async function createSwapRequest(
  orgSlug: string,
  data: CreateSwapRequestData
): Promise<SwapResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps`;
  
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<SwapResponse>(response);
}

/**
 * Respond to a swap as a peer (accept or reject)
 */
export async function respondToPeer(
  orgSlug: string,
  swapId: string,
  action: PeerAction,
  reason?: string
): Promise<SwapResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/${swapId}/respond-peer`;
  
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: action, reason }),
  });

  return handleResponse<SwapResponse>(response);
}

/**
 * Respond to a swap as a manager (approve or reject)
 */
export async function respondAsManager(
  orgSlug: string,
  swapId: string,
  action: ManagerAction,
  reason?: string
): Promise<SwapResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/${swapId}/respond-manager`;
  
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: action, reason }),
  });

  return handleResponse<SwapResponse>(response);
}

/**
 * Claim an open swap request
 */
export async function claimOpenSwap(
  orgSlug: string,
  swapId: string,
  shiftToOffer?: string
): Promise<SwapResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/${swapId}/claim`;
  
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ desired_shift_id: shiftToOffer }),
  });

  return handleResponse<SwapResponse>(response);
}

/**
 * Cancel a swap request
 */
export async function cancelSwap(
  orgSlug: string,
  swapId: string,
  reason?: string
): Promise<SwapResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/${swapId}/cancel`;
  
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  return handleResponse<SwapResponse>(response);
}

/**
 * Get count of pending swaps for the current user
 * Useful for notification badges
 */
export async function fetchPendingSwapsCount(orgSlug: string): Promise<number> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/swaps/pending-count`;
  
  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch user's upcoming shifts (for swap modal)
 */
export async function fetchMyUpcomingShifts(orgSlug: string) {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const params = new URLSearchParams({
    start_date: now.toISOString(),
    end_date: thirtyDaysLater.toISOString(),
    my_shifts: 'true',
  });
  
  const url = `${API_URL}/api/v1/org/${orgSlug}/shifts?${params.toString()}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<{ shifts: SwapRequest['offered_shift'][] }>(response);
}

/**
 * Fetch available shifts for swapping (other team members' shifts)
 */
export async function fetchAvailableShifts(orgSlug: string) {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const params = new URLSearchParams({
    start_date: now.toISOString(),
    end_date: thirtyDaysLater.toISOString(),
  });
  
  const url = `${API_URL}/api/v1/org/${orgSlug}/shifts?${params.toString()}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<{ shifts: SwapRequest['offered_shift'][] }>(response);
}

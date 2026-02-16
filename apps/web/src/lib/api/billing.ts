const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface BillingStatus {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_code: string;
  status: 'active' | 'suspended' | 'cancelled' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface CurrentPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_period: 'monthly' | 'annual';
  employee_limit: number | null;
  included_modules: Record<string, boolean>;
  usage: {
    employees: number;
    limit: number | null;
    atCapacity: boolean;
    percentUsed: number;
  };
}

export interface AvailablePlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_period: 'monthly' | 'annual';
  employee_limit: number | null;
  included_modules: Record<string, boolean>;
  is_active: boolean;
}

export interface ChangePlanResponse {
  message: string;
  data: {
    previousPlan: string;
    newPlan: string;
  };
}

export interface CancelSubscriptionResponse {
  message: string;
  data: {
    canceledAt: string;
    effectiveDate: string;
  };
}

class BillingApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BillingApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new BillingApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchBillingStatus(slug: string): Promise<{ data: BillingStatus }> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/status`, {
    credentials: 'include',
  });
  return handleResponse<{ data: BillingStatus }>(response);
}

export async function fetchCurrentPlan(slug: string): Promise<{ data: CurrentPlan }> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/plan`, {
    credentials: 'include',
  });
  return handleResponse<{ data: CurrentPlan }>(response);
}

export async function fetchAvailablePlans(slug: string): Promise<{ data: AvailablePlan[] }> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/plans`, {
    credentials: 'include',
  });
  return handleResponse<{ data: AvailablePlan[] }>(response);
}

export async function changePlan(
  slug: string,
  planId: string
): Promise<ChangePlanResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/change-plan`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId }),
  });
  return handleResponse<ChangePlanResponse>(response);
}

export async function cancelSubscription(
  slug: string,
  reason?: string
): Promise<CancelSubscriptionResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/cancel`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<CancelSubscriptionResponse>(response);
}

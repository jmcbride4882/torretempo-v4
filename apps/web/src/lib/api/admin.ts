/**
 * Admin API Client
 * Frontend API client for platform admin operations in Torre Tempo V4
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Error class for Admin API errors
 */
export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/**
 * Helper to handle API responses
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new AdminApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

// ============================================================================
// TYPES
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: string;
  memberCount: number;
  subscriptionTier: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'suspended' | 'cancelled' | 'past_due';
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TenantsResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
  createdAt: string;
  role: string;
  banned: boolean;
  isAdmin: boolean;
  organizations: {
    id: string;
    name: string;
    role: string;
  }[];
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface SubscriptionMetrics {
  mrr: number;
  arr: number;
  totalActive: number;
  totalFree: number;
  totalPaid: number;
  churnRate: number;
  tierBreakdown: {
    free: number;
    starter: number;
    pro: number;
    enterprise: number;
  };
  recentChanges: {
    id: string;
    organizationName: string;
    fromTier: string;
    toTier: string;
    changedAt: string;
  }[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  system: {
    hostname: string;
    platform: string;
    arch: string;
    cpus: number;
    cpuUsage: number;
    loadAverage: {
      '1min': number;
      '5min': number;
      '15min': number;
    };
    memory: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    };
    uptime: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
    connectionCount: number;
  };
  redis: {
    status: 'connected' | 'disconnected';
    ping: number;
    memory: {
      used: number;
      peak: number;
    };
  };
  queues: {
    name: 'email' | 'pdf' | 'notification' | 'compliance' | 'monthly' | 'backup';
    pending: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }[];
  failedJobs: {
    queueName: string;
    failedCount: number;
    oldestFailedAt: string | null;
    recentErrors: {
      jobId: string;
      error: string;
      failedAt: string;
    }[];
  }[];
}

export interface InspectorToken {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  lastUsedAt?: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface InspectorTokensResponse {
  tokens: InspectorToken[];
  total: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  stack?: string;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  httpMethod?: string;
  httpPath?: string;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
}

export interface ErrorLogsResponse {
  logs: ErrorLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsData {
  userGrowth: {
    date: string;
    users: number;
    newUsers: number;
  }[];
  organizationMetrics: {
    totalOrganizations: number;
    activeOrganizations: number;
    avgMembersPerOrg: number;
    orgsByTier: {
      tier: string;
      count: number;
    }[];
  };
  revenueMetrics: {
    totalRevenue: number;
    monthlyRevenue: {
      month: string;
      revenue: number;
    }[];
  };
  usageMetrics: {
    totalTimeEntries: number;
    totalShifts: number;
    totalSwaps: number;
    avgEntriesPerDay: number;
  };
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  description: string | null;
  enabled_globally: boolean;
  enabled_for_orgs: string[] | null;
  disabled_for_orgs: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
}

export interface AdminSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  impersonatedBy: string | null;
}

export interface SessionsResponse {
  sessions: AdminSession[];
  total: number;
  limit: number;
  offset: number;
}

export interface BroadcastMessage {
  id: string;
  admin_id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  target_type: 'all' | 'organization' | 'user';
  target_ids: string[] | null;
  expires_at: string | null;
  created_at: string;
}

export interface BroadcastsResponse {
  broadcasts: BroadcastMessage[];
}

// ============================================================================
// TENANTS API
// ============================================================================

export async function fetchTenants(params?: {
  search?: string;
  status?: string;
  tier?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<TenantsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.tier) searchParams.append('tier', params.tier);
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const url = `${API_URL}/api/admin/tenants?${searchParams.toString()}`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<TenantsResponse>(response);
}

export async function suspendTenant(tenantId: string, reason?: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/tenants/${tenantId}/suspend`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function unsuspendTenant(tenantId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/tenants/${tenantId}/unsuspend`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function deleteTenant(tenantId: string, confirmation: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/tenants/${tenantId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation }),
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function updateTenant(
  tenantId: string,
  updates: {
    name?: string;
    logo?: string;
    subscriptionTier?: 'free' | 'starter' | 'pro' | 'enterprise';
  }
): Promise<{ success: boolean; organization: Partial<Tenant> }> {
  const url = `${API_URL}/api/admin/tenants/${tenantId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean; organization: Partial<Tenant> }>(response);
}

// ============================================================================
// USERS API
// ============================================================================

export async function fetchUsers(params?: {
  search?: string;
  role?: string;
  banned?: boolean;
  isAdmin?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<UsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.role) searchParams.append('role', params.role);
  if (params?.banned !== undefined) searchParams.append('banned', params.banned.toString());
  if (params?.isAdmin !== undefined) searchParams.append('is_admin', params.isAdmin.toString());
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const url = `${API_URL}/api/admin/users?${searchParams.toString()}`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<UsersResponse>(response);
}

export async function banUser(userId: string, reason?: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/users/${userId}/ban`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function unbanUser(userId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/users/${userId}/unban`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function grantAdmin(userId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/users/${userId}/grant-admin`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function revokeAdmin(userId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/users/${userId}/revoke-admin`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function updateUser(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    role?: 'admin' | null;
    emailVerified?: boolean;
  }
): Promise<{ success: boolean; user: Partial<AdminUser> }> {
  const url = `${API_URL}/api/admin/users/${userId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean; user: Partial<AdminUser> }>(response);
}

// ============================================================================
// BULK OPERATIONS API
// ============================================================================

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

export async function bulkBanUsers(
  userIds: string[],
  reason: string,
  expiresInDays = 30
): Promise<BulkOperationResult> {
  const url = `${API_URL}/api/admin/users/bulk-ban`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds, reason, expiresInDays }),
  });
  return handleResponse<BulkOperationResult>(response);
}

export async function bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult> {
  const url = `${API_URL}/api/admin/users/bulk-delete`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds }),
  });
  return handleResponse<BulkOperationResult>(response);
}

export async function bulkDeleteTenants(tenantIds: string[]): Promise<BulkOperationResult> {
  const url = `${API_URL}/api/admin/tenants/bulk-delete`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantIds }),
  });
  return handleResponse<BulkOperationResult>(response);
}

// ============================================================================
// SUBSCRIPTIONS API
// ============================================================================

export async function fetchSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  const url = `${API_URL}/api/admin/subscriptions`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<SubscriptionMetrics>(response);
}

// ============================================================================
// SYSTEM API
// ============================================================================

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const url = `${API_URL}/api/admin/system/health`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<SystemHealth>(response);
}

export async function retryFailedJob(queueName: string, jobId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/system/queues/${queueName}/jobs/${jobId}/retry`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function deleteFailedJob(queueName: string, jobId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/system/queues/${queueName}/jobs/${jobId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

// ============================================================================
// INSPECTOR TOKENS API
// ============================================================================

export async function fetchInspectorTokens(params?: {
  organizationId?: string;
  status?: string;
}): Promise<InspectorTokensResponse> {
  const searchParams = new URLSearchParams();
  if (params?.organizationId) searchParams.append('organization_id', params.organizationId);
  if (params?.status) searchParams.append('status', params.status);

  const url = `${API_URL}/api/admin/inspector-tokens?${searchParams.toString()}`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<InspectorTokensResponse>(response);
}

export async function generateInspectorToken(
  organizationId: string,
  expiresInDays: number
): Promise<{ token: InspectorToken }> {
  const url = `${API_URL}/api/admin/inspector-tokens`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, expiresInDays }),
  });
  return handleResponse<{ token: InspectorToken }>(response);
}

export async function revokeInspectorToken(tokenId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/inspector-tokens/${tokenId}/revoke`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

// ============================================================================
// AUDIT API
// ============================================================================

export async function fetchAuditLogs(params?: {
  action?: string;
  actorId?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<AuditLogsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.action) searchParams.append('action', params.action);
  if (params?.actorId) searchParams.append('actor_id', params.actorId);
  if (params?.targetType) searchParams.append('target_type', params.targetType);
  if (params?.startDate) searchParams.append('start_date', params.startDate);
  if (params?.endDate) searchParams.append('end_date', params.endDate);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const url = `${API_URL}/api/admin/audit?${searchParams.toString()}`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<AuditLogsResponse>(response);
}

// ============================================================================
// ERROR LOGS API
// ============================================================================

export async function fetchErrorLogs(params?: {
  level?: string;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<ErrorLogsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.level) searchParams.append('level', params.level);
  if (params?.source) searchParams.append('source', params.source);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const url = `${API_URL}/api/admin/errors?${searchParams.toString()}`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<ErrorLogsResponse>(response);
}

// ============================================================================
// ANALYTICS API
// ============================================================================

export async function fetchAnalytics(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsData> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.append('start_date', params.startDate);
  if (params?.endDate) searchParams.append('end_date', params.endDate);

  const url = `${API_URL}/api/admin/analytics?${searchParams.toString()}`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<AnalyticsData>(response);
}

// ============================================================================
// FEATURE FLAGS API
// ============================================================================

export async function fetchFeatureFlags(): Promise<FeatureFlagsResponse> {
  const url = `${API_URL}/api/admin/feature-flags`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<FeatureFlagsResponse>(response);
}

export async function createFeatureFlag(data: {
  flag_key: string;
  description?: string;
  enabled_globally?: boolean;
}): Promise<{ flag: FeatureFlag }> {
  const url = `${API_URL}/api/admin/feature-flags`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ flag: FeatureFlag }>(response);
}

export async function updateFeatureFlag(
  flagId: string,
  updates: {
    description?: string;
    enabled_globally?: boolean;
    enabled_for_orgs?: string[];
    disabled_for_orgs?: string[];
  }
): Promise<{ flag: FeatureFlag }> {
  const url = `${API_URL}/api/admin/feature-flags/${flagId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ flag: FeatureFlag }>(response);
}

export async function deleteFeatureFlag(flagId: string): Promise<{ message: string }> {
  const url = `${API_URL}/api/admin/feature-flags/${flagId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(response);
}

// ============================================================================
// EMAIL ACTIONS API
// ============================================================================

export async function sendPasswordReset(userId: string): Promise<{ message: string; expiresIn: string }> {
  const url = `${API_URL}/api/admin/users/${userId}/send-password-reset`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ message: string; expiresIn: string }>(response);
}

export async function resendVerificationEmail(userId: string): Promise<{ message: string; expiresIn: string }> {
  const url = `${API_URL}/api/admin/users/${userId}/resend-verification`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ message: string; expiresIn: string }>(response);
}

// ============================================================================
// BROADCASTS API
// ============================================================================

export async function fetchBroadcasts(): Promise<BroadcastsResponse> {
  const url = `${API_URL}/api/admin/broadcasts`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<BroadcastsResponse>(response);
}

export async function createBroadcast(data: {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  target_type: 'all' | 'organization' | 'user';
  target_ids?: string[];
  expires_at?: string;
}): Promise<{ broadcast: BroadcastMessage }> {
  const url = `${API_URL}/api/admin/broadcasts`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ broadcast: BroadcastMessage }>(response);
}

export async function deleteBroadcast(broadcastId: string): Promise<{ message: string }> {
  const url = `${API_URL}/api/admin/broadcasts/${broadcastId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(response);
}

// ============================================================================
// SESSIONS API
// ============================================================================

export async function fetchSessions(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  includeExpired?: boolean;
}): Promise<SessionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset !== undefined) searchParams.append('offset', params.offset.toString());
  if (params?.search) searchParams.append('search', params.search);
  if (params?.includeExpired !== undefined) searchParams.append('includeExpired', params.includeExpired.toString());

  const url = `${API_URL}/api/admin/sessions?${searchParams.toString()}`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<SessionsResponse>(response);
}

export async function revokeSession(sessionId: string): Promise<{ success: boolean }> {
  const url = `${API_URL}/api/admin/sessions/${sessionId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<{ success: boolean }>(response);
}

// ============================================================================
// BILLING OPERATIONS API
// ============================================================================

export interface BillingInvoiceRequest {
  customer_id: string;
  amount: number;
  description: string;
}

export interface BillingRefundRequest {
  payment_intent_id: string;
  amount?: number;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export interface BillingCreditRequest {
  customer_id: string;
  amount: number;
  description: string;
}

export interface BillingInvoiceResponse {
  message: string;
  invoice: Record<string, unknown>;
}

export interface BillingRefundResponse {
  message: string;
  refund: Record<string, unknown>;
}

export interface BillingCreditResponse {
  message: string;
  credit: Record<string, unknown>;
}

export async function createInvoice(data: BillingInvoiceRequest): Promise<BillingInvoiceResponse> {
  const url = `${API_URL}/api/admin/billing/invoice`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BillingInvoiceResponse>(response);
}

export async function processRefund(data: BillingRefundRequest): Promise<BillingRefundResponse> {
  const url = `${API_URL}/api/admin/billing/refund`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BillingRefundResponse>(response);
}

export async function applyCredit(data: BillingCreditRequest): Promise<BillingCreditResponse> {
  const url = `${API_URL}/api/admin/billing/credit`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BillingCreditResponse>(response);
}

// ============================================================================
// SUBSCRIPTION PLANS API
// ============================================================================

export interface SubscriptionPlan {
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
  created_at: string;
  updated_at: string;
}

export interface PlansResponse {
  plans: SubscriptionPlan[];
}

export interface CreatePlanRequest {
  code: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  billing_period: 'monthly' | 'annual';
  employee_limit?: number | null;
  included_modules?: Record<string, boolean>;
  is_active?: boolean;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string | null;
  price_cents?: number;
  currency?: string;
  billing_period?: 'monthly' | 'annual';
  employee_limit?: number | null;
  included_modules?: Record<string, boolean>;
  is_active?: boolean;
}

export async function fetchPlans(): Promise<PlansResponse> {
  const url = `${API_URL}/api/admin/plans`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<PlansResponse>(response);
}

export async function createPlan(data: CreatePlanRequest): Promise<{ plan: SubscriptionPlan }> {
  const url = `${API_URL}/api/admin/plans`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ plan: SubscriptionPlan }>(response);
}

export async function updatePlan(
  planId: string,
  updates: UpdatePlanRequest
): Promise<{ plan: SubscriptionPlan }> {
  const url = `${API_URL}/api/admin/plans/${planId}`;
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ plan: SubscriptionPlan }>(response);
}

export async function deactivatePlan(planId: string): Promise<{ message: string }> {
  const url = `${API_URL}/api/admin/plans/${planId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(response);
}

// ============================================================================
// SETTINGS API
// ============================================================================

export interface SettingsStripe {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

export interface SettingsGoCardless {
  accessToken: string;
  webhookSecret: string;
  environment: 'sandbox' | 'live';
}

export interface SettingsEmail {
  resendApiKey: string;
}

export interface SettingsPayment {
  currency: string;
}

export interface SettingsDatabase {
  url: string;
  user: string;
  password: string;
  name: string;
}

export interface SettingsRedis {
  url: string;
}

export interface SettingsAuth {
  url: string;
  secret: string;
}

export interface SettingsAdmin {
  email: string;
  password: string;
}

export interface SettingsFrontend {
  apiUrl: string;
  stripePublishableKey: string;
}

export interface AdminSettings {
  stripe: SettingsStripe;
  gocardless: SettingsGoCardless;
  email: SettingsEmail;
  payment: SettingsPayment;
  database: SettingsDatabase;
  redis: SettingsRedis;
  auth: SettingsAuth;
  admin: SettingsAdmin;
  frontend: SettingsFrontend;
}

export interface SettingsResponse {
  settings: AdminSettings;
}

export interface UpdateSettingsResponse {
  message: string;
  changedKeys: string[];
  requiresRestart: boolean;
}

export interface RestartServerResponse {
  message: string;
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const url = `${API_URL}/api/admin/settings`;
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse<SettingsResponse>(response);
}

export async function updateSettings(
  settings: Partial<AdminSettings>
): Promise<UpdateSettingsResponse> {
  const url = `${API_URL}/api/admin/settings`;
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse<UpdateSettingsResponse>(response);
}

export async function restartServer(): Promise<RestartServerResponse> {
  const url = `${API_URL}/api/admin/settings/restart`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<RestartServerResponse>(response);
}

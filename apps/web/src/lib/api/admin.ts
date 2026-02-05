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

// ============================================================================
// TENANTS API
// ============================================================================

export async function fetchTenants(params?: {
  search?: string;
  status?: string;
  tier?: string;
  page?: number;
  limit?: number;
}): Promise<TenantsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.tier) searchParams.append('tier', params.tier);
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

// ============================================================================
// USERS API
// ============================================================================

export async function fetchUsers(params?: {
  search?: string;
  role?: string;
  banned?: boolean;
  isAdmin?: boolean;
  page?: number;
  limit?: number;
}): Promise<UsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.role) searchParams.append('role', params.role);
  if (params?.banned !== undefined) searchParams.append('banned', params.banned.toString());
  if (params?.isAdmin !== undefined) searchParams.append('is_admin', params.isAdmin.toString());
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

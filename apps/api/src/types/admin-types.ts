/**
 * Admin Dashboard Type Definitions
 * Comprehensive types for Phase 6A admin endpoints and responses
 */

// ============================================================================
// PAGINATION WRAPPER
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

// ============================================================================
// TENANT MANAGEMENT TYPES
// ============================================================================

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  memberCount: number;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
}

export interface TenantListResponse extends PaginatedResponse<TenantListItem> {}

export interface TenantDetailResponse {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  memberCount: number;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  seatCount: number;
  status: 'active' | 'suspended' | 'trial';
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
  gocardlessCustomerId: string | null;
}

// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
  banned: boolean | null;
  createdAt: Date;
}

export interface UserListResponse extends PaginatedResponse<UserListItem> {}

export interface UserDetailResponse {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    memberCount: number;
  }>;
}

// ============================================================================
// SYSTEM HEALTH TYPES
// ============================================================================

export interface QueueMetrics {
  name: 'email' | 'pdf' | 'notification' | 'compliance' | 'monthly' | 'backup';
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface FailedJobSummary {
  queueName: string;
  failedCount: number;
  oldestFailedAt: Date | null;
  recentErrors: Array<{
    jobId: string;
    error: string;
    failedAt: Date;
  }>;
}

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  redis: {
    status: 'connected' | 'disconnected';
    ping: number; // milliseconds
    memory: {
      used: number;
      peak: number;
    };
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number; // milliseconds
    connectionCount: number;
  };
  queues: QueueMetrics[];
  failedJobs: FailedJobSummary[];
  uptime: number; // seconds
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AdminAuditLogQueryResult extends PaginatedResponse<AdminAuditLogEntry> {}

export interface AuditLogFilterOptions {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// SUBSCRIPTION & BILLING TYPES
// ============================================================================

export interface SubscriptionMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnRate: number; // percentage
  averageSeatsPerOrg: number;
  tierBreakdown: {
    starter: number;
    professional: number;
    enterprise: number;
  };
}

export interface SubscriptionMetricsResponse {
  timestamp: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: SubscriptionMetrics;
  trend: {
    mrrChange: number; // percentage
    arrChange: number; // percentage
    newSubscriptions: number;
    cancelledSubscriptions: number;
  };
}

// ============================================================================
// ANALYTICS & REPORTING TYPES
// ============================================================================

export interface UserGrowthDataPoint {
  date: Date;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
}

export interface RevenueTrendDataPoint {
  date: Date;
  mrr: number;
  arr: number;
  newRevenue: number;
  churnedRevenue: number;
}

export interface FeatureAdoptionMetric {
  feature: string;
  adoptionRate: number; // percentage
  activeOrganizations: number;
  totalOrganizations: number;
}

export interface AnalyticsDashboardResponse {
  timestamp: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  userGrowth: {
    data: UserGrowthDataPoint[];
    totalUsers: number;
    newUsersThisPeriod: number;
    activeUsersThisPeriod: number;
  };
  revenueTrend: {
    data: RevenueTrendDataPoint[];
    totalMrr: number;
    totalArr: number;
    periodRevenue: number;
  };
  organizationMetrics: {
    totalOrganizations: number;
    activeOrganizations: number;
    newOrganizationsThisPeriod: number;
    averageMembersPerOrg: number;
  };
  featureAdoption: FeatureAdoptionMetric[];
  topOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    memberCount: number;
    subscriptionTier: string;
    mrr: number;
  }>;
}

// ============================================================================
// ADMIN ACTION TYPES
// ============================================================================

export interface SuspendTenantRequest {
  organizationId: string;
  reason: string;
  duration?: number; // days, null = permanent
}

export interface SuspendTenantResponse {
  organizationId: string;
  status: 'active' | 'suspended';
  suspendedAt: Date;
  suspendedUntil: Date | null;
  reason: string;
}

export interface BanUserRequest {
  userId: string;
  reason: string;
  duration?: number; // days, null = permanent
}

export interface BanUserResponse {
  userId: string;
  banned: boolean;
  bannedAt: Date;
  bannedUntil: Date | null;
  reason: string;
}

export interface UpdateSubscriptionTierRequest {
  organizationId: string;
  newTier: 'starter' | 'professional' | 'enterprise';
  seatCount?: number;
}

export interface UpdateSubscriptionTierResponse {
  organizationId: string;
  previousTier: string;
  newTier: string;
  seatCount: number;
  updatedAt: Date;
}

// ============================================================================
// SYSTEM CONFIGURATION TYPES
// ============================================================================

export interface SystemConfigResponse {
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    adminDashboard: boolean;
    inspectorApi: boolean;
    paymentProcessing: boolean;
    emailNotifications: boolean;
    pdfGeneration: boolean;
  };
  limits: {
    maxOrganizations: number | null;
    maxUsersPerOrganization: number | null;
    maxShiftsPerMonth: number | null;
    sessionTimeout: number; // minutes
  };
  maintenance: {
    isEnabled: boolean;
    message: string | null;
    startTime: Date | null;
    endTime: Date | null;
  };
}

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

export interface AdminErrorResponse {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// BULK OPERATION TYPES
// ============================================================================

export interface BulkActionRequest {
  action: 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'updateTier';
  targetIds: string[];
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkActionResult {
  action: string;
  totalRequested: number;
  successful: number;
  failed: number;
  results: Array<{
    targetId: string;
    success: boolean;
    message: string;
  }>;
  timestamp: Date;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface DataExportRequest {
  dataType: 'users' | 'organizations' | 'auditLog' | 'subscriptions' | 'analytics';
  format: 'csv' | 'json' | 'xlsx';
  filters?: Record<string, unknown>;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface DataExportResponse {
  exportId: string;
  dataType: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
  rowCount: number | null;
}

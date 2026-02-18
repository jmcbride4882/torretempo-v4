/**
 * SessionsPage - Admin Session Management
 * Display active sessions, search/filter, force logout (revoke), auto-refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Monitor,
  Search,
  RefreshCw,
  LogOut,
  Clock,
  Globe,
  Smartphone,
  Shield,
  AlertTriangle,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { fetchSessions, revokeSession } from '@/lib/api/admin';
import type { AdminSession } from '@/lib/api/admin';

// Constants
const PAGE_SIZE = 50;
const AUTO_REFRESH_MS = 10_000;

/**
 * Determine if a session is expired based on expiresAt timestamp
 */
function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

/**
 * Parse user-agent string into a short readable label
 */
function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown';

  // Detect browser
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';

  // Detect non-browser clients
  if (ua.includes('curl')) return 'cURL';
  if (ua.includes('Postman')) return 'Postman';

  return 'Other';
}

/**
 * Detect if user-agent is a mobile device
 */
function isMobileAgent(ua: string | null): boolean {
  if (!ua) return false;
  return /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
}

/**
 * Format a relative time string from a date
 */
function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export default function SessionsPage() {
  const { t } = useTranslation();

  // Data state
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [page, setPage] = useState(1);

  // Modal state
  const [revokeModal, setRevokeModal] = useState<AdminSession | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Load sessions from API
  const loadSessions = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const offset = (page - 1) * PAGE_SIZE;
        const includeExpired =
          statusFilter === 'expired' || statusFilter === 'all';

        const response = await fetchSessions({
          limit: PAGE_SIZE,
          offset,
          search: searchQuery || undefined,
          includeExpired,
        });

        // Client-side filtering for status/impersonated
        let filtered = response.sessions || [];
        if (statusFilter === 'active') {
          filtered = filtered.filter((s) => !isSessionExpired(s.expiresAt));
        } else if (statusFilter === 'expired') {
          filtered = filtered.filter((s) => isSessionExpired(s.expiresAt));
        } else if (statusFilter === 'impersonated') {
          filtered = filtered.filter((s) => s.impersonatedBy !== null);
        }

        setSessions(filtered);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast.error(t('admin.toasts.failedLoadSessions'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, statusFilter, page]
  );

  // Initial load + auto-refresh
  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => loadSessions(true), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Handlers
  const handleRefresh = () => loadSessions(true);

  const handleRevoke = async () => {
    if (!revokeModal) return;

    setIsRevoking(true);
    try {
      await revokeSession(revokeModal.id);
      toast.success(t('admin.toasts.sessionRevoked', { name: revokeModal.userName }));
      setRevokeModal(null);
      loadSessions(true);
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error(t('admin.toasts.failedRevokeSession'));
    } finally {
      setIsRevoking(false);
    }
  };

  // Stats
  const activeCount = sessions.filter((s) => !isSessionExpired(s.expiresAt)).length;
  const expiredCount = sessions.filter((s) => isSessionExpired(s.expiresAt)).length;
  const impersonatedCount = sessions.filter((s) => s.impersonatedBy !== null).length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 shadow-sm">
            <Monitor className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('admin.sessions.title')}</h1>
            <p className="text-sm text-slate-500">
              {t('admin.liveMonitoring')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">{t('admin.refresh')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white pl-9 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <SelectItem value="all" className="text-slate-700">{t('admin.filters.allSessions')}</SelectItem>
            <SelectItem value="active" className="text-slate-700">{t('admin.filters.active')}</SelectItem>
            <SelectItem value="expired" className="text-slate-700">{t('admin.filters.expired')}</SelectItem>
            <SelectItem value="impersonated" className="text-slate-700">{t('admin.filters.impersonated')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      <div
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <span className="text-slate-500">
            <span className="font-medium text-slate-700">{total}</span> {t('admin.total')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-slate-500">
            <span className="font-medium text-slate-700">{activeCount}</span> {t('admin.active')}
          </span>
        </div>
        {expiredCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">{expiredCount}</span> {t('admin.expired')}
            </span>
          </div>
        )}
        {impersonatedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">{impersonatedCount}</span> {t('admin.impersonated')}
            </span>
          </div>
        )}
      </div>

      {/* Sessions grid */}
      <div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            hasFilters={searchQuery !== '' || statusFilter !== 'active'}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('active');
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                index={index}
                onRevoke={() => setRevokeModal(session)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Revoke Confirmation Modal */}
      <Dialog open={!!revokeModal} onOpenChange={() => setRevokeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('admin.sessions.forceLogout')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.sessions.forceLogoutConfirm', {
                name: revokeModal?.userName,
                email: revokeModal?.userEmail,
              })}
            </DialogDescription>
          </DialogHeader>

          {revokeModal && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{t('admin.sessions.ipAddress')}</span>
                <span className="font-mono text-slate-700">
                  {revokeModal.ipAddress || t('common.unknown')}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-slate-500">{t('admin.sessions.browser')}</span>
                <span className="text-slate-700">
                  {parseUserAgent(revokeModal.userAgent)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-slate-500">{t('admin.sessions.created')}</span>
                <span className="text-slate-700">
                  {new Date(revokeModal.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRevokeModal(null)}
              disabled={isRevoking}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? t('admin.sessions.revoking') : t('admin.sessions.forceLogout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Session Card Component
// ============================================================================

interface SessionCardProps {
  session: AdminSession;
  index: number;
  onRevoke: () => void;
}

function SessionCard({ session, onRevoke }: SessionCardProps) {
  const { t } = useTranslation();
  const expired = isSessionExpired(session.expiresAt);
  const isImpersonated = session.impersonatedBy !== null;
  const mobile = isMobileAgent(session.userAgent);
  const browser = parseUserAgent(session.userAgent);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300',
        'hover:border-slate-300 hover:shadow-md',
        expired && 'border-slate-200 bg-slate-50 opacity-70',
        isImpersonated && 'border-violet-200 bg-violet-50'
      )}
    >
      <div className="relative p-5">
        {/* Header: User info + status badge */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-sm font-semibold text-violet-700">
                {session.userName.charAt(0).toUpperCase()}
              </div>
              {isImpersonated && (
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                  <UserCog className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900">{session.userName}</h3>
              <p className="truncate text-sm text-slate-500">{session.userEmail}</p>
            </div>
          </div>

          {expired ? (
            <Badge className="border border-slate-300 bg-slate-100 text-slate-500">
              {t('admin.expired')}
            </Badge>
          ) : (
            <Badge className="border border-emerald-300 bg-emerald-50 text-emerald-700">
              {t('admin.active')}
            </Badge>
          )}
        </div>

        {/* Badges row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {session.userRole && (
            <Badge className="border border-violet-300 bg-violet-50 text-violet-700">
              <Shield className="mr-1 h-3 w-3" />
              {session.userRole}
            </Badge>
          )}
          {isImpersonated && (
            <Badge className="border border-violet-300 bg-violet-50 text-violet-700">
              <UserCog className="mr-1 h-3 w-3" />
              {t('admin.impersonated')}
            </Badge>
          )}
          <Badge className="border border-slate-200 bg-slate-50 text-slate-500">
            {mobile ? (
              <Smartphone className="mr-1 h-3 w-3" />
            ) : (
              <Monitor className="mr-1 h-3 w-3" />
            )}
            {browser}
          </Badge>
        </div>

        {/* Session details */}
        <div className="mb-4 space-y-2 text-sm">
          {session.ipAddress && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Globe className="h-3.5 w-3.5" />
                {t('admin.sessions.ipAddress')}
              </span>
              <span className="font-mono text-slate-700">{session.ipAddress}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {t('admin.sessions.created')}
            </span>
            <span className="text-slate-700" title={new Date(session.createdAt).toLocaleString()}>
              {formatRelativeTime(session.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{t('admin.sessions.lastActive')}</span>
            <span className="text-slate-700" title={new Date(session.updatedAt).toLocaleString()}>
              {formatRelativeTime(session.updatedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{t('admin.sessions.expires')}</span>
            <span
              className={cn(
                'font-medium',
                expired ? 'text-slate-500' : 'text-slate-700'
              )}
            >
              {expired
                ? new Date(session.expiresAt).toLocaleString()
                : formatRelativeTime(
                    new Date(Date.now() - (Date.now() - new Date(session.expiresAt).getTime())).toISOString()
                  ).replace(' ago', '')
              }
            </span>
          </div>
        </div>

        {/* Impersonation notice */}
        {isImpersonated && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-violet-600" />
            <span className="text-sm text-violet-700">
              {t('admin.sessions.impersonatedBy', { name: session.impersonatedBy })}
            </span>
          </div>
        )}

        {/* Force logout action */}
        {!expired && (
          <div className="border-t border-slate-200 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              className="w-full gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              {t('admin.sessions.forceLogout')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function SessionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-28 rounded bg-slate-100" />
            <div className="h-4 w-36 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-slate-100" />
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-3/4 rounded bg-slate-100" />
      </div>
      <div className="border-t border-slate-200 pt-4">
        <div className="h-8 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  const { t } = useTranslation();

  if (hasFilters) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
          <Search className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-slate-900">{t('admin.noMatchingResults')}</h3>
        <p className="mb-4 max-w-sm text-sm text-slate-500">
          {t('admin.adjustFilters')}
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          {t('admin.clearFilters')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center"
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50"
      >
        <Monitor className="h-8 w-8 text-violet-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900">{t('admin.sessions.noSessionsYet')}</h3>
      <p className="max-w-sm text-sm text-slate-500">
        {t('admin.sessions.sessionsAppearHere')}
      </p>
    </div>
  );
}

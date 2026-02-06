/**
 * SessionsPage - Admin Session Management
 * Display active sessions, search/filter, force logout (revoke), auto-refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        toast.error('Failed to load sessions');
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
      toast.success(`Session for ${revokeModal.userName} has been revoked`);
      setRevokeModal(null);
      loadSessions(true);
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 shadow-lg shadow-violet-500/10">
            <Monitor className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Sessions</h1>
            <p className="text-sm text-neutral-400">
              Live monitoring -- Updates every 10 seconds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="glass-card border-white/10 pl-9 text-white placeholder:text-neutral-500 focus:border-violet-500"
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
          <SelectTrigger className="w-[160px] glass-card border-white/10 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            <SelectItem value="all" className="text-neutral-200">All Sessions</SelectItem>
            <SelectItem value="active" className="text-neutral-200">Active</SelectItem>
            <SelectItem value="expired" className="text-neutral-200">Expired</SelectItem>
            <SelectItem value="impersonated" className="text-neutral-200">Impersonated</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{total}</span> total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{activeCount}</span> active
          </span>
        </div>
        {expiredCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-neutral-500" />
            <span className="text-neutral-400">
              <span className="font-medium text-neutral-200">{expiredCount}</span> expired
            </span>
          </div>
        )}
        {impersonatedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-neutral-400">
              <span className="font-medium text-neutral-200">{impersonatedCount}</span> impersonated
            </span>
          </div>
        )}
      </motion.div>

      {/* Sessions grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
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
            <AnimatePresence mode="popLayout">
              {sessions.map((session, index) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  index={index}
                  onRevoke={() => setRevokeModal(session)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      </motion.div>

      {/* Revoke Confirmation Modal */}
      <Dialog open={!!revokeModal} onOpenChange={() => setRevokeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Force Logout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this session for{' '}
              <strong>{revokeModal?.userName}</strong> ({revokeModal?.userEmail})?
              They will be immediately logged out.
            </DialogDescription>
          </DialogHeader>

          {revokeModal && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">IP Address</span>
                <span className="font-mono text-neutral-300">
                  {revokeModal.ipAddress || 'Unknown'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-neutral-500">Browser</span>
                <span className="text-neutral-300">
                  {parseUserAgent(revokeModal.userAgent)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-neutral-500">Created</span>
                <span className="text-neutral-300">
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : 'Force Logout'}
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

function SessionCard({ session, index, onRevoke }: SessionCardProps) {
  const expired = isSessionExpired(session.expiresAt);
  const isImpersonated = session.impersonatedBy !== null;
  const mobile = isMobileAgent(session.userAgent);
  const browser = parseUserAgent(session.userAgent);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300',
        'hover:border-white/20 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-violet-500/5',
        expired && 'border-neutral-500/20 bg-neutral-500/5 opacity-70',
        isImpersonated && 'border-amber-500/20 bg-amber-500/5'
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative p-5">
        {/* Header: User info + status badge */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 text-sm font-semibold text-white">
                {session.userName.charAt(0).toUpperCase()}
              </div>
              {isImpersonated && (
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                  <UserCog className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{session.userName}</h3>
              <p className="truncate text-sm text-neutral-500">{session.userEmail}</p>
            </div>
          </div>

          {expired ? (
            <Badge className="border border-neutral-500/30 bg-neutral-500/20 text-neutral-300">
              Expired
            </Badge>
          ) : (
            <Badge className="border border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
              Active
            </Badge>
          )}
        </div>

        {/* Badges row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {session.userRole && (
            <Badge className="border border-violet-500/30 bg-violet-500/20 text-violet-300">
              <Shield className="mr-1 h-3 w-3" />
              {session.userRole}
            </Badge>
          )}
          {isImpersonated && (
            <Badge className="border border-amber-500/30 bg-amber-500/20 text-amber-300">
              <UserCog className="mr-1 h-3 w-3" />
              Impersonated
            </Badge>
          )}
          <Badge className="border border-white/10 bg-white/5 text-neutral-400">
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
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Globe className="h-3.5 w-3.5" />
                IP Address
              </span>
              <span className="font-mono text-neutral-300">{session.ipAddress}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Clock className="h-3.5 w-3.5" />
              Created
            </span>
            <span className="text-neutral-300" title={new Date(session.createdAt).toLocaleString()}>
              {formatRelativeTime(session.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Last active</span>
            <span className="text-neutral-300" title={new Date(session.updatedAt).toLocaleString()}>
              {formatRelativeTime(session.updatedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Expires</span>
            <span
              className={cn(
                'font-medium',
                expired ? 'text-neutral-500' : 'text-neutral-300'
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
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="text-sm text-amber-300">
              Impersonated by {session.impersonatedBy}
            </span>
          </div>
        )}

        {/* Force logout action */}
        {!expired && (
          <div className="border-t border-white/5 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              className="w-full gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Force Logout
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function SessionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-5 w-28 rounded bg-white/10" />
            <div className="h-4 w-36 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </div>
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-white/10" />
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
      </div>
      <div className="border-t border-white/5 pt-4">
        <div className="h-8 w-full rounded bg-white/10" />
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
  if (hasFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-800/50">
          <Search className="h-7 w-7 text-neutral-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-white">No matching sessions</h3>
        <p className="mb-4 max-w-sm text-sm text-neutral-400">
          Try adjusting your filters or search query.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5"
        >
          Clear filters
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20"
      >
        <Monitor className="h-8 w-8 text-violet-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">No active sessions</h3>
      <p className="max-w-sm text-sm text-neutral-400">
        When users sign in, their sessions will appear here.
      </p>
    </motion.div>
  );
}

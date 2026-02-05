/**
 * AuditPage - Admin Audit Log
 * Audit log table with date filters and action filters
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  User,
  Clock,
  Globe,
  ChevronDown,
  ChevronUp,
  X,
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
import { cn } from '@/lib/utils';
import { fetchAuditLogs } from '@/lib/api/admin';
import type { AuditLogEntry } from '@/lib/api/admin';

// Action colors
const actionColors: Record<string, string> = {
  create: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  update: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-300 border-red-500/30',
  login: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  logout: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
  suspend: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  unsuspend: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  ban: 'bg-red-500/20 text-red-300 border-red-500/30',
  unban: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  grant: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  revoke: 'bg-red-500/20 text-red-300 border-red-500/30',
};

// Action options
const actionOptions = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'suspend', label: 'Suspend' },
  { value: 'ban', label: 'Ban' },
  { value: 'grant', label: 'Grant' },
  { value: 'revoke', label: 'Revoke' },
];

// Target type options
const targetTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'user', label: 'User' },
  { value: 'organization', label: 'Organization' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'token', label: 'Token' },
  { value: 'session', label: 'Session' },
];

export default function AuditPage() {
  // State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch logs
  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const response = await fetchAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });
      setLogs(response.logs || []);
      setTotal(response.total || 0);
      if (silent) toast.success('Audit logs refreshed');
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [actionFilter, targetTypeFilter, startDate, endDate, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Handlers
  const handleRefresh = () => loadLogs(true);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setActionFilter('all');
    setTargetTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = actionFilter !== 'all' || targetTypeFilter !== 'all' || !!startDate || !!endDate;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 shadow-lg shadow-indigo-500/10">
            <FileText className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Audit Log</h1>
            <p className="text-sm text-neutral-400">Track all administrative actions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'gap-1.5 rounded-lg border sm:hidden',
                showFilters || hasActiveFilters
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                  : 'border-white/5 bg-white/5 text-neutral-300'
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </motion.div>

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

      {/* Desktop Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="hidden flex-wrap items-center gap-3 sm:flex"
      >
        {/* Action filter */}
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            {actionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-neutral-200">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Target type filter */}
        <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
            <SelectValue placeholder="Target Type" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            {targetTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-neutral-200">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-[150px] glass-card border-white/10 pl-9 text-white"
              placeholder="Start date"
            />
          </div>
          <span className="text-neutral-500">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-[150px] glass-card border-white/10 pl-9 text-white"
              placeholder="End date"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-neutral-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </motion.div>

      {/* Mobile Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card overflow-hidden p-4 sm:hidden"
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">Action</label>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full glass-card border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {actionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-neutral-200">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">Target Type</label>
                <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full glass-card border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {targetTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-neutral-200">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="w-full glass-card border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="w-full glass-card border-white/10 text-white"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full gap-1 text-neutral-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-4 text-sm"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{total}</span> entries
          </span>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-neutral-400">Filtered</span>
          </div>
        )}
      </motion.div>

      {/* Audit log table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        {isLoading ? (
          <AuditTableSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {logs.map((log, index) => {
                    const isExpanded = expandedRows.has(log.id);
                    const actionKey = log.action.split('.')[0] ?? '';
                    const actionColor = actionColors[actionKey] ?? 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';

                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-white/5 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <Badge className={cn('border', actionColor)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-xs font-medium text-white">
                              {log.actorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{log.actorName}</p>
                              <p className="truncate text-xs text-neutral-500">{log.actorEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm text-white">{log.targetName || log.targetId.slice(0, 8)}</p>
                            <p className="text-xs capitalize text-neutral-500">{log.targetType}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(log.id)}
                            className="text-neutral-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Expanded details */}
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              if (!isExpanded) return null;

              return (
                <motion.div
                  key={`${log.id}-details`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-white/5 bg-white/[0.02] px-4 py-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-neutral-500">
                        <User className="h-3 w-3" />
                        Actor ID
                      </div>
                      <p className="font-mono text-sm text-neutral-300">{log.actorId}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-neutral-500">
                        <Globe className="h-3 w-3" />
                        IP Address
                      </div>
                      <p className="font-mono text-sm text-neutral-300">{log.ipAddress}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-1 text-xs text-neutral-500">User Agent</div>
                      <p className="truncate text-sm text-neutral-400">{log.userAgent}</p>
                    </div>
                    {Object.keys(log.metadata).length > 0 && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <div className="mb-1 text-xs text-neutral-500">Metadata</div>
                        <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-neutral-300">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-neutral-400 hover:text-white"
          >
            Previous
          </Button>
          <span className="text-sm text-neutral-400">
            Page <span className="font-medium text-white">{page}</span> of{' '}
            <span className="font-medium text-white">{totalPages}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-neutral-400 hover:text-white"
          >
            Next
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Skeleton
function AuditTableSkeleton() {
  return (
    <div className="p-4">
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-4">
            <div className="h-6 w-20 rounded-full bg-white/10" />
            <div className="h-8 w-8 rounded-full bg-white/10" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-3 w-24 rounded bg-white/10" />
            </div>
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="h-8 w-8 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Empty State
function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-800/50">
          <Search className="h-7 w-7 text-neutral-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-white">No matching logs</h3>
        <p className="mb-4 max-w-sm text-sm text-neutral-400">
          Try adjusting your filters to find what you're looking for.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20"
      >
        <FileText className="h-8 w-8 text-indigo-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">No audit logs yet</h3>
      <p className="max-w-sm text-sm text-neutral-400">
        Administrative actions will be recorded here for compliance.
      </p>
    </div>
  );
}

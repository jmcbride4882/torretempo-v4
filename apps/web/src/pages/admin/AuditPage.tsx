/**
 * AuditPage - Admin Audit Log
 * Audit log table with date filters and action filters
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  FileText,
  RefreshCw,
  Filter,
  Search,
  User,
  Clock,
  Globe,
  ChevronDown,
  ChevronUp,
  X,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { fetchAuditLogs } from '@/lib/api/admin';
import type { AuditLogEntry } from '@/lib/api/admin';

// Action colors
const actionColors: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update: 'bg-blue-50 text-blue-700 border-blue-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  login: 'bg-violet-50 text-violet-700 border-violet-200',
  logout: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  suspend: 'bg-amber-50 text-amber-700 border-amber-200',
  unsuspend: 'bg-teal-50 text-teal-700 border-teal-200',
  ban: 'bg-red-50 text-red-700 border-red-200',
  unban: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  grant: 'bg-amber-50 text-amber-700 border-amber-200',
  revoke: 'bg-red-50 text-red-700 border-red-200',
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
  const { t } = useTranslation();

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

  // Export state
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (targetTypeFilter !== 'all') params.set('targetType', targetTypeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const url = `/api/admin/audit/export${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('admin.audit.title')}</h1>
            <p className="text-sm text-zinc-500">Track all administrative actions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'gap-1.5 rounded-lg border sm:hidden',
              showFilters || hasActiveFilters
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-zinc-200 bg-zinc-50 text-zinc-700'
            )}
          >
            <Filter className="h-4 w-4" />
            {t('common.filter')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
          >
            <Download className={cn('h-4 w-4', isExporting && 'animate-bounce')} />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : t('admin.exportCsv')}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('admin.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden flex-wrap items-center gap-3 sm:flex">
        {/* Action filter */}
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
            <SelectValue placeholder={t('admin.audit.action')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            {actionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-zinc-700">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Target type filter */}
        <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
            <SelectValue placeholder={t('admin.audit.target')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            {targetTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-zinc-700">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(v) => { setStartDate(v); setPage(1); }}
          onEndDateChange={(v) => { setEndDate(v); setPage(1); }}
          onClear={() => { setStartDate(''); setEndDate(''); setPage(1); }}
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-zinc-500 hover:text-zinc-900"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Mobile Filters */}
      {showFilters && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden p-4 sm:hidden">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t('admin.audit.action')}</label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                  {actionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-zinc-700">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t('admin.audit.target')}</label>
              <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                  {targetTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-zinc-700">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t('admin.audit.dateRange')}</label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(v) => { setStartDate(v); setPage(1); }}
                onEndDateChange={(v) => { setEndDate(v); setPage(1); }}
                onClear={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                className="w-full justify-start"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full gap-1 text-zinc-500 hover:text-zinc-900"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{total}</span> entries
          </span>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-zinc-500">Filtered</span>
          </div>
        )}
      </div>

      {/* Audit log table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <AuditTableSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {t('admin.audit.action')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {t('admin.audit.actor')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {t('admin.audit.target')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  const actionKey = log.action.split('.')[0] ?? '';
                  const actionColor = actionColors[actionKey] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200';

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="px-4 py-3">
                        <Badge className={cn('border', actionColor)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                            {log.actorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900">{log.actorName}</p>
                            <p className="truncate text-xs text-zinc-500">{log.actorEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-900">{log.targetName || log.targetId.slice(0, 8)}</p>
                          <p className="text-xs capitalize text-zinc-500">{log.targetType}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(log.id)}
                          className="text-zinc-500 hover:text-zinc-900"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded details */}
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              if (!isExpanded) return null;

              return (
                <div
                  key={`${log.id}-details`}
                  className="border-b border-zinc-100 bg-zinc-50 px-4 py-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500">
                        <User className="h-3 w-3" />
                        Actor ID
                      </div>
                      <p className="font-mono text-sm text-zinc-700">{log.actorId}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500">
                        <Globe className="h-3 w-3" />
                        IP Address
                      </div>
                      <p className="font-mono text-sm text-zinc-700">{log.ipAddress}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-1 text-xs text-zinc-500">User Agent</div>
                      <p className="truncate text-sm text-zinc-500">{log.userAgent}</p>
                    </div>
                    {Object.keys(log.metadata).length > 0 && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <div className="mb-1 text-xs text-zinc-500">Metadata</div>
                        <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </div>
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
            <div className="h-6 w-20 rounded-full bg-zinc-100" />
            <div className="h-8 w-8 rounded-full bg-zinc-100" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 rounded bg-zinc-100" />
              <div className="h-3 w-24 rounded bg-zinc-100" />
            </div>
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-8 w-8 rounded bg-zinc-100" />
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
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
          <Search className="h-7 w-7 text-zinc-400" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">No matching logs</h3>
        <p className="mb-4 max-w-sm text-sm text-zinc-500">
          Try adjusting your filters to find what you're looking for.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
        <FileText className="h-8 w-8 text-amber-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-zinc-900">No audit logs yet</h3>
      <p className="max-w-sm text-sm text-zinc-500">
        Administrative actions will be recorded here for compliance.
      </p>
    </div>
  );
}

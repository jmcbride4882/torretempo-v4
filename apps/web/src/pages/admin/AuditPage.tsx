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
  update: 'bg-primary-50 text-primary-700 border-primary-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  login: 'bg-primary-50 text-primary-700 border-primary-200',
  logout: 'bg-kresna-light text-kresna-gray-dark border-kresna-border',
  suspend: 'bg-primary-50 text-primary-700 border-primary-200',
  unsuspend: 'bg-teal-50 text-teal-700 border-teal-200',
  ban: 'bg-red-50 text-red-700 border-red-200',
  unban: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  grant: 'bg-primary-50 text-primary-700 border-primary-200',
  revoke: 'bg-red-50 text-red-700 border-red-200',
};

// Action options (labelKey resolved at render time via t())
const actionOptions = [
  { value: 'all', labelKey: 'admin.filters.allActions' },
  { value: 'create', labelKey: 'admin.filters.create' },
  { value: 'update', labelKey: 'admin.filters.update' },
  { value: 'delete', labelKey: 'admin.filters.delete' },
  { value: 'login', labelKey: 'admin.filters.login' },
  { value: 'suspend', labelKey: 'admin.filters.suspend' },
  { value: 'ban', labelKey: 'admin.filters.ban' },
  { value: 'grant', labelKey: 'admin.filters.grant' },
  { value: 'revoke', labelKey: 'admin.filters.revoke' },
];

// Target type options (labelKey resolved at render time via t())
const targetTypeOptions = [
  { value: 'all', labelKey: 'admin.filters.allTypes' },
  { value: 'user', labelKey: 'admin.filters.user' },
  { value: 'organization', labelKey: 'admin.filters.organization' },
  { value: 'subscription', labelKey: 'admin.filters.subscription' },
  { value: 'token', labelKey: 'admin.filters.token' },
  { value: 'session', labelKey: 'admin.filters.session' },
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
      if (silent) toast.success(t('admin.toasts.auditRefreshed'));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error(t('admin.toasts.failedLoadAudit'));
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
      toast.success(t('admin.toasts.auditExportSuccess'));
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error(t('admin.toasts.failedExportAudit'));
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 border border-primary-200">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-charcoal sm:text-2xl">{t('admin.audit.title')}</h1>
            <p className="text-sm text-kresna-gray">{t('admin.audit.subtitle')}</p>
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
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-kresna-border bg-kresna-light text-kresna-gray-dark'
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
            className="gap-1.5 rounded-lg border border-kresna-border bg-kresna-light text-kresna-gray-dark hover:bg-kresna-light"
          >
            <Download className={cn('h-4 w-4', isExporting && 'animate-bounce')} />
            <span className="hidden sm:inline">{isExporting ? t('admin.exporting') : t('admin.exportCsv')}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-kresna-border bg-kresna-light text-kresna-gray-dark hover:bg-kresna-light"
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
          <SelectTrigger className="w-[140px] rounded-xl border border-kresna-border bg-white shadow-sm text-charcoal">
            <SelectValue placeholder={t('admin.audit.action')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-kresna-border bg-white shadow-sm">
            {actionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-kresna-gray-dark">
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Target type filter */}
        <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] rounded-xl border border-kresna-border bg-white shadow-sm text-charcoal">
            <SelectValue placeholder={t('admin.audit.target')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-kresna-border bg-white shadow-sm">
            {targetTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-kresna-gray-dark">
                {t(opt.labelKey)}
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
            className="gap-1 text-kresna-gray hover:text-charcoal"
          >
            <X className="h-3.5 w-3.5" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      {/* Mobile Filters */}
      {showFilters && (
        <div className="rounded-xl border border-kresna-border bg-white shadow-sm overflow-hidden p-4 sm:hidden">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-kresna-gray">{t('admin.audit.action')}</label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full rounded-xl border border-kresna-border bg-white shadow-sm text-charcoal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-kresna-border bg-white shadow-sm">
                  {actionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-kresna-gray-dark">
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-kresna-gray">{t('admin.audit.target')}</label>
              <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full rounded-xl border border-kresna-border bg-white shadow-sm text-charcoal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-kresna-border bg-white shadow-sm">
                  {targetTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-kresna-gray-dark">
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-kresna-gray">{t('admin.audit.dateRange')}</label>
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
                className="w-full gap-1 text-kresna-gray hover:text-charcoal"
              >
                <X className="h-3.5 w-3.5" />
                {t('admin.clearFilters')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary-500" />
          <span className="text-kresna-gray">
            <span className="font-medium text-kresna-gray-dark">{total}</span> {t('admin.audit.entries')}
          </span>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-primary-600" />
            <span className="text-kresna-gray">{t('admin.audit.filtered')}</span>
          </div>
        )}
      </div>

      {/* Audit log table */}
      <div className="rounded-xl border border-kresna-border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <AuditTableSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-kresna-border bg-kresna-light">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-kresna-gray">
                    {t('admin.audit.action')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-kresna-gray">
                    {t('admin.audit.actor')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-kresna-gray">
                    {t('admin.audit.target')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-kresna-gray">
                    {t('admin.audit.time')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-kresna-gray">
                    {t('admin.audit.details')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  const actionKey = log.action.split('.')[0] ?? '';
                  const actionColor = actionColors[actionKey] ?? 'bg-kresna-light text-kresna-gray-dark border-kresna-border';

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-kresna-border hover:bg-kresna-light"
                    >
                      <td className="px-4 py-3">
                        <Badge className={cn('border', actionColor)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                            {log.actorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-charcoal">{log.actorName}</p>
                            <p className="truncate text-xs text-kresna-gray">{log.actorEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm text-charcoal">{log.targetName || log.targetId.slice(0, 8)}</p>
                          <p className="text-xs capitalize text-kresna-gray">{log.targetType}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-kresna-gray">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(log.id)}
                          className="text-kresna-gray hover:text-charcoal"
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
                  className="border-b border-kresna-border bg-kresna-light px-4 py-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-kresna-gray">
                        <User className="h-3 w-3" />
                        {t('admin.audit.actorId')}
                      </div>
                      <p className="font-mono text-sm text-kresna-gray-dark">{log.actorId}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-kresna-gray">
                        <Globe className="h-3 w-3" />
                        {t('admin.audit.ipAddress')}
                      </div>
                      <p className="font-mono text-sm text-kresna-gray-dark">{log.ipAddress}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-1 text-xs text-kresna-gray">{t('admin.audit.userAgent')}</div>
                      <p className="truncate text-sm text-kresna-gray">{log.userAgent}</p>
                    </div>
                    {Object.keys(log.metadata).length > 0 && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <div className="mb-1 text-xs text-kresna-gray">{t('admin.audit.metadata')}</div>
                        <pre className="overflow-x-auto rounded-lg bg-kresna-light p-3 text-xs text-kresna-gray-dark">
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
            <div className="h-6 w-20 rounded-full bg-kresna-light" />
            <div className="h-8 w-8 rounded-full bg-kresna-light" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 rounded bg-kresna-light" />
              <div className="h-3 w-24 rounded bg-kresna-light" />
            </div>
            <div className="h-4 w-24 rounded bg-kresna-light" />
            <div className="h-8 w-8 rounded bg-kresna-light" />
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
  const { t } = useTranslation();

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-kresna-light">
          <Search className="h-7 w-7 text-kresna-gray" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-charcoal">{t('admin.noMatchingResults')}</h3>
        <p className="mb-4 max-w-sm text-sm text-kresna-gray">
          {t('admin.adjustFilters')}
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-kresna-border text-kresna-gray-dark hover:bg-kresna-light"
        >
          {t('admin.clearFilters')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
        <FileText className="h-8 w-8 text-primary-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-charcoal">{t('admin.audit.noLogsYet')}</h3>
      <p className="max-w-sm text-sm text-kresna-gray">
        {t('admin.audit.logsAppearHere')}
      </p>
    </div>
  );
}

/**
 * ErrorLogsPage - Admin Error Logs
 * Real-time application error monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  RefreshCw,
  XCircle,
  AlertCircle,
  Info,
  Clock,
  Code,
  Filter,
  Search,
  X,
  Download,
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { fetchErrorLogs } from '@/lib/api/admin';
import type { ErrorLog } from '@/lib/api/admin';

// Level badge colors
const levelColors = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

// Level icons
const levelIcons = {
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export default function ErrorLogsPage() {
  const { t } = useTranslation();

  // State
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [_isLoading, setIsLoading] = useState(true); // TODO: Add loading skeleton UI
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch errors from real API
  const loadErrors = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const response = await fetchErrorLogs({
          level: levelFilter !== 'all' ? levelFilter : undefined,
          source: sourceFilter !== 'all' ? sourceFilter : undefined,
          search: searchQuery || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit,
        });
        setErrors(response.logs || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching error logs:', error);
        toast.error(t('admin.toasts.failedLoadErrors'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [levelFilter, sourceFilter, searchQuery, startDate, endDate, page]
  );

  useEffect(() => {
    loadErrors();
    // Auto-refresh every 10 seconds for live data
    const interval = setInterval(() => loadErrors(true), 10000);
    return () => clearInterval(interval);
  }, [loadErrors]);

  // Handlers
  const handleRefresh = () => loadErrors(true);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const url = `/api/admin/errors/export${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `error-logs-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success(t('admin.toasts.exportSuccess'));
    } catch (error) {
      toast.error(t('admin.toasts.failedExportErrors'));
    } finally {
      setIsExporting(false);
    }
  };

  // Stats (from loaded errors)
  const errorCount = errors.filter((e) => e.level === 'error').length;
  const warningCount = errors.filter((e) => e.level === 'warning').length;
  const totalPages = Math.ceil(total / limit);

  // Active filter detection + clear
  const hasActiveFilters = levelFilter !== 'all' || sourceFilter !== 'all' || !!startDate || !!endDate || !!searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
    setLevelFilter('all');
    setSourceFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Static source options (can be expanded based on backend values)
  const sources = ['api', 'web', 'system', 'queue', 'database'];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('admin.errors.title')}</h1>
            <p className="text-sm text-zinc-500">
              {t('admin.liveMonitoring')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            >
              <Download className={cn('h-4 w-4', isExporting && 'animate-bounce')} />
              <span className="hidden sm:inline">{isExporting ? t('admin.exporting') : t('admin.exportCsv')}</span>
            </Button>
          </div>

          <div>
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
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Row 1: Search + dropdowns */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="rounded-xl border border-zinc-200 bg-white pl-9 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500"
            />
          </div>

          {/* Level filter */}
          <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] rounded-xl border border-zinc-200 bg-white text-zinc-900">
              <SelectValue placeholder={t('admin.errors.severity')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-zinc-200 bg-white">
              <SelectItem value="all" className="text-zinc-700">
                {t('admin.filters.allLevels')}
              </SelectItem>
              <SelectItem value="error" className="text-zinc-700">
                {t('admin.filters.error')}
              </SelectItem>
              <SelectItem value="warning" className="text-zinc-700">
                {t('admin.filters.warning')}
              </SelectItem>
              <SelectItem value="info" className="text-zinc-700">
                {t('admin.filters.info')}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Source filter */}
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] rounded-xl border border-zinc-200 bg-white text-zinc-900">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-zinc-200 bg-white">
              <SelectItem value="all" className="text-zinc-700">
                {t('admin.filters.allSources')}
              </SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source} className="text-zinc-700">
                  {source}
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

          {/* Clear all filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 shrink-0 text-zinc-500 hover:text-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
              {t('admin.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm sm:gap-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{errorCount}</span> {t('admin.errors.errorsLabel')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{warningCount}</span> {t('admin.errors.warningsLabel')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-400" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{errors.length}</span> {t('common.total')}
          </span>
        </div>
      </div>

      {/* Error list */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">{t('admin.errors.title')}</h2>

        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 text-center">
            <Filter className="mb-3 h-8 w-8 text-zinc-400" />
            <p className="text-sm text-zinc-500">{t('admin.errors.noErrors')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => {
              const Icon = levelIcons[error.level];
              return (
                <div
                  key={error.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          error.level === 'error' && 'bg-red-100',
                          error.level === 'warning' && 'bg-amber-100',
                          error.level === 'info' && 'bg-blue-100'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-zinc-900">{t('admin.errors.message')}: {error.message}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                          <Code className="h-3 w-3" />
                          <span>{error.source}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{t('admin.errors.timestamp')}: {new Date(error.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={cn('border', levelColors[error.level])}>
                      {error.level}
                    </Badge>
                  </div>

                  {error.stack && (
                    <div className="rounded-lg bg-zinc-100 p-3">
                      <pre className="overflow-x-auto text-xs text-zinc-500">
                        <code>{error.stack.split('\n').slice(0, 2).join('\n')}</code>
                      </pre>
                    </div>
                   )}
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

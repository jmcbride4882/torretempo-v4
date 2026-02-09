/**
 * ErrorLogsPage - Admin Error Logs
 * Real-time application error monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Mock data removed - using real API

// Level badge colors
const levelColors = {
  error: 'bg-red-500/20 text-red-300 border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

// Level icons
const levelIcons = {
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export default function ErrorLogsPage() {
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
        toast.error('Failed to load error logs');
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
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Failed to export error logs');
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600/20 to-orange-600/20 shadow-lg shadow-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Error Logs</h1>
            <p className="text-sm text-neutral-400">
              Live monitoring • Updates every 10 seconds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <Download className={cn('h-4 w-4', isExporting && 'animate-bounce')} />
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {/* Row 1: Search + dropdowns */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search errors..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="glass-card border-white/10 pl-9 text-white placeholder:text-neutral-500 focus:border-red-500"
            />
          </div>

          {/* Level filter */}
          <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              <SelectItem value="all" className="text-neutral-200">
                All Levels
              </SelectItem>
              <SelectItem value="error" className="text-neutral-200">
                Error
              </SelectItem>
              <SelectItem value="warning" className="text-neutral-200">
                Warning
              </SelectItem>
              <SelectItem value="info" className="text-neutral-200">
                Info
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Source filter */}
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              <SelectItem value="all" className="text-neutral-200">
                All Sources
              </SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source} className="text-neutral-200">
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
              className="gap-1 shrink-0 text-neutral-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{errorCount}</span> errors
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{warningCount}</span> warnings
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-neutral-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{errors.length}</span> total
          </span>
        </div>
      </motion.div>

      {/* Error list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Errors</h2>

        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <Filter className="mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">No errors match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {errors.map((error, index) => {
                const Icon = levelIcons[error.level];
                return (
                  <motion.div
                    key={error.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg',
                            error.level === 'error' && 'bg-red-500/20',
                            error.level === 'warning' && 'bg-amber-500/20',
                            error.level === 'info' && 'bg-blue-500/20'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{error.message}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                            <Code className="h-3 w-3" />
                            <span>{error.source}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(error.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={cn('border', levelColors[error.level])}>
                        {error.level}
                      </Badge>
                    </div>

                    {error.stack && (
                      <div className="rounded-lg bg-black/30 p-3">
                        <pre className="overflow-x-auto text-xs text-neutral-400">
                          <code>{error.stack.split('\n').slice(0, 2).join('\n')}</code>
                        </pre>
                      </div>
                     )}
                  </motion.div>
                );
              })}
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
          limit={limit}
          onPageChange={setPage}
        />
      </motion.div>
    </div>
  );
}

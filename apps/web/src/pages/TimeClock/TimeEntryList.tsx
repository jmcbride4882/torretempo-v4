/**
 * TimeEntryList - Main Time Clock Page
 * Shows active entry with live duration, filters, entry history grouped by date, and summary stats
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Coffee,
  Play,
  Square,
  ChevronDown,
  RefreshCw,
  Filter,
  Calendar,
  Timer,
  Smartphone,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import {
  fetchActiveTimeEntry,
  fetchTimeEntries,
  fetchBreaks,
  startBreak,
  endBreak,
} from '@/lib/api/time-entries';
import type { TimeEntry, BreakEntry, TimeEntryFilters, ClockMethod } from '@/lib/api/time-entries';
import { ClockInSheet } from '@/components/time-clock/ClockInSheet';
import { ClockOutSheet } from '@/components/time-clock/ClockOutSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type StatusFilter = 'all' | 'completed' | 'disputed';

interface GroupedEntries {
  date: string;
  label: string;
  entries: TimeEntry[];
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVAL = 30000; // 30 seconds
const ENTRIES_PER_PAGE = 50;

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(minutes: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (minutes < 60) {
    return t('clock.durationMin', { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? t('clock.durationHourMin', { hours, mins }) : t('clock.durationHour', { hours });
}

function formatLiveDuration(minutes: number): { hours: number; mins: number } {
  return {
    hours: Math.floor(minutes / 60),
    mins: minutes % 60,
  };
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

function formatDateLabel(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t('clock.today');
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return t('clock.yesterday');
  }
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getDateRange(filter: DateFilter): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function groupEntriesByDate(entries: TimeEntry[], t: (key: string) => string): GroupedEntries[] {
  if (!Array.isArray(entries)) {
    console.error('groupEntriesByDate received non-array:', entries);
    return [];
  }

  const groups: Record<string, TimeEntry[]> = {};

  entries.forEach((entry) => {
    const date = entry.entry_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([date, entries]) => ({
      date,
      label: formatDateLabel(date, t),
      entries: entries.sort(
        (a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
      ),
    }));
}

function getMethodIcon(method: ClockMethod): React.ReactNode {
  switch (method) {
    case 'nfc':
      return <Smartphone className="h-3 w-3" />;
    case 'qr':
      return <Square className="h-3 w-3" />;
    case 'pin':
      return <span className="text-[10px] font-bold">PIN</span>;
    default:
      return <Smartphone className="h-3 w-3" />;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

function ActiveEntryCard({
  entry,
  activeBreak,
  onClockOut,
  onStartBreak,
  onEndBreak,
  breakLoading,
}: {
  entry: TimeEntry;
  activeBreak: BreakEntry | null;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  breakLoading: boolean;
}) {
  const { t } = useTranslation();
  const [durationMinutes, setDurationMinutes] = useState(0);

  useEffect(() => {
    const updateDuration = () => {
      const clockInTime = Date.parse(entry.clock_in);
      const now = Date.now();
      const minutes = Math.floor((now - clockInTime) / 60000);
      setDurationMinutes(minutes);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [entry.clock_in]);

  const { hours, mins } = formatLiveDuration(durationMinutes);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
            </div>
            <span className="text-sm font-medium text-emerald-700">{t('clock.activeShift')}</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tabular-nums text-zinc-900">{hours}</span>
            <span className="text-lg text-zinc-500">{t('clock.hours')}</span>
            <span className="text-4xl font-bold tabular-nums text-zinc-900 ml-2">{mins}</span>
            <span className="text-lg text-zinc-500">{t('clock.minutes')}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{t('clock.startedAt')} {formatTime(entry.clock_in)}</span>
            </div>
            {entry.clock_in_location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {entry.clock_in_location.lat.toFixed(4)}, {entry.clock_in_location.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {activeBreak && (
            <div className="flex items-center gap-2 pt-2">
              <Coffee className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-600">
                {t('clock.onBreak', { type: activeBreak.break_type })}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {activeBreak ? (
            <Button
              onClick={onEndBreak}
              disabled={breakLoading}
              size="sm"
              className="gap-1.5 bg-amber-600 hover:bg-amber-700"
            >
              {breakLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Coffee className="h-4 w-4" />
              )}
              {t('clock.endBreak')}
            </Button>
          ) : (
            <Button
              onClick={onStartBreak}
              disabled={breakLoading}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              {breakLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Coffee className="h-4 w-4" />
              )}
              {t('clock.startBreak')}
            </Button>
          )}

          <Button
            onClick={onClockOut}
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700"
          >
            <Square className="h-4 w-4" />
            {t('clock.clockOut')}
          </Button>
        </div>
      </div>

      {entry.linked_shift_id && (
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('clock.shiftProgress')}</span>
            <span>{Math.min(100, Math.round((durationMinutes / 480) * 100))}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
              style={{ width: `${Math.min(100, (durationMinutes / 480) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBar({
  dateFilter,
  statusFilter,
  onDateFilterChange,
  onStatusFilterChange,
  onApply,
  loading,
}: {
  dateFilter: DateFilter;
  statusFilter: StatusFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onApply: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();

  const dateFilters: { id: DateFilter; label: string }[] = [
    { id: 'today', label: t('clock.today') },
    { id: 'week', label: t('clock.thisWeek') },
    { id: 'month', label: t('clock.thisMonth') },
    { id: 'custom', label: t('clock.custom') },
  ];

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: t('common.all') },
    { id: 'completed', label: t('clock.completed') },
    { id: 'disputed', label: t('clock.disputed') },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {t('clock.dateRange')}
        </label>
        <div className="flex flex-wrap gap-2">
          {dateFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onDateFilterChange(filter.id)}
              disabled={filter.id === 'custom'}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                dateFilter === filter.id
                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900',
                filter.id === 'custom' && 'opacity-50 cursor-not-allowed'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {t('clock.status')}
        </label>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onStatusFilterChange(filter.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                statusFilter === filter.id
                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onApply} disabled={loading} size="sm" className="w-full sm:w-auto">
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Filter className="h-4 w-4 mr-2" />
        )}
        {t('clock.applyFilters')}
      </Button>
    </div>
  );
}

function EntryCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: TimeEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const duration = entry.total_minutes ?? 0;

  const statusConfig = {
    active: { label: t('clock.active'), color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completed: {
      label: entry.is_verified ? t('clock.verified') : t('clock.pending'),
      color: entry.is_verified
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200',
    },
    disputed: { label: t('clock.disputed'), color: 'bg-red-50 text-red-700 border-red-200' },
  };

  const status = statusConfig[entry.status] || statusConfig.completed;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-zinc-900 font-medium">
              <span>{formatTime(entry.clock_in)}</span>
              <span className="text-zinc-400">→</span>
              <span>{entry.clock_out ? formatTime(entry.clock_out) : '...'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary" className="text-xs gap-1">
                <Timer className="h-3 w-3" />
                {formatDuration(duration, t)}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                {getMethodIcon(entry.clock_in_method)}
                <MapPin className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>

          <Badge variant="outline" className={cn('text-xs border', status.color)}>
            {entry.status === 'completed' && entry.is_verified ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : entry.status === 'disputed' ? (
              <AlertCircle className="h-3 w-3 mr-1" />
            ) : null}
            {status.label}
          </Badge>
        </div>

        <ChevronDown className={cn('h-5 w-5 text-zinc-400 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-zinc-100 space-y-4">
          {entry.break_minutes > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                <Coffee className="h-4 w-4" />
                <span>{t('clock.breaks')}: {formatDuration(entry.break_minutes, t)}</span>
              </div>
            </div>
          )}

          {entry.notes && (
            <div className="pt-2">
              <p className="text-sm text-zinc-500">{entry.notes}</p>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{t('clock.locations')}</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400">{t('clock.clockIn')}:</span>
                <p className="text-zinc-600 font-mono mt-0.5">
                  {entry.clock_in_location
                    ? `${entry.clock_in_location.lat.toFixed(5)}, ${entry.clock_in_location.lng.toFixed(5)}`
                    : t('common.notAvailable')}
                </p>
              </div>
              {entry.clock_out_location && (
                <div>
                  <span className="text-zinc-400">{t('clock.clockOut')}:</span>
                  <p className="text-zinc-600 font-mono mt-0.5">
                    {entry.clock_out_location.lat.toFixed(5)},{' '}
                    {entry.clock_out_location.lng.toFixed(5)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStats({ entries }: { entries: TimeEntry[] }) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEntries = entries.filter(
      (e) => new Date(e.entry_date) >= weekStart && e.status === 'completed'
    );

    const totalWeekMinutes = weekEntries.reduce((sum, e) => sum + (e.total_minutes ?? 0), 0);
    const totalBreakMinutes = weekEntries.reduce((sum, e) => sum + e.break_minutes, 0);

    const uniqueDays = new Set(weekEntries.map((e) => e.entry_date)).size;
    const avgPerDay = uniqueDays > 0 ? totalWeekMinutes / uniqueDays : 0;

    const breakPercentage =
      totalWeekMinutes > 0
        ? Math.round((totalBreakMinutes / (totalWeekMinutes + totalBreakMinutes)) * 100)
        : 0;

    return {
      weekHours: (totalWeekMinutes / 60).toFixed(1),
      avgPerDay: (avgPerDay / 60).toFixed(1),
      breakPercentage,
    };
  }, [entries]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sticky bottom-0 pb-safe">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-900">{stats.weekHours}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t('clock.thisWeek')}</p>
        </div>
        <div className="text-center border-x border-zinc-200">
          <p className="text-2xl font-bold text-zinc-900">{stats.avgPerDay}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t('clock.avgPerDay')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-900">{stats.breakPercentage}%</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t('clock.breakTime')}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onClockIn }: { onClockIn: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
        <Clock className="h-8 w-8 text-primary-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-zinc-900">{t('clock.noEntries')}</h3>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        {t('clock.noEntriesDesc')}
      </p>
      <Button onClick={onClockIn} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
        <Play className="h-4 w-4" />
        {t('clock.clockIn')}
      </Button>
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-zinc-200 rounded w-32" />
          <div className="h-4 bg-zinc-100 rounded w-24" />
        </div>
        <div className="h-6 bg-zinc-100 rounded w-20" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function TimeEntryList() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { organization } = useOrganization();
  const orgSlug = slug || organization?.slug || '';

  // State
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [activeBreak, setActiveBreak] = useState<BreakEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sheets
  const [showClockIn, setShowClockIn] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);

  // Fetch active entry
  const fetchActive = useCallback(async () => {
    if (!orgSlug) return;

    try {
      const entry = await fetchActiveTimeEntry(orgSlug);
      setActiveEntry(entry);

      if (entry) {
        try {
          const breaksResponse = await fetchBreaks(orgSlug, entry.id);
          const active = breaksResponse.breaks.find((b) => b.break_end === null);
          setActiveBreak(active || null);
        } catch {
          setActiveBreak(null);
        }
      } else {
        setActiveBreak(null);
      }
    } catch {
      setActiveEntry(null);
      setActiveBreak(null);
    }
  }, [orgSlug]);

  // Fetch entries with filters
  const fetchEntries = useCallback(
    async (silent = false) => {
      if (!orgSlug) return;

      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);

      try {
        const { start, end } = getDateRange(dateFilter);

        const filters: TimeEntryFilters = {
          start_date: start,
          end_date: end,
          limit: ENTRIES_PER_PAGE,
        };

        if (statusFilter !== 'all') {
          filters.status = statusFilter;
        }

        const response = await fetchTimeEntries(orgSlug, filters);
        setEntries(Array.isArray(response?.time_entries) ? response.time_entries : []);
      } catch {
        setError(t('clock.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgSlug, dateFilter, statusFilter, t]
  );

  // Initial load
  useEffect(() => {
    fetchActive();
    fetchEntries();
  }, [fetchActive, fetchEntries]);

  // Poll for active entry updates
  useEffect(() => {
    const interval = setInterval(fetchActive, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActive]);

  // Group entries by date
  const groupedEntries = useMemo(() => groupEntriesByDate(entries, t), [entries, t]);

  // Toggle entry expansion
  const toggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle break actions
  const handleStartBreak = async () => {
    if (!orgSlug || !activeEntry) return;

    setBreakLoading(true);
    try {
      const response = await startBreak(orgSlug, activeEntry.id, { break_type: 'paid' });
      setActiveBreak(response.break);
    } catch {
      setError(t('clock.breakError'));
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!orgSlug || !activeEntry || !activeBreak) return;

    setBreakLoading(true);
    try {
      await endBreak(orgSlug, activeEntry.id, activeBreak.id);
      setActiveBreak(null);
      fetchActive();
    } catch {
      setError(t('clock.breakError'));
    } finally {
      setBreakLoading(false);
    }
  };

  const handleClockInClose = () => {
    setShowClockIn(false);
    fetchActive();
    fetchEntries(true);
  };

  const handleClockOutClose = () => {
    setShowClockOut(false);
    fetchActive();
    fetchEntries(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Clock className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('clock.title')}</h1>
            <p className="text-sm text-zinc-500">{t('clock.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEntries(true)}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>

          {!activeEntry && (
            <Button
              onClick={() => setShowClockIn(true)}
              size="sm"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">{t('clock.clockIn')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Active entry card */}
      {activeEntry && (
        <ActiveEntryCard
          entry={activeEntry}
          activeBreak={activeBreak}
          onClockOut={() => setShowClockOut(true)}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
          breakLoading={breakLoading}
        />
      )}

      {/* Filter bar */}
      <FilterBar
        dateFilter={dateFilter}
        statusFilter={statusFilter}
        onDateFilterChange={setDateFilter}
        onStatusFilterChange={setStatusFilter}
        onApply={() => fetchEntries()}
        loading={loading}
      />

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              fetchEntries();
            }}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            {t('common.retry')}
          </Button>
        </div>
      )}

      {/* Entry list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <EntrySkeleton key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState onClockIn={() => setShowClockIn(true)} />
      ) : (
        <div className="space-y-6">
          {groupedEntries.map((group) => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-500">{group.label}</h3>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEntries.has(entry.id)}
                    onToggle={() => toggleEntry(entry.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {entries.length > 0 && <SummaryStats entries={entries} />}

      {/* Sheets */}
      {slug && (
        <>
          <ClockInSheet isOpen={showClockIn} onClose={handleClockInClose} organizationSlug={slug} />
          <ClockOutSheet
            isOpen={showClockOut}
            onClose={handleClockOutClose}
            organizationSlug={slug}
            activeEntry={activeEntry}
          />
        </>
      )}
    </div>
  );
}

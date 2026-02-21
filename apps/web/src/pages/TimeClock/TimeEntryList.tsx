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
  const progressPercent = Math.min(100, Math.round((durationMinutes / 480) * 100));

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-card">
      {/* Live status header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
        </div>
        <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">
          {t('clock.activeShift')}
        </span>
      </div>

      {/* Huge live timer */}
      <div className="flex items-baseline justify-center gap-2 mb-6">
        <span className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tighter text-charcoal">
          {String(hours).padStart(2, '0')}
        </span>
        <span className="text-2xl sm:text-3xl font-medium text-kresna-gray-dark animate-pulse">:</span>
        <span className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tighter text-charcoal">
          {String(mins).padStart(2, '0')}
        </span>
      </div>

      {/* Clock-in metadata */}
      <div className="flex items-center justify-center gap-5 text-sm text-kresna-gray mb-6">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>{t('clock.startedAt')} {formatTime(entry.clock_in)}</span>
        </div>
        {entry.clock_in_location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span>
              {entry.clock_in_location.lat.toFixed(4)}, {entry.clock_in_location.lng.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      {/* Active break notice */}
      {activeBreak && (
        <div className="flex items-center justify-center gap-2 mb-6 py-2.5 px-4 rounded-2xl bg-amber-100/60 border border-amber-200">
          <Coffee className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-700">
            {t('clock.onBreak', { type: activeBreak.break_type })}
          </span>
        </div>
      )}

      {/* Break and Clock-out action buttons - large touch-friendly */}
      <div className="grid grid-cols-2 gap-3">
        {activeBreak ? (
          <Button
            onClick={onEndBreak}
            disabled={breakLoading}
            size="touch-lg"
            className="gap-2 bg-amber-500 text-white hover:bg-amber-600 rounded-2xl shadow-sm"
          >
            {breakLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Coffee className="h-5 w-5" />
            )}
            {t('clock.endBreak')}
          </Button>
        ) : (
          <Button
            onClick={onStartBreak}
            disabled={breakLoading}
            size="touch-lg"
            variant="outline"
            className="gap-2 rounded-2xl border-emerald-300 bg-white hover:bg-emerald-50"
          >
            {breakLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Coffee className="h-5 w-5" />
            )}
            {t('clock.startBreak')}
          </Button>
        )}

        <Button
          onClick={onClockOut}
          size="touch-lg"
          variant="destructive"
          className="gap-2 rounded-2xl"
        >
          <Square className="h-5 w-5" />
          {t('clock.clockOut')}
        </Button>
      </div>

      {/* Shift progress bar */}
      {entry.linked_shift_id && (
        <div className="mt-5 pt-5 border-t border-emerald-200">
          <div className="flex items-center justify-between text-xs text-kresna-gray mb-2.5">
            <span>{t('clock.shiftProgress')}</span>
            <span className="font-semibold text-emerald-700">{progressPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-emerald-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ClockInHero({ onClockIn }: { onClockIn: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16">
      {/* Pulsing ring behind the button */}
      <div className="relative mb-6">
        <div className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-emerald-400/20 animate-ping" />
        <div className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-emerald-400/10 animate-pulse" />
        <button
          onClick={onClockIn}
          className={cn(
            'relative w-32 h-32 sm:w-40 sm:h-40 rounded-full',
            'bg-gradient-to-br from-emerald-500 to-emerald-600',
            'shadow-glow-green-lg hover:shadow-glow-green',
            'flex items-center justify-center',
            'transition-all duration-300 ease-kresna',
            'active:scale-[0.95] hover:from-emerald-400 hover:to-emerald-500'
          )}
          aria-label={t('clock.clockIn')}
        >
          <Play className="h-12 w-12 sm:h-14 sm:w-14 text-white ml-1.5" />
        </button>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-charcoal mb-1">
        {t('clock.clockIn')}
      </h2>
      <p className="text-sm text-kresna-gray">
        {t('clock.subtitle')}
      </p>
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

  function handleDateChange(id: DateFilter): void {
    onDateFilterChange(id);
    onApply();
  }

  function handleStatusChange(id: StatusFilter): void {
    onStatusFilterChange(id);
    onApply();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-kresna-gray uppercase tracking-wider">
        {t('clock.dateRange')}
      </p>
      <div className="overflow-x-auto flex gap-2 pb-2 scrollbar-hide">
        {dateFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleDateChange(filter.id)}
            disabled={filter.id === 'custom' || loading}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-kresna',
              dateFilter === filter.id
                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                : 'bg-kresna-light text-kresna-gray-dark hover:bg-kresna-border hover:text-charcoal',
              filter.id === 'custom' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {filter.label}
          </button>
        ))}

        <div className="w-px bg-kresna-border flex-shrink-0 self-stretch my-1" />

        {statusFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleStatusChange(filter.id)}
            disabled={loading}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-kresna',
              statusFilter === filter.id
                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                : 'bg-kresna-light text-kresna-gray-dark hover:bg-kresna-border hover:text-charcoal'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
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
    <div
      className={cn(
        'rounded-2xl border border-kresna-border bg-white shadow-card overflow-hidden',
        'hover:shadow-kresna hover:-translate-y-0.5 transition-all duration-300 ease-kresna'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-lg font-semibold text-charcoal">
              <span>{formatTime(entry.clock_in)}</span>
              <span className="text-kresna-gray-medium font-normal">&rarr;</span>
              <span>{entry.clock_out ? formatTime(entry.clock_out) : '...'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge variant="secondary" className="text-xs gap-1 rounded-full">
                <Timer className="h-3 w-3" />
                {formatDuration(duration, t)}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-kresna-gray">
                {getMethodIcon(entry.clock_in_method)}
                <MapPin className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>

          <Badge variant="outline" className={cn('text-xs border rounded-full', status.color)}>
            {entry.status === 'completed' && entry.is_verified ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : entry.status === 'disputed' ? (
              <AlertCircle className="h-3 w-3 mr-1" />
            ) : null}
            {status.label}
          </Badge>
        </div>

        <ChevronDown
          className={cn(
            'h-5 w-5 text-kresna-gray transition-transform duration-300 ease-kresna',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-kresna-border space-y-4">
          {entry.break_minutes > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-2 text-sm text-kresna-gray">
                <Coffee className="h-4 w-4" />
                <span>{t('clock.breaks')}: {formatDuration(entry.break_minutes, t)}</span>
              </div>
            </div>
          )}

          {entry.notes && (
            <div className="pt-2">
              <p className="text-sm text-kresna-gray">{entry.notes}</p>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <p className="text-xs text-kresna-gray uppercase tracking-wider font-medium">
              {t('clock.locations')}
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-kresna-gray">{t('clock.clockIn')}:</span>
                <p className="text-kresna-gray-dark font-mono mt-0.5">
                  {entry.clock_in_location
                    ? `${entry.clock_in_location.lat.toFixed(5)}, ${entry.clock_in_location.lng.toFixed(5)}`
                    : t('common.notAvailable')}
                </p>
              </div>
              {entry.clock_out_location && (
                <div>
                  <span className="text-kresna-gray">{t('clock.clockOut')}:</span>
                  <p className="text-kresna-gray-dark font-mono mt-0.5">
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
    <div className="sticky bottom-0 z-10">
      <div className="rounded-2xl border border-kresna-border backdrop-blur-sm bg-white/90 p-5 shadow-kresna pb-safe">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-charcoal tabular-nums">{stats.weekHours}</p>
            <p className="text-xs text-kresna-gray mt-1 font-medium uppercase tracking-wider">
              {t('clock.thisWeek')}
            </p>
          </div>
          <div className="text-center border-x border-kresna-border">
            <p className="text-3xl font-bold text-charcoal tabular-nums">{stats.avgPerDay}</p>
            <p className="text-xs text-kresna-gray mt-1 font-medium uppercase tracking-wider">
              {t('clock.avgPerDay')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-charcoal tabular-nums">{stats.breakPercentage}%</p>
            <p className="text-xs text-kresna-gray mt-1 font-medium uppercase tracking-wider">
              {t('clock.breakTime')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onClockIn }: { onClockIn: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-kresna-border bg-kresna-light px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
        <Clock className="h-10 w-10 text-primary-600" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-charcoal">{t('clock.noEntries')}</h3>
      <p className="mb-8 max-w-sm text-sm text-kresna-gray leading-relaxed">
        {t('clock.noEntriesDesc')}
      </p>
      <Button
        onClick={onClockIn}
        variant="success"
        size="touch-lg"
        className="gap-2.5"
      >
        <Play className="h-5 w-5" />
        {t('clock.clockIn')}
      </Button>
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="rounded-2xl border border-kresna-border bg-white p-5 animate-pulse shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-5 skeleton w-36" />
          <div className="h-4 skeleton w-28" />
        </div>
        <div className="h-6 skeleton w-20 rounded-full" />
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
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
            <Clock className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-charcoal sm:text-2xl">{t('clock.title')}</h1>
            <p className="text-sm text-kresna-gray">{t('clock.subtitle')}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEntries(true)}
          disabled={refreshing}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </Button>
      </div>

      {/* Active entry OR giant clock-in hero */}
      {activeEntry ? (
        <ActiveEntryCard
          entry={activeEntry}
          activeBreak={activeBreak}
          onClockOut={() => setShowClockOut(true)}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
          breakLoading={breakLoading}
        />
      ) : (
        <ClockInHero onClockIn={() => setShowClockIn(true)} />
      )}

      {/* Filter pills - auto-applying */}
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
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              fetchEntries();
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
          >
            {t('common.retry')}
          </Button>
        </div>
      )}

      {/* Entry list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <EntrySkeleton key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState onClockIn={() => setShowClockIn(true)} />
      ) : (
        <div className="space-y-8">
          {groupedEntries.map((group) => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-kresna-gray" />
                <h3 className="text-sm font-medium text-kresna-gray uppercase tracking-wider">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-kresna-border" />
              </div>

              <div className="space-y-2.5">
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

      {/* Sticky week stats footer */}
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

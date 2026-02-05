/**
 * TimeEntryList - Main Time Clock Page
 * Shows active entry with live duration, filters, entry history grouped by date, and summary stats
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
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

const SPRING_CONFIG = { type: 'spring', damping: 25, stiffness: 200 } as const;
const POLL_INTERVAL = 30000; // 30 seconds
const ENTRIES_PER_PAGE = 50;

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'disputed', label: 'Disputed' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatLiveDuration(minutes: number): { hours: number; mins: number } {
  return {
    hours: Math.floor(minutes / 60),
    mins: minutes % 60,
  };
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString));
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return new Intl.DateTimeFormat('en-US', {
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

function groupEntriesByDate(entries: TimeEntry[]): GroupedEntries[] {
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
      label: formatDateLabel(date),
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
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [pulse, setPulse] = useState(false);

  // Update duration every second
  useEffect(() => {
    const updateDuration = () => {
      const clockInTime = Date.parse(entry.clock_in);
      const now = Date.now();
      const minutes = Math.floor((now - clockInTime) / 60000);
      setDurationMinutes(minutes);
      setPulse((p) => !p);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [entry.clock_in]);

  const { hours, mins } = formatLiveDuration(durationMinutes);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING_CONFIG}
      className="glass-dark rounded-2xl border border-primary-500/30 p-5 shadow-lg shadow-primary-500/5"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left side - Duration info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-emerald-500"
              />
            </div>
            <span className="text-sm font-medium text-emerald-400">Active Shift</span>
          </div>

          {/* Live duration counter */}
          <motion.div
            key={pulse ? 'a' : 'b'}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            className="flex items-baseline gap-1"
          >
            <span className="text-4xl font-bold tabular-nums text-white">{hours}</span>
            <span className="text-lg text-neutral-400">hours</span>
            <span className="text-4xl font-bold tabular-nums text-white ml-2">{mins}</span>
            <span className="text-lg text-neutral-400">minutes</span>
          </motion.div>

          {/* Clock in time */}
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Started at {formatTime(entry.clock_in)}</span>
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

          {/* Active break indicator */}
          {activeBreak && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 pt-2"
            >
              <Coffee className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-400">
                On {activeBreak.break_type} break
              </span>
            </motion.div>
          )}
        </div>

        {/* Right side - Actions */}
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
              End Break
            </Button>
          ) : (
            <Button
              onClick={onStartBreak}
              disabled={breakLoading}
              size="sm"
              variant="secondary"
              className="gap-1.5"
            >
              {breakLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Coffee className="h-4 w-4" />
              )}
              Start Break
            </Button>
          )}

          <Button
            onClick={onClockOut}
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700"
          >
            <Square className="h-4 w-4" />
            Clock Out
          </Button>
        </div>
      </div>

      {/* Progress bar placeholder - for linked shifts */}
      {entry.linked_shift_id && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span>Shift progress</span>
            <span>{Math.min(100, Math.round((durationMinutes / 480) * 100))}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (durationMinutes / 480) * 100)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
            />
          </div>
        </div>
      )}
    </motion.div>
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-xl p-4 space-y-4"
    >
      {/* Date filters */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Date Range
        </label>
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onDateFilterChange(filter.id)}
              disabled={filter.id === 'custom'}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                dateFilter === filter.id
                  ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30'
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white',
                filter.id === 'custom' && 'opacity-50 cursor-not-allowed'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status filters */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onStatusFilterChange(filter.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                statusFilter === filter.id
                  ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30'
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apply button */}
      <Button onClick={onApply} disabled={loading} size="sm" className="w-full sm:w-auto">
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Filter className="h-4 w-4 mr-2" />
        )}
        Apply Filters
      </Button>
    </motion.div>
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
  const duration = entry.total_minutes ?? 0;

  const statusConfig = {
    active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    completed: {
      label: entry.is_verified ? 'Verified' : 'Pending',
      color: entry.is_verified
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        : 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    disputed: { label: 'Disputed', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  const status = statusConfig[entry.status] || statusConfig.completed;

  return (
    <motion.div layout transition={SPRING_CONFIG} className="glass-card rounded-xl overflow-hidden">
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Times */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-white font-medium">
              <span>{formatTime(entry.clock_in)}</span>
              <span className="text-neutral-500">→</span>
              <span>{entry.clock_out ? formatTime(entry.clock_out) : '...'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary" className="text-xs gap-1">
                <Timer className="h-3 w-3" />
                {formatDuration(duration)}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                {getMethodIcon(entry.clock_in_method)}
                <MapPin className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>

          {/* Status badge */}
          <Badge variant="outline" className={cn('text-xs border', status.color)}>
            {entry.status === 'completed' && entry.is_verified ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : entry.status === 'disputed' ? (
              <AlertCircle className="h-3 w-3 mr-1" />
            ) : null}
            {status.label}
          </Badge>
        </div>

        {/* Expand icon */}
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-5 w-5 text-neutral-500" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_CONFIG}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/10 space-y-4">
              {/* Break details placeholder */}
              {entry.break_minutes > 0 && (
                <div className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                    <Coffee className="h-4 w-4" />
                    <span>Breaks: {formatDuration(entry.break_minutes)}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div className="pt-2">
                  <p className="text-sm text-neutral-400">{entry.notes}</p>
                </div>
              )}

              {/* Location placeholder */}
              <div className="pt-2 space-y-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Locations</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-neutral-500">Clock In:</span>
                    <p className="text-neutral-300 font-mono mt-0.5">
                      {entry.clock_in_location
                        ? `${entry.clock_in_location.lat.toFixed(5)}, ${entry.clock_in_location.lng.toFixed(5)}`
                        : 'N/A'}
                    </p>
                  </div>
                  {entry.clock_out_location && (
                    <div>
                      <span className="text-neutral-500">Clock Out:</span>
                      <p className="text-neutral-300 font-mono mt-0.5">
                        {entry.clock_out_location.lat.toFixed(5)},{' '}
                        {entry.clock_out_location.lng.toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SummaryStats({ entries }: { entries: TimeEntry[] }) {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-xl p-4 sticky bottom-0 pb-safe"
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.weekHours}</p>
          <p className="text-xs text-neutral-500 mt-0.5">This Week</p>
        </div>
        <div className="text-center border-x border-white/10">
          <p className="text-2xl font-bold text-white">{stats.avgPerDay}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Avg/Day</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.breakPercentage}%</p>
          <p className="text-xs text-neutral-500 mt-0.5">Break Time</p>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onClockIn }: { onClockIn: () => void }) {
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
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600/20 to-emerald-600/20"
      >
        <Clock className="h-8 w-8 text-primary-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">No time entries yet</h3>
      <p className="mb-6 max-w-sm text-sm text-neutral-400">
        Clock in to start tracking your work hours and breaks.
      </p>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button onClick={onClockIn} className="gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">
          <Play className="h-4 w-4" />
          Clock In
        </Button>
      </motion.div>
    </motion.div>
  );
}

function EntrySkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-white/10 rounded w-32" />
          <div className="h-4 bg-white/10 rounded w-24" />
        </div>
        <div className="h-6 bg-white/10 rounded w-20" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function TimeEntryList() {
  const { slug } = useParams<{ slug: string }>();
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

      // Fetch active break if entry exists
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
    } catch (err) {
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
        setEntries(response.entries);
      } catch (err) {
        setError('Failed to load time entries. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgSlug, dateFilter, statusFilter]
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
  const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries]);

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
      setError('Failed to start break');
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
      fetchActive(); // Refresh to get updated break_minutes
    } catch {
      setError('Failed to end break');
    } finally {
      setBreakLoading(false);
    }
  };

  // Handle sheet close
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/20 to-emerald-600/20 shadow-lg shadow-primary-500/10">
            <Clock className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Time Clock</h1>
            <p className="text-sm text-neutral-400">Track your work hours and breaks</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchEntries(true)}
              disabled={refreshing}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </motion.div>

          {!activeEntry && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setShowClockIn(true)}
                size="sm"
                className="gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Clock In</span>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Active entry card */}
      <AnimatePresence>
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
      </AnimatePresence>

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
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                fetchEntries();
              }}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry list */}
      <LayoutGroup>
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <EntrySkeleton />
              </motion.div>
            ))}
          </motion.div>
        ) : entries.length === 0 ? (
          <EmptyState onClockIn={() => setShowClockIn(true)} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {groupedEntries.map((group, groupIndex) => (
              <motion.div
                key={group.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + groupIndex * 0.05 }}
                className="space-y-3"
              >
                {/* Date header */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-neutral-500" />
                  <h3 className="text-sm font-medium text-neutral-400">{group.label}</h3>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Entries */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {group.entries.map((entry, entryIndex) => (
                      <motion.div
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                          ...SPRING_CONFIG,
                          delay: entryIndex * 0.02,
                        }}
                      >
                        <EntryCard
                          entry={entry}
                          isExpanded={expandedEntries.has(entry.id)}
                          onToggle={() => toggleEntry(entry.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </LayoutGroup>

      {/* Summary stats */}
      {entries.length > 0 && <SummaryStats entries={entries} />}

      {/* Sheets */}
      <ClockInSheet isOpen={showClockIn} onClose={handleClockInClose} />
      <ClockOutSheet
        isOpen={showClockOut}
        onClose={handleClockOutClose}
        activeEntry={activeEntry}
      />
    </div>
  );
}

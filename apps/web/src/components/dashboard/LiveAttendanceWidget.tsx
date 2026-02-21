/**
 * LiveAttendanceWidget Component
 * Real-time dashboard widget showing currently clocked-in employees
 * Uses WebSocket for live updates - only visible to managers+
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Coffee,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';

import type { AttendanceEntry } from '@/hooks/useWebSocket';

// ============================================================================
// Types
// ============================================================================

export interface LiveAttendanceWidgetProps {
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const WARNING_THRESHOLD = 7.5;
const VIOLATION_THRESHOLD = 9;

// ============================================================================
// Helper Functions
// ============================================================================

function calculateHoursWorked(clockInTime: string): number {
  const clockIn = new Date(clockInTime);
  const now = new Date();
  const diffMs = now.getTime() - clockIn.getTime();
  return diffMs / (1000 * 60 * 60);
}

function formatDuration(clockInTime: string): string {
  const hours = calculateHoursWorked(clockInTime);
  const totalMinutes = Math.floor(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) {
    return `${m}m`;
  }
  return `${h}h ${m}m`;
}

function getStatusColor(clockInTime: string): 'green' | 'yellow' | 'red' {
  const hours = calculateHoursWorked(clockInTime);

  if (hours >= VIOLATION_THRESHOLD) {
    return 'red';
  }
  if (hours >= WARNING_THRESHOLD) {
    return 'yellow';
  }
  return 'green';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const STATUS_AVATAR_STYLES = {
  green: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  yellow: 'bg-amber-50 text-amber-600 border border-amber-200',
  red: 'bg-red-50 text-red-600 border border-red-200',
} as const;

const STATUS_DURATION_STYLES = {
  green: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  yellow: 'bg-amber-50 text-amber-600 border border-amber-200',
  red: 'bg-red-50 text-red-600 border border-red-200',
} as const;

// ============================================================================
// Sub-Components
// ============================================================================

interface EmployeeRowProps {
  entry: AttendanceEntry;
}

function EmployeeRow({ entry }: EmployeeRowProps): React.ReactElement {
  const { t } = useTranslation();
  const [duration, setDuration] = React.useState(() => formatDuration(entry.clockInTime));
  const statusColor = getStatusColor(entry.clockInTime);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDuration(formatDuration(entry.clockInTime));
    }, 60000);

    return () => clearInterval(interval);
  }, [entry.clockInTime]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-kresna-border bg-kresna-light p-3 transition-colors hover:bg-kresna-light/80">
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          STATUS_AVATAR_STYLES[statusColor]
        )}
      >
        {getInitials(entry.userName)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">
          {entry.userName}
        </p>
        {entry.location && (
          <p className="truncate text-xs text-kresna-gray">
            {entry.location}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {entry.isOnBreak && (
          <div className="flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-1">
            <Coffee className="h-3 w-3 text-primary-600" />
            <span className="text-xs font-medium text-primary-600">{t('clock.break')}</span>
          </div>
        )}

        <div
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-1',
            STATUS_DURATION_STYLES[statusColor]
          )}
        >
          {statusColor === 'red' && <AlertTriangle className="h-3 w-3" />}
          <Clock className="h-3 w-3" />
          <span className="text-xs font-mono">{duration}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LiveAttendanceWidget({ className }: LiveAttendanceWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const {
    isConnected,
    connectionStatus,
    attendanceData,
    clockedInCount,
    onBreakCount
  } = useWebSocket();

  const sortedEntries = React.useMemo(() => {
    return Array.from(attendanceData.values()).sort((a, b) => {
      return new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime();
    });
  }, [attendanceData]);

  return (
    <div className={cn('rounded-2xl border border-kresna-border bg-white p-5 shadow-card', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-charcoal">{t('dashboard.liveAttendance')}</h3>
            <p className="text-xs text-kresna-gray">{t('dashboard.realtimeStatus')}</p>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
            isConnected
              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
              : 'border-red-200 bg-red-50 text-red-600'
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>{t('common.live')}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>{connectionStatus === 'connecting' ? t('common.connecting') : t('common.offline')}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-600">{clockedInCount}</p>
            <p className="text-xs font-medium text-emerald-600">{t('dashboard.clockedIn')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <Coffee className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-primary-600">{onBreakCount}</p>
            <p className="text-xs font-medium text-primary-600">{t('dashboard.onBreak')}</p>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {sortedEntries.length > 0 ? (
          sortedEntries.map(entry => (
            <EmployeeRow key={entry.userId} entry={entry} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kresna-light">
              <Users className="h-6 w-6 text-kresna-gray" />
            </div>
            <p className="text-sm text-kresna-gray">{t('dashboard.noEmployeesClockedIn')}</p>
            <p className="mt-1 text-xs text-kresna-gray">
              {isConnected
                ? t('dashboard.waitingForEvents')
                : t('dashboard.connectToSee')
              }
            </p>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 border-t border-kresna-border pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-kresna-gray">&lt;7.5h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-xs text-kresna-gray">7.5-9h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-xs text-kresna-gray">&gt;9h</span>
        </div>
      </div>
    </div>
  );
}

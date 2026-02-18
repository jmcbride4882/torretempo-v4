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

// Time thresholds in hours
const WARNING_THRESHOLD = 7.5; // Yellow: approaching overtime
const VIOLATION_THRESHOLD = 9; // Red: violation territory

// ============================================================================
// Helper Functions
// ============================================================================

function calculateHoursWorked(clockInTime: string): number {
  const clockIn = new Date(clockInTime);
  const now = new Date();
  const diffMs = now.getTime() - clockIn.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
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

// ============================================================================
// Sub-Components
// ============================================================================

interface EmployeeRowProps {
  entry: AttendanceEntry;
}

function EmployeeRow({ entry }: EmployeeRowProps) {
  const { t } = useTranslation();
  const [duration, setDuration] = React.useState(() => formatDuration(entry.clockInTime));
  const statusColor = getStatusColor(entry.clockInTime);

  // Update duration every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDuration(formatDuration(entry.clockInTime));
    }, 60000);

    return () => clearInterval(interval);
  }, [entry.clockInTime]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        "bg-slate-50 border border-slate-200",
        "hover:bg-slate-100 transition-colors"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
        statusColor === 'green' && "bg-emerald-50 text-emerald-600 border border-emerald-200",
        statusColor === 'yellow' && "bg-amber-50 text-amber-600 border border-amber-200",
        statusColor === 'red' && "bg-red-50 text-red-600 border border-red-200"
      )}>
        {getInitials(entry.userName)}
      </div>

      {/* Name and Location */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {entry.userName}
        </p>
        {entry.location && (
          <p className="text-xs text-slate-500 truncate">
            {entry.location}
          </p>
        )}
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2">
        {/* Break indicator */}
        {entry.isOnBreak && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-200">
            <Coffee className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-blue-600">{t('clock.break')}</span>
          </div>
        )}

        {/* Duration */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full",
          statusColor === 'green' && "bg-emerald-50 text-emerald-600",
          statusColor === 'yellow' && "bg-amber-50 text-amber-600",
          statusColor === 'red' && "bg-red-50 text-red-600"
        )}>
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

export function LiveAttendanceWidget({ className }: LiveAttendanceWidgetProps) {
  const { t } = useTranslation();
  const {
    isConnected,
    connectionStatus,
    attendanceData,
    clockedInCount,
    onBreakCount
  } = useWebSocket();

  // Convert Map to sorted array (most recent first)
  const sortedEntries = React.useMemo(() => {
    return Array.from(attendanceData.values()).sort((a, b) => {
      // Sort by clock-in time, most recent first
      return new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime();
    });
  }, [attendanceData]);

  return (
    <div className={cn(
      "bg-white border border-slate-200 shadow-sm rounded-2xl p-5",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.liveAttendance')}</h3>
            <p className="text-xs text-slate-500">{t('dashboard.realtimeStatus')}</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
          isConnected
            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
            : "bg-red-50 text-red-600 border border-red-200"
        )}>
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
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Clocked In */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{clockedInCount}</p>
            <p className="text-xs text-emerald-600/70">{t('dashboard.clockedIn')}</p>
          </div>
        </div>

        {/* On Break */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Coffee className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{onBreakCount}</p>
            <p className="text-xs text-blue-600/70">{t('dashboard.onBreak')}</p>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {sortedEntries.length > 0 ? (
          sortedEntries.map(entry => (
            <EmployeeRow key={entry.userId} entry={entry} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">{t('dashboard.noEmployeesClockedIn')}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isConnected
                ? t('dashboard.waitingForEvents')
                : t('dashboard.connectToSee')
              }
            </p>
          </div>
        )}
      </div>

      {/* Footer - Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">&lt;7.5h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-500">7.5-9h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs text-slate-500">&gt;9h</span>
        </div>
      </div>
    </div>
  );
}

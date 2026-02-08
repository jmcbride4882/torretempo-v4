/**
 * LiveAttendanceWidget Component
 * Real-time dashboard widget showing currently clocked-in employees
 * Uses WebSocket for live updates - only visible to managers+
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const SPRING_CONFIG = { type: 'spring', damping: 25, stiffness: 300 } as const;

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
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={SPRING_CONFIG}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        "bg-zinc-900/30 border border-zinc-800/50",
        "hover:bg-zinc-900/50 transition-colors"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
        "bg-gradient-to-br",
        statusColor === 'green' && "from-emerald-500/20 to-emerald-600/20 text-emerald-400 border border-emerald-500/30",
        statusColor === 'yellow' && "from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30",
        statusColor === 'red' && "from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30"
      )}>
        {getInitials(entry.userName)}
      </div>

      {/* Name and Location */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {entry.userName}
        </p>
        {entry.location && (
          <p className="text-xs text-zinc-500 truncate">
            {entry.location}
          </p>
        )}
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2">
        {/* Break indicator */}
        {entry.isOnBreak && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
            <Coffee className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-blue-400">Break</span>
          </div>
        )}

        {/* Duration */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full",
          statusColor === 'green' && "bg-emerald-500/10 text-emerald-400",
          statusColor === 'yellow' && "bg-amber-500/10 text-amber-400",
          statusColor === 'red' && "bg-red-500/10 text-red-400"
        )}>
          {statusColor === 'red' && <AlertTriangle className="h-3 w-3" />}
          <Clock className="h-3 w-3" />
          <span className="text-xs font-mono">{duration}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LiveAttendanceWidget({ className }: LiveAttendanceWidgetProps) {
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
      "glass-card rounded-2xl p-5",
      "border border-zinc-800/50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Live Attendance</h3>
            <p className="text-xs text-zinc-500">Real-time employee status</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
          isConnected 
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            : "bg-red-500/10 text-red-400 border border-red-500/30"
        )}>
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>{connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Clocked In */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{clockedInCount}</p>
            <p className="text-xs text-emerald-400/70">Clocked In</p>
          </div>
        </div>

        {/* On Break */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Coffee className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{onBreakCount}</p>
            <p className="text-xs text-blue-400/70">On Break</p>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {sortedEntries.length > 0 ? (
            sortedEntries.map(entry => (
              <EmployeeRow key={entry.userId} entry={entry} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">No employees clocked in</p>
              <p className="text-xs text-zinc-600 mt-1">
                {isConnected 
                  ? "Waiting for clock-in events..."
                  : "Connect to see live attendance"
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-500">&lt;7.5h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-xs text-zinc-500">7.5-9h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs text-zinc-500">&gt;9h</span>
        </div>
      </div>
    </div>
  );
}

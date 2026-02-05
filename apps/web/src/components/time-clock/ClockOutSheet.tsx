/**
 * ClockOutSheet Component
 * Mobile-first bottom sheet for clocking out with duration summary and break tracking
 * Uses glassmorphism design, Framer Motion animations, and live duration counter
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Coffee,
  Timer,
  Plus,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useGeolocation, formatAccuracy } from '@/hooks/useGeolocation';
import { useOrganization } from '@/hooks/useOrganization';
import { useHaptic } from '@/hooks/useHaptic';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { clockOut, fetchBreaks, TimeEntryApiError } from '@/lib/api/time-entries';
import type { TimeEntry, BreakEntry } from '@/lib/api/time-entries';

// ============================================================================
// Types
// ============================================================================

export interface ClockOutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeEntry: TimeEntry | null;
}

// ============================================================================
// Constants
// ============================================================================

const SPRING_CONFIG = { type: 'spring', damping: 30, stiffness: 300 } as const;

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(minutes: number): { hours: number; mins: number; text: string } {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return { hours, mins, text: `${mins} minute${mins !== 1 ? 's' : ''}` };
  }
  
  return { 
    hours, 
    mins, 
    text: `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}` 
  };
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }).format(new Date(isoString));
}

// ============================================================================
// Component
// ============================================================================

export function ClockOutSheet({ isOpen, onClose, activeEntry }: ClockOutSheetProps) {
  // Organization context
  const { organization } = useOrganization();
  
  // Geolocation
  const { 
    position, 
    loading: geoLoading, 
    requestPermission 
  } = useGeolocation();

  // Haptic feedback
  const haptic = useHaptic();

  // Offline queue
  const { isOnline, enqueue: enqueueAction } = useOfflineQueue();

  // Local state
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [durationMinutes, setDurationMinutes] = React.useState(0);
  const [breaks, setBreaks] = React.useState<BreakEntry[]>([]);
  const [breaksLoading, setBreaksLoading] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Time formatter
  const timeFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    }),
    []
  );

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    }),
    []
  );

  // Update current time and duration every second
  React.useEffect(() => {
    if (!isOpen || !activeEntry) return;
    
    const updateDuration = () => {
      setCurrentTime(new Date());
      const clockInTime = Date.parse(activeEntry.clock_in);
      const now = Date.now();
      const minutes = Math.floor((now - clockInTime) / 60000);
      setDurationMinutes(minutes);
    };
    
    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeEntry]);

  // Request geolocation on mount
  React.useEffect(() => {
    if (isOpen && !position && !geoLoading) {
      requestPermission();
    }
  }, [isOpen, position, geoLoading, requestPermission]);

  // Fetch breaks when sheet opens
  React.useEffect(() => {
    if (!isOpen || !activeEntry || !organization?.slug) return;
    
    const loadBreaks = async () => {
      setBreaksLoading(true);
      try {
        const response = await fetchBreaks(organization.slug, activeEntry.id);
        setBreaks(response.breaks);
      } catch {
        // Silently fail - breaks are not critical
        setBreaks([]);
      } finally {
        setBreaksLoading(false);
      }
    };
    
    loadBreaks();
  }, [isOpen, activeEntry, organization?.slug]);

  // Reset state when sheet opens
  React.useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError(null);
      setNotes('');
    }
  }, [isOpen]);

  // Computed values
  const breakMinutes = activeEntry?.break_minutes ?? 0;
  const netWorkMinutes = Math.max(0, durationMinutes - breakMinutes);
  const hasActiveBreak = breaks.some(b => b.break_end === null);
  const canClockOut = activeEntry !== null && !submitting && !success && !hasActiveBreak;

  // Handle clock out submission
  const handleClockOut = async () => {
    if (!organization?.slug || !activeEntry || !position) return;
    
    // Light haptic feedback on button press
    haptic.light();
    
    setSubmitting(true);
    setError(null);

    const clockOutData = {
      entryId: activeEntry.id,
      clock_out_location: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      },
      clock_out_method: 'tap' as const,
      notes: notes.trim() || undefined,
    };

    try {
      if (!isOnline) {
        // Queue action for offline processing
        await enqueueAction('clock-out', organization.slug, clockOutData);
        
        setSuccess(true);
        haptic.success();
        
        // Close after success animation
        setTimeout(() => {
          onClose();
        }, 1500);
        
        return;
      }

      // Online - process immediately
      await clockOut(organization.slug, activeEntry.id, clockOutData);

      setSuccess(true);
      
      // Success haptic feedback (two short pulses)
      haptic.success();
      
      // Close after success animation
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      // Error haptic feedback (three quick pulses)
      haptic.error();
      
      if (err instanceof TimeEntryApiError) {
        setError(err.message);
      } else {
        setError('Failed to clock out. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add break (placeholder)
  const handleAddBreak = () => {
    // Placeholder - will open break sheet in future
    setError('Break management coming soon!');
    setTimeout(() => setError(null), 3000);
  };

  // No active entry state
  if (!activeEntry && isOpen) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        snapPoints={[300]}
      >
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">No Active Entry</p>
            <p className="text-sm text-zinc-400 mt-1">
              You don&apos;t have an active time entry to clock out from.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={onClose}
            className="mt-4"
          >
            Close
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[620]}
      dismissable={!submitting}
    >
      <div className="flex flex-col gap-5">
        {/* Header with Time */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-white">Clock Out</h2>
          </div>
          <motion.div
            key={currentTime.getTime()}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-4xl font-mono font-bold text-white tracking-tight"
          >
            {timeFormatter.format(currentTime)}
          </motion.div>
          <p className="text-sm text-zinc-400 mt-1">
            {dateFormatter.format(currentTime)}
          </p>
        </div>

        {/* Duration Summary Card */}
        {activeEntry && (
          <div className="glass-card rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Timer className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-zinc-300">Duration Summary</span>
            </div>

            {/* Clock In Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm text-zinc-400">Clocked In</span>
              </div>
              <span className="text-sm font-medium text-white">
                {formatTime(activeEntry.clock_in)}
              </span>
            </div>

            {/* Current Duration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Timer className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm text-zinc-400">Duration</span>
              </div>
              <motion.span 
                key={durationMinutes}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium text-white font-mono"
              >
                {formatDuration(durationMinutes).text}
              </motion.span>
            </div>

            {/* Break Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Coffee className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-sm text-zinc-400">Total Breaks</span>
              </div>
              <span className="text-sm font-medium text-zinc-300">
                {breakMinutes > 0 ? formatDuration(breakMinutes).text : 'None'}
              </span>
            </div>

            {/* Net Work Time - Highlighted */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-white">Net Work Time</span>
              </div>
              <motion.span 
                key={netWorkMinutes}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="text-lg font-bold text-emerald-400 font-mono"
              >
                {formatDuration(netWorkMinutes).text}
              </motion.span>
            </div>
          </div>
        )}

        {/* Break List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-400 flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Breaks
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddBreak}
              disabled={hasActiveBreak}
              className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Break
            </Button>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            {breaksLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
              </div>
            ) : breaks.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-sm text-zinc-500">
                No breaks taken
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {breaks.map((breakEntry) => {
                  const isActive = breakEntry.break_end === null;
                  const breakDuration = isActive
                    ? Math.floor((Date.now() - Date.parse(breakEntry.break_start)) / 60000)
                    : breakEntry.break_end 
                      ? Math.floor((Date.parse(breakEntry.break_end) - Date.parse(breakEntry.break_start)) / 60000)
                      : 0;

                  return (
                    <div 
                      key={breakEntry.id} 
                      className={cn(
                        "flex items-center justify-between p-3",
                        isActive && "bg-amber-500/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          isActive ? "bg-amber-500/20" : "bg-zinc-800"
                        )}>
                          <Coffee className={cn(
                            "h-4 w-4",
                            isActive ? "text-amber-400" : "text-zinc-400"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">
                              {formatTime(breakEntry.break_start)}
                              {breakEntry.break_end && (
                                <span className="text-zinc-500"> → </span>
                              )}
                              {breakEntry.break_end && formatTime(breakEntry.break_end)}
                            </span>
                            {isActive && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                Active
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500">
                            {formatDuration(breakDuration).text}
                          </span>
                        </div>
                      </div>
                      <Badge 
                        variant={breakEntry.break_type === 'paid' ? 'success' : 'secondary'}
                        className="text-[10px]"
                      >
                        {breakEntry.break_type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Break Warning */}
          <AnimatePresence>
            {hasActiveBreak && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
              >
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-400">
                  You have an active break. Please end it before clocking out.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Location */}
        <div className="flex items-center justify-between glass-card rounded-xl p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Location</span>
          </div>
          {geoLoading ? (
            <Badge variant="ghost" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching...
            </Badge>
          ) : position ? (
            <span className="text-xs text-zinc-500 font-mono">
              {formatAccuracy(position.coords.accuracy)} accuracy
            </span>
          ) : (
            <Badge variant="destructive" className="text-[10px]">
              Unavailable
            </Badge>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="clock-out-notes" className="text-zinc-400">
            Notes (optional)
          </Label>
          <textarea
            id="clock-out-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about your shift..."
            rows={2}
            className={cn(
              "w-full px-3 py-2 rounded-xl resize-none",
              "bg-zinc-900/50 border border-zinc-800",
              "text-white placeholder:text-zinc-600",
              "focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50",
              "text-sm"
            )}
          />
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success State */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING_CONFIG}
              className="flex flex-col items-center justify-center py-4 gap-2"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...SPRING_CONFIG, delay: 0.1 }}
                className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </motion.div>
              <p className="text-lg font-semibold text-white">Clocked Out!</p>
              <p className="text-sm text-zinc-400">
                Total: {formatDuration(netWorkMinutes).text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        {!success && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleClockOut}
              disabled={!canClockOut || !position}
              className={cn(
                "h-14 text-lg font-semibold rounded-xl",
                "bg-amber-600 hover:bg-amber-700",
                "disabled:bg-zinc-800 disabled:text-zinc-500"
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Clocking Out...
                </span>
              ) : (
                'Clock Out'
              )}
            </Button>
            
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="h-12 text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

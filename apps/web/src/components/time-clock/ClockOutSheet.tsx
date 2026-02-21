/**
 * ClockOutSheet Component
 * Mobile-first bottom sheet for clocking out with duration summary and break tracking
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
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
import { useHaptic } from '@/hooks/useHaptic';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { LocationMap } from '@/components/locations/LocationMap';
import { clockOut, fetchBreaks, TimeEntryApiError } from '@/lib/api/time-entries';
import type { TimeEntry, BreakEntry } from '@/lib/api/time-entries';

// ============================================================================
// Types
// ============================================================================

export interface ClockOutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  organizationSlug: string;
  activeEntry: TimeEntry | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(
  minutes: number,
  t: (key: string, options?: Record<string, unknown>) => string
): { hours: number; mins: number; text: string } {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return { hours, mins, text: t('clock.durationMinutes', { count: mins }) };
  }

  return {
    hours,
    mins,
    text: `${t('clock.durationHours', { count: hours })} ${t('clock.durationMinutes', { count: mins })}`
  };
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(isoString));
}

// ============================================================================
// Component
// ============================================================================

export function ClockOutSheet({ isOpen, onClose, organizationSlug, activeEntry }: ClockOutSheetProps) {
  const { t } = useTranslation();

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

  // Time formatter - es-ES locale with 24h time
  const timeFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    []
  );

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('es-ES', {
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
    if (!isOpen || !activeEntry || !organizationSlug) return;

    const loadBreaks = async () => {
      setBreaksLoading(true);
      try {
        const response = await fetchBreaks(organizationSlug, activeEntry.id);
        setBreaks(response.breaks);
      } catch {
        // Silently fail - breaks are not critical
        setBreaks([]);
      } finally {
        setBreaksLoading(false);
      }
    };

    loadBreaks();
  }, [isOpen, activeEntry, organizationSlug]);

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
    if (!organizationSlug || !activeEntry || !position) return;

    // Light haptic feedback on button press
    haptic.light();

    setSubmitting(true);
    setError(null);

    const clockOutData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      method: 'tap' as const,
      notes: notes.trim() || undefined,
    };

    try {
      if (!isOnline) {
        // Queue action for offline processing
        await enqueueAction('clock-out', organizationSlug, clockOutData);

        setSuccess(true);
        haptic.success();

        // Close after success animation
        setTimeout(() => {
          onClose();
        }, 1500);

        return;
      }

      // Online - process immediately
      await clockOut(organizationSlug, activeEntry.id, clockOutData);

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
        setError(t('clock.failedToClockOut'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add break (placeholder)
  const handleAddBreak = () => {
    setError(t('clock.breakManagementSoon'));
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
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-charcoal">{t('clock.noActiveEntry')}</p>
            <p className="text-sm text-kresna-gray mt-1">
              {t('clock.noActiveEntryDescription')}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={onClose}
            className="mt-4"
          >
            {t('common.close')}
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
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-semibold text-charcoal">{t('clock.clockOut')}</h2>
          </div>
          <div className="text-4xl font-mono font-bold text-charcoal tracking-tight">
            {timeFormatter.format(currentTime)}
          </div>
          <p className="text-sm text-kresna-gray mt-1">
            {dateFormatter.format(currentTime)}
          </p>
        </div>

        {/* Duration Summary Card */}
        {activeEntry && (
          <div className="rounded-2xl bg-kresna-light border border-kresna-border p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-kresna-border">
              <Timer className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-kresna-gray-dark">{t('clock.durationSummary')}</span>
            </div>

            {/* Clock In Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm text-kresna-gray">{t('clock.clockedInAt')}</span>
              </div>
              <span className="text-sm font-medium text-charcoal">
                {formatTime(activeEntry.clock_in)}
              </span>
            </div>

            {/* Current Duration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
                  <Timer className="h-4 w-4 text-primary-600" />
                </div>
                <span className="text-sm text-kresna-gray">{t('clock.duration')}</span>
              </div>
              <span className="text-sm font-medium text-charcoal font-mono">
                {formatDuration(durationMinutes, t).text}
              </span>
            </div>

            {/* Break Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                  <Coffee className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm text-kresna-gray">{t('clock.totalBreaks')}</span>
              </div>
              <span className="text-sm font-medium text-kresna-gray-dark">
                {breakMinutes > 0 ? formatDuration(breakMinutes, t).text : t('common.none')}
              </span>
            </div>

            {/* Net Work Time - Highlighted */}
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-charcoal">{t('clock.netWorkTime')}</span>
              </div>
              <span className="text-2xl font-bold text-primary-600 font-mono">
                {formatDuration(netWorkMinutes, t).text}
              </span>
            </div>
          </div>
        )}

        {/* Break List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-kresna-gray flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              {t('clock.breaks')}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddBreak}
              disabled={hasActiveBreak}
              className="h-8 px-2 text-xs text-kresna-gray hover:text-charcoal"
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('clock.addBreak')}
            </Button>
          </div>

          <div className="rounded-2xl border border-kresna-border bg-white shadow-card overflow-hidden">
            {breaksLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 text-kresna-gray animate-spin" />
              </div>
            ) : breaks.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-sm text-kresna-gray">
                {t('clock.noBreaksTaken')}
              </div>
            ) : (
              <div className="divide-y divide-kresna-border">
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
                        isActive && "bg-amber-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          isActive ? "bg-amber-50" : "bg-kresna-light"
                        )}>
                          <Coffee className={cn(
                            "h-4 w-4",
                            isActive ? "text-amber-600" : "text-kresna-gray"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-charcoal">
                              {formatTime(breakEntry.break_start)}
                              {breakEntry.break_end && (
                                <span className="text-kresna-gray"> → </span>
                              )}
                              {breakEntry.break_end && formatTime(breakEntry.break_end)}
                            </span>
                            {isActive && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                {t('common.active')}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-kresna-gray">
                            {formatDuration(breakDuration, t).text}
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
          {hasActiveBreak && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-600">
                {t('clock.endBreakBeforeClockOut')}
              </p>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center justify-between rounded-xl bg-kresna-light border border-kresna-border p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-kresna-gray" />
            <span className="text-sm text-kresna-gray">{t('clock.location')}</span>
          </div>
          {geoLoading ? (
            <Badge variant="ghost" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('common.fetching')}
            </Badge>
          ) : position ? (
            <span className="text-xs text-kresna-gray font-mono">
              {formatAccuracy(position.coords.accuracy)} {t('clock.accuracy')}
            </span>
          ) : (
            <Badge variant="destructive" className="text-[10px]">
              {t('common.unavailable')}
            </Badge>
          )}
        </div>

        {/* Location Map */}
        {position && (
          <div className="space-y-2">
            <Label className="text-kresna-gray">{t('clock.clockOutLocation')}</Label>
            <LocationMap
              lat={position.coords.latitude}
              lng={position.coords.longitude}
              accuracy={position.coords.accuracy}
              height="180px"
              showAccuracyCircle={true}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="clock-out-notes" className="text-kresna-gray">
            {t('common.notesOptional')}
          </Label>
          <textarea
            id="clock-out-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('clock.addShiftNotes')}
            rows={2}
            className={cn(
              "w-full px-3 py-2 rounded-xl resize-none",
              "bg-kresna-light border border-kresna-border",
              "text-charcoal placeholder:text-kresna-gray",
              "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500",
              "text-sm"
            )}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-charcoal">{t('clock.clockedOutSuccess')}</p>
            <p className="text-sm text-kresna-gray">
              {t('clock.total')}: {formatDuration(netWorkMinutes, t).text}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!success && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleClockOut}
              disabled={!canClockOut || !position}
              variant="destructive"
              size="xl"
              className="w-full"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('clock.clockingOut')}
                </span>
              ) : (
                t('clock.clockOut')
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="h-12 text-kresna-gray hover:text-charcoal"
            >
              {t('common.cancel')}
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

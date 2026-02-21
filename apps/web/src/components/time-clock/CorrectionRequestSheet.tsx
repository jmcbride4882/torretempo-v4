/**
 * CorrectionRequestSheet Component
 * Bottom sheet for requesting time entry corrections
 * Allows employees to request changes to clock-in/clock-out times
 * Shows preview of time difference and requires reason
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

// ============================================================================
// Types
// ============================================================================

export interface TimeEntry {
  id: string;
  clockIn: string; // ISO string
  clockOut: string | null; // ISO string
  breakMinutes: number;
}

export interface CorrectionRequestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  organizationSlug: string;
  timeEntry: TimeEntry | null;
  onSuccess?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const SPRING_CONFIG = { type: 'spring', damping: 25, stiffness: 300 } as const;
const MAX_REASON_LENGTH = 500;

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  }).format(new Date(isoString));
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-GB', { 
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(new Date(isoString));
}

function toLocalDateTimeString(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function calculateTimeDiff(original: string, requested: string): string | null {
  const origDate = new Date(original);
  const reqDate = new Date(requested);
  const diffMs = reqDate.getTime() - origDate.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins === 0) return null;
  const sign = diffMins > 0 ? '+' : '';
  const hours = Math.floor(Math.abs(diffMins) / 60);
  const mins = Math.abs(diffMins) % 60;
  
  if (hours === 0) {
    return `${sign}${diffMins} min`;
  }
  return `${sign}${diffMins > 0 ? '' : '-'}${hours}h ${mins}m`;
}

function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
}

// ============================================================================
// Component
// ============================================================================

export function CorrectionRequestSheet({
  isOpen,
  onClose,
  organizationSlug,
  timeEntry,
  onSuccess,
}: CorrectionRequestSheetProps) {
  // Hooks
  const { t } = useTranslation();
  const haptic = useHaptic();
  const { isOnline, queueAction } = useOfflineQueue();

  // Local state
  const [requestedClockIn, setRequestedClockIn] = React.useState('');
  const [requestedClockOut, setRequestedClockOut] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Initialize form when sheet opens
  React.useEffect(() => {
    if (isOpen && timeEntry) {
      setRequestedClockIn(toLocalDateTimeString(timeEntry.clockIn));
      if (timeEntry.clockOut) {
        setRequestedClockOut(toLocalDateTimeString(timeEntry.clockOut));
      }
      setReason('');
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, timeEntry]);

  // Validation
  const isValid = React.useMemo(() => {
    if (!timeEntry || !reason.trim()) return false;
    if (reason.length > MAX_REASON_LENGTH) return false;
    
    // Check if times are within same day
    if (requestedClockIn && requestedClockOut) {
      if (!isSameDay(requestedClockIn, requestedClockOut)) {
        return false;
      }
    }
    
    // Check if at least one time changed
    const clockInChanged = requestedClockIn !== toLocalDateTimeString(timeEntry.clockIn);
    const clockOutChanged = timeEntry.clockOut && 
      requestedClockOut !== toLocalDateTimeString(timeEntry.clockOut);
    
    return clockInChanged || clockOutChanged;
  }, [timeEntry, requestedClockIn, requestedClockOut, reason]);

  // Calculate time differences
  const clockInDiff = React.useMemo(() => {
    if (!timeEntry || !requestedClockIn) return null;
    return calculateTimeDiff(timeEntry.clockIn, requestedClockIn);
  }, [timeEntry, requestedClockIn]);

  const clockOutDiff = React.useMemo(() => {
    if (!timeEntry?.clockOut || !requestedClockOut) return null;
    return calculateTimeDiff(timeEntry.clockOut, requestedClockOut);
  }, [timeEntry, requestedClockOut]);

  // Handle submit
  const handleSubmit = async () => {
    if (!timeEntry || !organizationSlug || !isValid) return;

    haptic.light();
    setSubmitting(true);
    setError(null);

    const payload = {
      time_entry_id: timeEntry.id,
      requested_clock_in: new Date(requestedClockIn).toISOString(),
      requested_clock_out: requestedClockOut 
        ? new Date(requestedClockOut).toISOString() 
        : null,
      reason: reason.trim(),
    };

    try {
      if (isOnline) {
        const response = await fetch(`/api/v1/org/${organizationSlug}/corrections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || t('corrections.failedSubmit'));
        }
      } else {
        await queueAction('correction-request', organizationSlug, payload);
      }

      haptic.success();
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : t('corrections.failedSubmitRequest'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!timeEntry) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[580]}
      dismissable={!submitting}
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Edit3 className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-charcoal">{t('corrections.requestCorrectionTitle')}</h2>
          </div>
          <p className="text-sm text-kresna-gray">
            {formatDate(timeEntry.clockIn)}
          </p>
        </div>

        {/* Success State */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING_CONFIG}
              className="flex flex-col items-center justify-center py-8 gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...SPRING_CONFIG, delay: 0.1 }}
                className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </motion.div>
              <p className="text-lg font-semibold text-charcoal">{t('corrections.requestSubmitted')}</p>
              <p className="text-sm text-kresna-gray">
                {t('corrections.managerReview')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        {!success && (
          <>
            {/* Current Times (Read-only) */}
            <div className="rounded-xl bg-kresna-light border border-kresna-border p-4 space-y-3">
              <Label className="text-kresna-gray text-xs uppercase tracking-wide">
                {t('corrections.originalTimes')}
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-kresna-gray">{t('corrections.clockIn')}</span>
                  <p className="text-lg font-mono text-kresna-gray-dark">
                    {formatTime(timeEntry.clockIn)}
                  </p>
                </div>
                {timeEntry.clockOut && (
                  <div>
                    <span className="text-xs text-kresna-gray">{t('corrections.clockOut')}</span>
                    <p className="text-lg font-mono text-kresna-gray-dark">
                      {formatTime(timeEntry.clockOut)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Requested Times */}
            <div className="space-y-4">
              <Label className="text-kresna-gray text-xs uppercase tracking-wide">
                {t('corrections.requestedTimes')}
              </Label>
              
              {/* Clock In */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clock-in" className="text-kresna-gray-dark">
                    {t('corrections.clockIn')}
                  </Label>
                  {clockInDiff && (
                    <span className={cn(
                      "text-xs font-mono",
                      clockInDiff.startsWith('+') ? "text-emerald-600" : "text-red-600"
                    )}>
                      {clockInDiff}
                    </span>
                  )}
                </div>
                <Input
                  id="clock-in"
                  type="datetime-local"
                  value={requestedClockIn}
                  onChange={(e) => setRequestedClockIn(e.target.value)}
                  className="bg-kresna-light border-kresna-border text-charcoal"
                />
              </div>

              {/* Clock Out */}
              {timeEntry.clockOut && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clock-out" className="text-kresna-gray-dark">
                      {t('corrections.clockOut')}
                    </Label>
                    {clockOutDiff && (
                      <span className={cn(
                        "text-xs font-mono",
                        clockOutDiff.startsWith('+') ? "text-emerald-600" : "text-red-600"
                      )}>
                        {clockOutDiff}
                      </span>
                    )}
                  </div>
                  <Input
                    id="clock-out"
                    type="datetime-local"
                    value={requestedClockOut}
                    onChange={(e) => setRequestedClockOut(e.target.value)}
                    className="bg-kresna-light border-kresna-border text-charcoal"
                  />
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reason" className="text-kresna-gray-dark">
                  {t('corrections.reason')} <span className="text-red-600">*</span>
                </Label>
                <span className={cn(
                  "text-xs",
                  reason.length > MAX_REASON_LENGTH ? "text-red-600" : "text-kresna-gray"
                )}>
                  {reason.length}/{MAX_REASON_LENGTH}
                </span>
              </div>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('corrections.reasonPlaceholder')}
                rows={3}
                className={cn(
                  "w-full px-3 py-2 rounded-xl resize-none",
                  "bg-kresna-light border border-kresna-border",
                  "text-charcoal placeholder:text-kresna-gray",
                  "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500",
                  "text-sm"
                )}
              />
            </div>

            {/* Validation Warning */}
            {requestedClockIn && requestedClockOut && 
             !isSameDay(requestedClockIn, requestedClockOut) && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  {t('corrections.sameDayWarning')}
                </p>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200"
                >
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                variant="gradient"
                size="xl"
                className="w-full"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('corrections.submitting')}
                  </span>
                ) : (
                  t('corrections.submitRequest')
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
          </>
        )}
      </div>
    </BottomSheet>
  );
}

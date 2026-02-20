/**
 * BreakTimer Component
 * Displays break status and timer for clocked-in employees
 * Shows "Start Break" button when not on break, live timer when on break
 * Supports paid vs unpaid break toggle
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Play, Square, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

// ============================================================================
// Types
// ============================================================================

export interface BreakTimerProps {
  /** Whether the user is currently clocked in */
  isClockedIn: boolean;
  /** Current active break (if any) */
  activeBreak: ActiveBreak | null;
  /** Organization slug for API calls */
  organizationSlug: string;
  /** Callback when break starts */
  onBreakStart?: () => void;
  /** Callback when break ends */
  onBreakEnd?: (durationMinutes: number) => void;
  /** Total break minutes taken today */
  totalBreakMinutes?: number;
  /** Maximum break warning threshold (minutes) */
  maxBreakWarning?: number;
}

export interface ActiveBreak {
  id: string;
  startTime: string; // ISO string
  breakType: 'paid' | 'unpaid';
}

// ============================================================================
// Constants
// ============================================================================

const SPRING_CONFIG = { type: 'spring', damping: 25, stiffness: 300 } as const;

// ============================================================================
// Helper Functions
// ============================================================================

function formatBreakDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Component
// ============================================================================

export function BreakTimer({
  isClockedIn,
  activeBreak,
  organizationSlug,
  onBreakStart,
  onBreakEnd,
  totalBreakMinutes = 0,
  maxBreakWarning = 30,
}: BreakTimerProps) {
  // Hooks
  const { t } = useTranslation();
  const haptic = useHaptic();
  const { isOnline, queueAction } = useOfflineQueue();

  // Local state
  const [breakType, setBreakType] = React.useState<'paid' | 'unpaid'>('unpaid');
  const [isStarting, setIsStarting] = React.useState(false);
  const [isEnding, setIsEnding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  // Calculate elapsed time when on break
  React.useEffect(() => {
    if (!activeBreak) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const startTime = new Date(activeBreak.startTime).getTime();
    const now = Date.now();
    const initialElapsed = Math.floor((now - startTime) / 1000);
    setElapsedSeconds(initialElapsed);

    // Update every second
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBreak]);

  // Check if break exceeds warning threshold
  const isOverWarning = elapsedSeconds > maxBreakWarning * 60;

  // Handle start break
  const handleStartBreak = async () => {
    if (!organizationSlug) return;

    haptic.light();
    setIsStarting(true);
    setError(null);

    try {
      if (isOnline) {
        const response = await fetch(`/api/v1/org/${organizationSlug}/breaks/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ break_type: breakType }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || t('clock.failedStartBreak'));
        }
      } else {
        await queueAction('start-break', organizationSlug, { break_type: breakType });
      }

      haptic.success();
      onBreakStart?.();
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : t('clock.failedStartBreak'));
    } finally {
      setIsStarting(false);
    }
  };

  // Handle end break
  const handleEndBreak = async () => {
    if (!organizationSlug || !activeBreak) return;

    haptic.light();
    setIsEnding(true);
    setError(null);

    try {
      if (isOnline) {
        const response = await fetch(`/api/v1/org/${organizationSlug}/breaks/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || t('clock.failedEndBreak'));
        }
      } else {
        await queueAction('end-break', organizationSlug, {});
      }

      haptic.success();
      const durationMinutes = Math.round(elapsedSeconds / 60);
      onBreakEnd?.(durationMinutes);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : t('clock.failedEndBreak'));
    } finally {
      setIsEnding(false);
    }
  };

  // Don't render if not clocked in
  if (!isClockedIn) {
    return null;
  }

  return (
    <div className="bg-white border border-kresna-border rounded-xl shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-kresna-gray" />
          <span className="text-sm font-medium text-kresna-gray-dark">{t('clock.break')}</span>
        </div>
        {totalBreakMinutes > 0 && (
          <Badge variant="ghost" className="text-xs">
            {t('clock.minToday', { count: totalBreakMinutes })}
          </Badge>
        )}
      </div>

      {/* Break Status */}
      <AnimatePresence mode="wait">
        {activeBreak ? (
          // On Break - Show Timer
          <motion.div
            key="on-break"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={SPRING_CONFIG}
            className="space-y-4"
          >
            {/* Timer Display */}
            <div className="flex flex-col items-center py-4">
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  "text-5xl font-mono font-bold tracking-tight",
                  isOverWarning ? "text-amber-400" : "text-emerald-400"
                )}
              >
                {formatBreakDuration(elapsedSeconds)}
              </motion.div>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant={activeBreak.breakType === 'paid' ? 'success' : 'ghost'}
                  className="text-xs"
                >
                  {activeBreak.breakType === 'paid' ? t('clock.paid') : t('clock.unpaid')}
                </Badge>
                {isOverWarning && (
                  <Badge variant="warning" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t('clock.overMinWarning', { count: maxBreakWarning })}
                  </Badge>
                )}
              </div>
            </div>

            {/* End Break Button */}
            <Button
              onClick={handleEndBreak}
              disabled={isEnding}
              className={cn(
                "w-full h-14 text-lg font-semibold rounded-xl",
                "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isEnding ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('clock.endingBreak')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Square className="h-5 w-5" />
                  {t('clock.endBreak')}
                </span>
              )}
            </Button>
          </motion.div>
        ) : (
          // Not on Break - Show Start Button
          <motion.div
            key="not-on-break"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={SPRING_CONFIG}
            className="space-y-4"
          >
            {/* Break Type Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setBreakType('unpaid')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  "border",
                  breakType === 'unpaid'
                    ? "bg-kresna-light border-kresna-border text-charcoal"
                    : "bg-transparent border-kresna-border text-kresna-gray hover:text-kresna-gray-dark"
                )}
              >
                {t('clock.unpaid')}
              </button>
              <button
                onClick={() => setBreakType('paid')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  "border",
                  breakType === 'paid'
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "bg-transparent border-kresna-border text-kresna-gray hover:text-kresna-gray-dark"
                )}
              >
                {t('clock.paid')}
              </button>
            </div>

            {/* Start Break Button */}
            <Button
              onClick={handleStartBreak}
              disabled={isStarting}
              variant="outline"
              className={cn(
                "w-full h-12 text-base font-medium rounded-xl",
                "border-kresna-border hover:bg-kresna-light"
              )}
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('clock.startingBreak')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  {t('clock.startBreak')}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * useHaptic Hook
 * Provides haptic feedback using the Vibration API for PWA
 * Works on mobile devices that support the Vibration API
 */

import { useCallback } from 'react';

export interface HapticPattern {
  light: number | number[];
  medium: number | number[];
  heavy: number | number[];
  success: number | number[];
  error: number | number[];
  warning: number | number[];
}

const HAPTIC_PATTERNS: HapticPattern = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [20, 100, 20], // Two short pulses
  error: [30, 50, 30, 50, 30], // Three quick pulses
  warning: [40, 100, 40], // Two medium pulses
};

export interface UseHapticReturn {
  vibrate: (pattern: number | number[]) => boolean;
  light: () => boolean;
  medium: () => boolean;
  heavy: () => boolean;
  success: () => boolean;
  error: () => boolean;
  warning: () => boolean;
  isSupported: boolean;
}

/**
 * Hook to provide haptic feedback on supported devices
 */
export function useHaptic(): UseHapticReturn {
  // Check if Vibration API is supported
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  /**
   * Trigger vibration with a custom pattern
   * @param pattern - Vibration pattern (single duration or array of [vibrate, pause, vibrate, ...])
   * @returns true if vibration was triggered successfully
   */
  const vibrate = useCallback(
    (pattern: number | number[]): boolean => {
      if (!isSupported) {
        return false;
      }

      try {
        return navigator.vibrate(pattern);
      } catch (error) {
        console.debug('Haptic feedback failed:', error);
        return false;
      }
    },
    [isSupported]
  );

  /**
   * Light haptic feedback (10ms)
   */
  const light = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.light);
  }, [vibrate]);

  /**
   * Medium haptic feedback (20ms)
   */
  const medium = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.medium);
  }, [vibrate]);

  /**
   * Heavy haptic feedback (40ms)
   */
  const heavy = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.heavy);
  }, [vibrate]);

  /**
   * Success haptic feedback (two short pulses)
   */
  const success = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.success);
  }, [vibrate]);

  /**
   * Error haptic feedback (three quick pulses)
   */
  const error = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.error);
  }, [vibrate]);

  /**
   * Warning haptic feedback (two medium pulses)
   */
  const warning = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.warning);
  }, [vibrate]);

  return {
    vibrate,
    light,
    medium,
    heavy,
    success,
    error,
    warning,
    isSupported,
  };
}

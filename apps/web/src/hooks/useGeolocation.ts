/**
 * useGeolocation Hook
 * Provides access to browser geolocation API with permission handling
 * Supports both single position fetch and continuous watch mode
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean; // Default: true - Request GPS if available
  timeout?: number; // Default: 10000ms (10s)
  maximumAge?: number; // Default: 0 - Don't use cached positions
  watch?: boolean; // Default: false - Continuous updates
}

export interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | null;
  position: GeolocationPosition | null;
  accuracy: number | null; // Meters
  granted: boolean; // Permission status
}

interface UseGeolocationReturn extends GeolocationState {
  requestPermission: () => Promise<void>;
  getCurrentPosition: () => Promise<GeolocationPosition>;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  watch: false,
};

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    position: null,
    accuracy: null,
    granted: false,
  });

  const watchIdRef = useRef<number | null>(null);

  // Check if geolocation is supported
  const isSupported = 'geolocation' in navigator;

  // Request permission explicitly
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: {
          code: 0,
          message: 'Geolocation is not supported by your browser',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Request position to trigger permission prompt
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        });
      });

      setState({
        loading: false,
        error: null,
        position,
        accuracy: position.coords.accuracy,
        granted: true,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as GeolocationPositionError,
        granted: false,
      }));
    }
  }, [isSupported, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  // Get current position once
  const getCurrentPosition = useCallback(async (): Promise<GeolocationPosition> => {
    if (!isSupported) {
      throw new Error('Geolocation is not supported by your browser');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({
            loading: false,
            error: null,
            position,
            accuracy: position.coords.accuracy,
            granted: true,
          });
          resolve(position);
        },
        (error) => {
          setState(prev => ({
            ...prev,
            loading: false,
            error,
            granted: error.code !== error.PERMISSION_DENIED,
          }));
          reject(error);
        },
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        }
      );
    });
  }, [isSupported, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  // Watch position continuously
  useEffect(() => {
    if (!isSupported || !opts.watch) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          loading: false,
          error: null,
          position,
          accuracy: position.coords.accuracy,
          granted: true,
        });
      },
      (error) => {
        setState(prev => ({
          ...prev,
          loading: false,
          error,
          granted: error.code !== error.PERMISSION_DENIED,
        }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );

    // Cleanup on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSupported, opts.watch, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  return {
    ...state,
    requestPermission,
    getCurrentPosition,
  };
}

/**
 * Helper function to format accuracy in meters
 */
export function formatAccuracy(meters: number): string {
  if (meters < 1) {
    return '< 1m';
  }
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Helper function to check if accuracy is acceptable
 * Returns true if accuracy is better than 50 meters
 */
export function isAccuracyAcceptable(meters: number): boolean {
  return meters <= 50;
}

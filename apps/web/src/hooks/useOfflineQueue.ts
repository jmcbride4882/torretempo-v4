/**
 * useOfflineQueue Hook
 * React hook for managing offline action queueing and processing.
 *
 * Provides reactive state for:
 * - Online/offline detection
 * - Queue length and statistics
 * - Syncing status and errors
 * - Queueing new actions
 * - Manual queue processing
 *
 * Automatically processes queue when coming back online.
 * Polls queue stats every 10 seconds for freshness.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import {
  offlineQueue,
  type QueuedAction,
  type QueuedActionType,
} from '@/lib/offline-queue';
import {
  registerBackgroundSync,
  setupBackgroundSyncListener,
  isBackgroundSyncSupported,
} from '@/lib/background-sync';

// ============================================================================
// Types
// ============================================================================

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
}

export interface UseOfflineQueueReturn {
  /** Whether the device is currently online */
  isOnline: boolean;
  /** Detailed queue statistics (total, pending, processing, failed) */
  queueStats: QueueStats | null;
  /** List of pending actions awaiting processing */
  pendingActions: QueuedAction[];
  /** Number of pending actions in the queue */
  queueLength: number;
  /** Whether the queue is currently being synced */
  isSyncing: boolean;
  /** Alias for isSyncing (backward compat) */
  isProcessing: boolean;
  /** Error message from the last sync attempt, if any */
  lastSyncError: string | null;
  /** Queue an action for offline processing */
  queueAction: (
    action: QueuedActionType,
    organizationSlug: string,
    payload: Record<string, unknown>
  ) => Promise<string>;
  /** @deprecated Use queueAction instead */
  enqueue: (
    action: QueuedActionType,
    organizationSlug: string,
    payload: Record<string, unknown>
  ) => Promise<string>;
  /** Manually trigger queue processing */
  processQueue: () => Promise<{ processed: number; failed: number }>;
  /** @deprecated Use processQueue instead */
  processNow: () => Promise<{ processed: number; failed: number }>;
  /** Force refresh of queue stats */
  refreshStats: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

/** How often to poll queue stats (milliseconds) */
const POLL_INTERVAL_MS = 10_000;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to manage the offline action queue.
 *
 * Initializes the OfflineQueue singleton, subscribes to queue changes,
 * listens for online/offline events, and provides reactive state + actions.
 *
 * @example
 * ```tsx
 * const { queueAction, queueLength, isOnline, isSyncing } = useOfflineQueue();
 *
 * // Queue a clock-in when offline
 * await queueAction('clock-in', 'my-org', {
 *   clock_in_location: { lat: 40.41, lng: -3.70, accuracy: 12 },
 *   clock_in_method: 'tap',
 * });
 *
 * // Show offline indicator
 * {!isOnline && <Badge>Offline ({queueLength} pending)</Badge>}
 * ```
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Ref to avoid stale closure in processQueue callback
  const isSyncingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Refresh queue stats from IndexedDB
  // ---------------------------------------------------------------------------

  const refreshStats = useCallback(async () => {
    try {
      const [stats, pending, length] = await Promise.all([
        offlineQueue.getQueueStats(),
        offlineQueue.getPendingActions(),
        offlineQueue.getQueueLength(),
      ]);
      setQueueStats(stats);
      setPendingActions(pending);
      setQueueLength(length);
    } catch (error) {
      console.error('[useOfflineQueue] Failed to refresh stats:', error);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Process queue
  // ---------------------------------------------------------------------------

  const processQueueHandler = useCallback(async (): Promise<{
    processed: number;
    failed: number;
  }> => {
    if (isSyncingRef.current) {
      return { processed: 0, failed: 0 };
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const result = await offlineQueue.processQueue();
      await refreshStats();
      return result;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown sync error';
      setLastSyncError(message);
      console.error('[useOfflineQueue] Failed to process queue:', error);
      return { processed: 0, failed: 0 };
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshStats]);

  // ---------------------------------------------------------------------------
  // Queue an action
  // ---------------------------------------------------------------------------

  const queueAction = useCallback(
    async (
      action: QueuedActionType,
      organizationSlug: string,
      payload: Record<string, unknown>
    ): Promise<string> => {
      try {
        const actionId = await offlineQueue.add(
          action,
          organizationSlug,
          payload
        );
        await refreshStats();

        // Register background sync to process queue when online
        if (isBackgroundSyncSupported()) {
          await registerBackgroundSync('offline-queue-sync');
        }

        return actionId;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to queue action';
        setLastSyncError(message);
        console.error('[useOfflineQueue] Failed to queue action:', error);
        throw error;
      }
    },
    [refreshStats]
  );

  // ---------------------------------------------------------------------------
  // Lifecycle: init, events, polling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Initialize the queue singleton
    offlineQueue.init().then(() => {
      refreshStats();
    });

    // Subscribe to queue changes (fires on add, process, purge, etc.)
    offlineQueue.setOnQueueChange(() => {
      refreshStats();
    });

    // Online/offline event handlers
    const handleOnline = () => {
      setIsOnline(true);

      // Register background sync if supported
      if (isBackgroundSyncSupported()) {
        registerBackgroundSync('offline-queue-sync');
      }

      // Auto-process queue when coming online
      processQueueHandler();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup background sync message listener
    setupBackgroundSyncListener((_tag, _success) => {
      refreshStats();
    });

    // Register background sync on mount if online
    if (navigator.onLine && isBackgroundSyncSupported()) {
      registerBackgroundSync('offline-queue-sync');
    }

    // Poll queue stats every 10 seconds for freshness
    const pollInterval = setInterval(refreshStats, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pollInterval);
      offlineQueue.setOnQueueChange(null);
    };
  }, [refreshStats, processQueueHandler]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    isOnline,
    queueStats,
    pendingActions,
    queueLength,
    isSyncing,
    isProcessing: isSyncing, // backward compat alias
    lastSyncError,

    // Actions
    queueAction,
    enqueue: queueAction, // backward compat alias
    processQueue: processQueueHandler,
    processNow: processQueueHandler, // backward compat alias
    refreshStats,
  };
}

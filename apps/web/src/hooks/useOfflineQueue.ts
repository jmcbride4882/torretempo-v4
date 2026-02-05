/**
 * useOfflineQueue Hook
 * Manages offline action queueing and processing
 */

import { useState, useEffect, useCallback } from 'react';
import {
  enqueueAction,
  getPendingActions,
  getQueueStats,
  processQueue,
  type QueuedAction,
} from '@/lib/offline-queue';

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
}

export interface UseOfflineQueueReturn {
  isOnline: boolean;
  queueStats: QueueStats | null;
  pendingActions: QueuedAction[];
  isProcessing: boolean;
  enqueue: (
    type: QueuedAction['type'],
    organizationSlug: string,
    data: Record<string, any>
  ) => Promise<string>;
  processNow: () => Promise<{ processed: number; failed: number }>;
  refreshStats: () => Promise<void>;
}

/**
 * Hook to manage offline action queue
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Refresh queue statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const stats = await getQueueStats();
      setQueueStats(stats);

      const pending = await getPendingActions();
      setPendingActions(pending);
    } catch (error) {
      console.error('[useOfflineQueue] Failed to refresh stats:', error);
    }
  }, []);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[useOfflineQueue] Device is online');
      setIsOnline(true);

      // Auto-process queue when coming online
      if (!isProcessing) {
        await processNow();
      }
    };

    const handleOffline = () => {
      console.log('[useOfflineQueue] Device is offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial stats load
    refreshStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Enqueue an action (wrapper around offline-queue.ts)
   */
  const enqueue = useCallback(
    async (
      type: QueuedAction['type'],
      organizationSlug: string,
      data: Record<string, any>
    ): Promise<string> => {
      const actionId = await enqueueAction(type, organizationSlug, data);
      await refreshStats();
      return actionId;
    },
    [refreshStats]
  );

  /**
   * Process queue now (can be called manually)
   */
  const processNow = useCallback(async (): Promise<{
    processed: number;
    failed: number;
  }> => {
    if (isProcessing) {
      console.log('[useOfflineQueue] Already processing');
      return { processed: 0, failed: 0 };
    }

    setIsProcessing(true);

    try {
      const result = await processQueue();
      await refreshStats();
      return result;
    } catch (error) {
      console.error('[useOfflineQueue] Failed to process queue:', error);
      return { processed: 0, failed: 0 };
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshStats]);

  return {
    isOnline,
    queueStats,
    pendingActions,
    isProcessing,
    enqueue,
    processNow,
    refreshStats,
  };
}

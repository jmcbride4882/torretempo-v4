/**
 * Offline Queue using IndexedDB
 * Stores actions (clock-in, clock-out, breaks, corrections) when offline
 * Processes queue when connection is restored with exponential backoff
 * Auto-purges actions older than 7 days on initialization
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ============================================================================
// Types
// ============================================================================

/** Supported offline action types */
export type QueuedActionType =
  | 'clock-in'
  | 'clock-out'
  | 'start-break'
  | 'end-break'
  | 'correction-request';

/** Status lifecycle: pending → processing → success (removed) | failed */
export type QueuedActionStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface QueuedAction {
  id: string;
  action: QueuedActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
  status: QueuedActionStatus;
  error?: string;
  organizationSlug: string;
}

interface OfflineQueueDB extends DBSchema {
  actions: {
    key: string;
    value: QueuedAction;
    indexes: {
      timestamp: number;
      status: QueuedActionStatus;
    };
  };
}

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'torretempo-queue';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

/** Maximum retry attempts before marking as failed */
const MAX_RETRIES = 3;

/** 7 days in milliseconds for purge threshold */
const PURGE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/** Base delay for exponential backoff (1 second) */
const BACKOFF_BASE_MS = 1000;

/** Maximum backoff delay (10 seconds) */
const BACKOFF_MAX_MS = 10000;

// ============================================================================
// OfflineQueue Class
// ============================================================================

/**
 * Manages an IndexedDB-backed queue of offline actions.
 * Singleton instance exported as `offlineQueue`.
 *
 * Features:
 * - IndexedDB persistence via `idb` package
 * - 5 action types: clock-in, clock-out, start-break, end-break, correction-request
 * - Auto-processes queue when `window.online` event fires
 * - Exponential backoff retries (1s, 2s, 4s) up to 3 attempts
 * - Auto-purges actions older than 7 days on init
 */
export class OfflineQueue {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;
  private isProcessing = false;
  private initialized = false;
  private onlineHandler: (() => void) | null = null;

  // Callback for external state listeners (used by the React hook)
  private onQueueChange: (() => void) | null = null;

  /**
   * Register a callback invoked whenever the queue changes
   * (action added, processed, failed, or purged).
   */
  setOnQueueChange(callback: (() => void) | null): void {
    this.onQueueChange = callback;
  }

  private notifyChange(): void {
    if (this.onQueueChange) {
      this.onQueueChange();
    }
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the IndexedDB database and set up event listeners.
   * Safe to call multiple times — will no-op after first init.
   */
  async init(): Promise<void> {
    if (this.initialized && this.db) return;

    this.db = await openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('status', 'status');
        }
      },
    });

    // Purge stale actions on startup
    await this.purgeOldActions();

    // Listen for online event to auto-process
    if (typeof window !== 'undefined' && !this.onlineHandler) {
      this.onlineHandler = () => {
        this.processQueue();
      };
      window.addEventListener('online', this.onlineHandler);
    }

    this.initialized = true;
  }

  /**
   * Ensure database is ready before any operation.
   */
  private async ensureDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Clean up event listeners. Call when unmounting/disposing.
   */
  destroy(): void {
    if (this.onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    this.onQueueChange = null;
    this.initialized = false;
    this.db = null;
  }

  // --------------------------------------------------------------------------
  // Queue Operations
  // --------------------------------------------------------------------------

  /**
   * Add an action to the offline queue.
   * If online, immediately attempts to process the queue.
   */
  async add(
    action: QueuedActionType,
    organizationSlug: string,
    payload: Record<string, unknown>
  ): Promise<string> {
    const db = await this.ensureDB();

    const id = crypto.randomUUID();
    const queuedAction: QueuedAction = {
      id,
      action,
      payload,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      organizationSlug,
    };

    await db.add(STORE_NAME, queuedAction);
    this.notifyChange();

    // Try to process immediately if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      // Fire-and-forget — don't await to avoid blocking the caller
      this.processQueue();
    }

    return id;
  }

  /**
   * Get all pending actions sorted by timestamp (oldest first).
   */
  async getPendingActions(): Promise<QueuedAction[]> {
    const db = await this.ensureDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('status');
    const actions = await index.getAll('pending');
    return actions.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all actions regardless of status.
   */
  async getAllActions(): Promise<QueuedAction[]> {
    const db = await this.ensureDB();
    const actions = await db.getAll(STORE_NAME);
    return actions.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get a single action by ID.
   */
  async getAction(id: string): Promise<QueuedAction | undefined> {
    const db = await this.ensureDB();
    return db.get(STORE_NAME, id);
  }

  /**
   * Remove an action from the queue.
   */
  async removeAction(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete(STORE_NAME, id);
    this.notifyChange();
  }

  /**
   * Clear all actions from the queue.
   */
  async clearQueue(): Promise<void> {
    const db = await this.ensureDB();
    await db.clear(STORE_NAME);
    this.notifyChange();
  }

  /**
   * Get the count of pending actions.
   */
  async getQueueLength(): Promise<number> {
    const db = await this.ensureDB();
    const pending = await db.getAllFromIndex(STORE_NAME, 'status', 'pending');
    return pending.length;
  }

  /**
   * Get queue statistics by status.
   */
  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
  }> {
    const db = await this.ensureDB();
    const actions = await db.getAll(STORE_NAME);

    return {
      total: actions.length,
      pending: actions.filter((a) => a.status === 'pending').length,
      processing: actions.filter((a) => a.status === 'processing').length,
      failed: actions.filter((a) => a.status === 'failed').length,
    };
  }

  // --------------------------------------------------------------------------
  // Queue Processing
  // --------------------------------------------------------------------------

  /** Whether the queue is currently being processed */
  get processing(): boolean {
    return this.isProcessing;
  }

  /**
   * Process all pending actions in the queue sequentially.
   * Skips if already processing or offline.
   *
   * Returns counts of processed and failed actions.
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    this.notifyChange();

    let processed = 0;
    let failed = 0;

    try {
      const db = await this.ensureDB();
      const pendingActions = await this.getPendingActions();

      if (pendingActions.length === 0) {
        return { processed: 0, failed: 0 };
      }

      // Process actions sequentially to maintain chronological order
      for (const action of pendingActions) {
        try {
          // Mark as processing
          await db.put(STORE_NAME, { ...action, status: 'processing' as const });
          this.notifyChange();

          // Execute the API call
          await this.executeAction(action);

          // Success — remove from queue
          await db.delete(STORE_NAME, action.id);
          processed++;
          this.notifyChange();
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          const newRetries = action.retries + 1;

          if (newRetries >= MAX_RETRIES) {
            // Max retries exhausted — mark as permanently failed
            await db.put(STORE_NAME, {
              ...action,
              retries: newRetries,
              status: 'failed' as const,
              error: errorMessage,
            });
            failed++;
            this.notifyChange();
          } else {
            // Apply exponential backoff: 1s, 2s, 4s (capped at 10s)
            const backoffMs = Math.min(
              BACKOFF_BASE_MS * Math.pow(2, action.retries),
              BACKOFF_MAX_MS
            );
            await this.delay(backoffMs);

            // Reset to pending for next attempt
            await db.put(STORE_NAME, {
              ...action,
              retries: newRetries,
              status: 'pending' as const,
              error: errorMessage,
            });
            this.notifyChange();
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.notifyChange();
    }

    return { processed, failed };
  }

  /**
   * Process a single action. Exposed for external callers that need
   * fine-grained control (e.g., background sync service worker).
   */
  async processAction(action: QueuedAction): Promise<boolean> {
    const db = await this.ensureDB();

    try {
      await db.put(STORE_NAME, { ...action, status: 'processing' as const });
      this.notifyChange();

      await this.executeAction(action);

      await db.delete(STORE_NAME, action.id);
      this.notifyChange();
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const newRetries = action.retries + 1;

      if (newRetries >= MAX_RETRIES) {
        await db.put(STORE_NAME, {
          ...action,
          retries: newRetries,
          status: 'failed' as const,
          error: errorMessage,
        });
      } else {
        await db.put(STORE_NAME, {
          ...action,
          retries: newRetries,
          status: 'pending' as const,
          error: errorMessage,
        });
      }

      this.notifyChange();
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Action Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a queued action by calling the appropriate API endpoint.
   * Uses dynamic import to avoid circular dependencies with API client.
   */
  private async executeAction(action: QueuedAction): Promise<void> {
    const {
      clockIn,
      clockOut,
      startBreak,
      endBreak,
      createCorrection,
    } = await import('./api/time-entries');

    const slug = action.organizationSlug;
    const data = action.payload;

    switch (action.action) {
      case 'clock-in':
        await clockIn(slug, data as unknown as Parameters<typeof clockIn>[1]);
        break;

      case 'clock-out':
        await clockOut(
          slug,
          data.entryId as string,
          data as unknown as Parameters<typeof clockOut>[2]
        );
        break;

      case 'start-break':
        await startBreak(
          slug,
          data.entryId as string,
          data as unknown as Parameters<typeof startBreak>[2]
        );
        break;

      case 'end-break':
        await endBreak(
          slug,
          data.entryId as string,
          data.breakId as string
        );
        break;

      case 'correction-request':
        await createCorrection(
          slug,
          data as unknown as Parameters<typeof createCorrection>[1]
        );
        break;

      default: {
        // Exhaustive check — should never reach here
        const _exhaustive: never = action.action;
        throw new Error(`Unknown action type: ${String(_exhaustive)}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Purge & Maintenance
  // --------------------------------------------------------------------------

  /**
   * Remove all actions older than 7 days regardless of status.
   * Called automatically on init.
   */
  async purgeOldActions(): Promise<number> {
    const db = await this.ensureDB();
    const cutoff = Date.now() - PURGE_THRESHOLD_MS;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('timestamp');

    // Use cursor to iterate actions by timestamp
    let cursor = await index.openCursor();
    let purgedCount = 0;

    while (cursor) {
      if (cursor.value.timestamp < cutoff) {
        await cursor.delete();
        purgedCount++;
      } else {
        // Timestamps are sorted — once we pass cutoff, all remaining are newer
        break;
      }
      cursor = await cursor.continue();
    }

    await tx.done;

    if (purgedCount > 0) {
      this.notifyChange();
    }

    return purgedCount;
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const offlineQueue = new OfflineQueue();

// ============================================================================
// Legacy Function Exports (backward compatibility)
// ============================================================================

/**
 * @deprecated Use `offlineQueue.add()` instead
 */
export async function enqueueAction(
  type: QueuedActionType,
  organizationSlug: string,
  data: Record<string, unknown>
): Promise<string> {
  return offlineQueue.add(type, organizationSlug, data);
}

/**
 * @deprecated Use `offlineQueue.getPendingActions()` instead
 */
export async function getPendingActions(): Promise<QueuedAction[]> {
  return offlineQueue.getPendingActions();
}

/**
 * @deprecated Use `offlineQueue.getAllActions()` instead
 */
export async function getAllActions(): Promise<QueuedAction[]> {
  return offlineQueue.getAllActions();
}

/**
 * @deprecated Use `offlineQueue.getAction()` instead
 */
export async function getAction(
  id: string
): Promise<QueuedAction | undefined> {
  return offlineQueue.getAction(id);
}

/**
 * @deprecated Use `offlineQueue.removeAction()` instead
 */
export async function removeAction(id: string): Promise<void> {
  return offlineQueue.removeAction(id);
}

/**
 * @deprecated Use `offlineQueue.clearQueue()` instead
 */
export async function clearQueue(): Promise<void> {
  return offlineQueue.clearQueue();
}

/**
 * @deprecated Use `offlineQueue.getQueueStats()` instead
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  failed: number;
}> {
  return offlineQueue.getQueueStats();
}

/**
 * @deprecated Use `offlineQueue.processAction()` instead
 */
export async function processAction(action: QueuedAction): Promise<boolean> {
  return offlineQueue.processAction(action);
}

/**
 * @deprecated Use `offlineQueue.processQueue()` instead
 */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  return offlineQueue.processQueue();
}

/**
 * Legacy compat: update action status directly.
 * @deprecated Prefer offlineQueue.processAction() for managed status transitions
 */
export async function updateActionStatus(
  id: string,
  status: QueuedActionStatus,
  error?: string
): Promise<void> {
  const action = await offlineQueue.getAction(id);
  if (!action) return;

  const db = await openDB<OfflineQueueDB>(DB_NAME, DB_VERSION);
  await db.put(STORE_NAME, {
    ...action,
    status,
    ...(error ? { error } : {}),
  });
}

/**
 * Legacy compat: increment retry count.
 * @deprecated Retry management is now internal to processQueue
 */
export async function incrementRetryCount(id: string): Promise<number> {
  const action = await offlineQueue.getAction(id);
  if (!action) return 0;

  const db = await openDB<OfflineQueueDB>(DB_NAME, DB_VERSION);
  const updated = { ...action, retries: action.retries + 1 };
  await db.put(STORE_NAME, updated);
  return updated.retries;
}

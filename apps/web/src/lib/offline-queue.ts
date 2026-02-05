/**
 * Offline Queue using IndexedDB
 * Stores actions (clock-in, clock-out, breaks, etc.) when offline
 * Processes queue when connection is restored
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================================================
// Types
// ============================================================================

export interface QueuedAction {
  id: string;
  type: 'clock-in' | 'clock-out' | 'start-break' | 'end-break';
  timestamp: number;
  organizationSlug: string;
  data: Record<string, any>;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

interface OfflineQueueDB extends DBSchema {
  actions: {
    key: string;
    value: QueuedAction;
    indexes: { 'by-status': string; 'by-timestamp': number };
  };
}

// ============================================================================
// IndexedDB Setup
// ============================================================================

const DB_NAME = 'torretempo-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

let dbPromise: Promise<IDBPDatabase<OfflineQueueDB>> | null = null;

/**
 * Initialize IndexedDB
 */
async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create actions store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Add an action to the offline queue
 */
export async function enqueueAction(
  type: QueuedAction['type'],
  organizationSlug: string,
  data: Record<string, any>
): Promise<string> {
  const db = await getDB();
  
  const action: QueuedAction = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    timestamp: Date.now(),
    organizationSlug,
    data,
    retryCount: 0,
    status: 'pending',
  };

  await db.add(STORE_NAME, action);
  
  console.log('[OfflineQueue] Enqueued action:', action.id, action.type);
  
  return action.id;
}

/**
 * Get all pending actions from the queue
 */
export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const index = tx.store.index('by-status');
  
  const actions = await index.getAll('pending');
  
  // Sort by timestamp (oldest first)
  return actions.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get all actions (for debugging/display)
 */
export async function getAllActions(): Promise<QueuedAction[]> {
  const db = await getDB();
  const actions = await db.getAll(STORE_NAME);
  
  return actions.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get action by ID
 */
export async function getAction(id: string): Promise<QueuedAction | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * Update action status
 */
export async function updateActionStatus(
  id: string,
  status: QueuedAction['status'],
  error?: string
): Promise<void> {
  const db = await getDB();
  const action = await db.get(STORE_NAME, id);
  
  if (!action) {
    console.error('[OfflineQueue] Action not found:', id);
    return;
  }

  action.status = status;
  if (error) {
    action.error = error;
  }

  await db.put(STORE_NAME, action);
  
  console.log('[OfflineQueue] Updated action status:', id, status);
}

/**
 * Increment retry count for an action
 */
export async function incrementRetryCount(id: string): Promise<number> {
  const db = await getDB();
  const action = await db.get(STORE_NAME, id);
  
  if (!action) {
    console.error('[OfflineQueue] Action not found:', id);
    return 0;
  }

  action.retryCount += 1;
  await db.put(STORE_NAME, action);
  
  return action.retryCount;
}

/**
 * Remove action from queue
 */
export async function removeAction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
  
  console.log('[OfflineQueue] Removed action:', id);
}

/**
 * Clear all actions from queue
 */
export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
  
  console.log('[OfflineQueue] Cleared all actions');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  failed: number;
}> {
  const db = await getDB();
  const actions = await db.getAll(STORE_NAME);
  
  return {
    total: actions.length,
    pending: actions.filter(a => a.status === 'pending').length,
    processing: actions.filter(a => a.status === 'processing').length,
    failed: actions.filter(a => a.status === 'failed').length,
  };
}

// ============================================================================
// Queue Processing
// ============================================================================

/**
 * Process a single action from the queue
 */
export async function processAction(action: QueuedAction): Promise<boolean> {
  console.log('[OfflineQueue] Processing action:', action.id, action.type);
  
  try {
    // Update status to processing
    await updateActionStatus(action.id, 'processing');

    // Import API functions dynamically to avoid circular dependencies
    const { clockIn, clockOut, startBreak, endBreak } = await import('./api/time-entries');

    // Process based on action type
    switch (action.type) {
      case 'clock-in':
        await clockIn(action.organizationSlug, action.data as any);
        break;
      
      case 'clock-out':
        await clockOut(action.organizationSlug, action.data.entryId, action.data as any);
        break;
      
      case 'start-break':
        await startBreak(action.organizationSlug, action.data.entryId, action.data as any);
        break;
      
      case 'end-break':
        await endBreak(action.organizationSlug, action.data.entryId, action.data.breakId);
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    // Remove action from queue on success
    await removeAction(action.id);
    
    console.log('[OfflineQueue] Successfully processed action:', action.id);
    
    return true;
  } catch (error: any) {
    console.error('[OfflineQueue] Failed to process action:', action.id, error);
    
    // Increment retry count
    const retryCount = await incrementRetryCount(action.id);
    
    // Mark as failed if too many retries (max 3)
    if (retryCount >= 3) {
      await updateActionStatus(action.id, 'failed', error.message || 'Unknown error');
      console.error('[OfflineQueue] Action failed after 3 retries:', action.id);
    } else {
      // Reset to pending for retry
      await updateActionStatus(action.id, 'pending', error.message);
    }
    
    return false;
  }
}

/**
 * Process all pending actions in the queue
 */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  console.log('[OfflineQueue] Processing queue...');
  
  const pendingActions = await getPendingActions();
  
  if (pendingActions.length === 0) {
    console.log('[OfflineQueue] No pending actions');
    return { processed: 0, failed: 0 };
  }

  console.log('[OfflineQueue] Found', pendingActions.length, 'pending actions');

  let processed = 0;
  let failed = 0;

  // Process actions sequentially (to maintain order)
  for (const action of pendingActions) {
    const success = await processAction(action);
    if (success) {
      processed++;
    } else {
      failed++;
    }
  }

  console.log('[OfflineQueue] Processed:', processed, 'Failed:', failed);

  return { processed, failed };
}

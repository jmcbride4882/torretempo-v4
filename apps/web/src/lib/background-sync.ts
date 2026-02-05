/**
 * Background Sync API integration
 * Registers sync events to process offline queue when connection is restored
 */

/**
 * Check if Background Sync API is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window
  );
}

/**
 * Register a background sync event
 * This will trigger when the device comes online or when the service worker decides
 */
export async function registerBackgroundSync(tag: string = 'offline-queue-sync'): Promise<boolean> {
  if (!isBackgroundSyncSupported()) {
    console.log('[BackgroundSync] Background Sync API not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if SyncManager is available on the registration
    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log('[BackgroundSync] Registered sync event:', tag);
      return true;
    } else {
      console.log('[BackgroundSync] SyncManager not available on registration');
      return false;
    }
  } catch (error) {
    console.error('[BackgroundSync] Failed to register sync:', error);
    return false;
  }
}

/**
 * Get list of registered sync tags
 */
export async function getSyncTags(): Promise<string[]> {
  if (!isBackgroundSyncSupported()) {
    return [];
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if ('sync' in registration) {
      return await (registration as any).sync.getTags();
    }
    
    return [];
  } catch (error) {
    console.error('[BackgroundSync] Failed to get sync tags:', error);
    return [];
  }
}

/**
 * Setup background sync message listener
 * Listens for messages from service worker about sync events
 */
export function setupBackgroundSyncListener(
  onSyncComplete?: (tag: string, success: boolean) => void
): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_COMPLETE') {
      console.log('[BackgroundSync] Sync completed:', event.data);
      
      if (onSyncComplete) {
        onSyncComplete(event.data.tag, event.data.success);
      }
    }
  });
}

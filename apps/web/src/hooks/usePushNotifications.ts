/**
 * Push Notifications Hook
 *
 * Manages Web Push subscription lifecycle:
 * - Checks browser support and permission
 * - Fetches VAPID public key from server
 * - Subscribes/unsubscribes to push notifications
 * - Persists subscription on the server
 */

import { useState, useEffect, useCallback } from 'react';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  error: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function usePushNotifications(orgSlug?: string): UsePushNotificationsReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const permission: NotificationPermission | 'unsupported' = isSupported
    ? Notification.permission
    : 'unsupported';

  // Fetch VAPID key and check existing subscription
  useEffect(() => {
    if (!isSupported || !orgSlug) {
      setIsLoading(false);
      return;
    }

    async function init() {
      try {
        // Fetch VAPID key
        const res = await fetch(`/api/v1/org/${orgSlug}/notifications/push/vapid-key`);
        if (res.ok) {
          const { publicKey } = await res.json();
          setVapidKey(publicKey);
        }

        // Check if already subscribed
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Push init error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [isSupported, orgSlug]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidKey || !orgSlug) return;
    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setError('Notification permission denied');
        return;
      }

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      // Send subscription to server
      const subJSON = subscription.toJSON();
      const res = await fetch(`/api/v1/org/${orgSlug}/notifications/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: subJSON.endpoint,
            keys: subJSON.keys,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Server rejected subscription');
      }

      setIsSubscribed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
      console.error('Push subscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidKey, orgSlug]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !orgSlug) return;
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify server
        await fetch(`/api/v1/org/${orgSlug}/notifications/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err: any) {
      setError(err.message || 'Failed to unsubscribe');
      console.error('Push unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, orgSlug]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    error,
  };
}

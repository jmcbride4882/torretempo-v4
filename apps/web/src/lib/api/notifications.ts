/**
 * Notification API client
 * Handles all notification-related API calls
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type NotificationType =
  | 'swap_requested'
  | 'swap_accepted'
  | 'swap_rejected'
  | 'swap_manager_needed'
  | 'swap_approved'
  | 'swap_completed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

/**
 * Fetch notifications for the current organization
 */
export async function fetchNotifications(
  orgSlug: string,
  options?: {
    read?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  
  if (options?.read !== undefined) {
    params.set('read', String(options.read));
  }
  if (options?.limit) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset) {
    params.set('offset', String(options.offset));
  }

  const response = await fetch(
    `${API_URL}/api/v1/org/${orgSlug}/notifications?${params.toString()}`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(orgSlug: string): Promise<number> {
  const response = await fetch(
    `${API_URL}/api/v1/org/${orgSlug}/notifications/unread-count`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }

  const data: UnreadCountResponse = await response.json();
  return data.count;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  orgSlug: string,
  notificationId: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/v1/org/${orgSlug}/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(orgSlug: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/v1/org/${orgSlug}/notifications/mark-all-read`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
}

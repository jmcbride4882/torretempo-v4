/**
 * Notifications Page
 *
 * Full notification list with filters, mark-as-read, push subscription toggle.
 * Mobile-first glassmorphism dark design per architecture doc.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Inbox,
  ArrowLeftRight,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/api/notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { Notification } from '@/lib/api/notifications';

// ============================================================================
// Types
// ============================================================================

type NotificationFilter = 'all' | 'unread';

// ============================================================================
// Helpers
// ============================================================================

function getNotificationIcon(type: string) {
  switch (type) {
    case 'swap_requested':
    case 'swap_accepted':
    case 'swap_rejected':
    case 'swap_manager_needed':
    case 'swap_approved':
    case 'swap_completed':
      return ArrowLeftRight;
    case 'shift_published':
    case 'shift_updated':
      return Calendar;
    case 'time_entry_reminder':
      return Clock;
    case 'approval_needed':
      return FileText;
    case 'compliance_alert':
      return AlertTriangle;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string) {
  if (type.startsWith('swap_')) return 'text-primary-400 bg-primary-500/20';
  if (type.startsWith('shift_')) return 'text-emerald-400 bg-emerald-500/20';
  if (type === 'compliance_alert') return 'text-amber-400 bg-amber-500/20';
  if (type === 'approval_needed') return 'text-amber-400 bg-amber-500/20';
  return 'text-neutral-400 bg-zinc-800/50';
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ============================================================================
// Skeleton
// ============================================================================

function NotificationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl p-4 border border-zinc-800/50">
          <div className="h-10 w-10 rounded-lg bg-zinc-800/50 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-zinc-800/50" />
            <div className="h-3 w-1/2 rounded bg-zinc-800/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Notification Item
// ============================================================================

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={handleClick}
      className={cn(
        'flex gap-3 rounded-xl p-4 border transition-all cursor-pointer',
        notification.read
          ? 'border-zinc-800/30 bg-transparent hover:bg-white/[0.02]'
          : 'border-primary-500/20 bg-primary-500/5 hover:bg-primary-500/10'
      )}
    >
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', notification.read ? 'text-neutral-400' : 'font-medium text-white')}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-[11px] text-neutral-600 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NotificationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const push = usePushNotifications(slug);

  // Fetch notifications
  const loadNotifications = useCallback(
    async (silent = false) => {
      if (!slug) return;
      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const [notifRes, count] = await Promise.all([
          fetchNotifications(slug, {
            read: filter === 'unread' ? false : undefined,
            limit: 50,
          }),
          fetchUnreadCount(slug),
        ]);
        setNotifications(notifRes.notifications || []);
        setUnreadCount(count);
      } catch (err) {
        console.error('Error loading notifications:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [slug, filter]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark single as read
  const handleMarkRead = async (id: string) => {
    if (!slug) return;
    try {
      await markAsRead(slug, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (!slug) return;
    try {
      await markAllAsRead(slug);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
            <Bell className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-neutral-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadNotifications(true)}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Push notification banner */}
      {push.isSupported && !push.isSubscribed && push.permission !== 'denied' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Enable push notifications</p>
              <p className="text-xs text-neutral-400">Get notified about shifts and swaps even when the app is closed</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={push.subscribe}
            disabled={push.isLoading}
          >
            Enable
          </Button>
        </motion.div>
      )}

      {push.isSupported && push.isSubscribed && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Push notifications enabled</span>
          </div>
          <button
            onClick={push.unsubscribe}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Disable
          </button>
        </div>
      )}

      {/* Filter + Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-all capitalize',
                filter === f
                  ? 'bg-primary-500/20 text-primary-400 font-medium'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-zinc-800/30 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-neutral-600" />
          </div>
          <p className="text-lg font-medium text-neutral-400">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-sm text-neutral-600 mt-1">
            {filter === 'unread'
              ? 'You\'re all caught up!'
              : 'Notifications about shifts, swaps, and approvals will appear here'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

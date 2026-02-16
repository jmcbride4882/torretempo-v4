import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

function getNotificationColor(type: string): string {
  if (type.startsWith('swap_')) return 'text-primary-600 bg-primary-50';
  if (type.startsWith('shift_')) return 'text-emerald-600 bg-emerald-50';
  if (type === 'compliance_alert') return 'text-amber-600 bg-amber-50';
  if (type === 'approval_needed') return 'text-amber-600 bg-amber-50';
  return 'text-zinc-500 bg-zinc-100';
}

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return t('common.timeAgo.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('common.timeAgo.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.timeAgo.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('common.timeAgo.daysAgo', { count: days });
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ============================================================================
// Skeleton
// ============================================================================

function NotificationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="h-10 w-10 rounded-lg bg-zinc-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-zinc-100" />
            <div className="h-3 w-1/2 rounded bg-zinc-50" />
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
  const { t } = useTranslation();
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
    <div
      onClick={handleClick}
      className={cn(
        'flex gap-3 rounded-xl p-4 border transition-all cursor-pointer',
        notification.read
          ? 'border-zinc-200 bg-white hover:bg-zinc-50'
          : 'border-primary-200 bg-primary-50 hover:bg-primary-100'
      )}
    >
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', notification.read ? 'text-zinc-500' : 'font-medium text-zinc-900')}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-[11px] text-zinc-400 mt-1">{timeAgo(notification.createdAt, t)}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NotificationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
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
            status: filter === 'unread' ? 'unread' : undefined,
            limit: 50,
          }),
          fetchUnreadCount(slug),
        ]);
        setNotifications(notifRes.data || []);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Bell className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{t('notifications.title')}</h1>
            <p className="text-sm text-zinc-500">
              {unreadCount > 0
                ? t('notifications.unreadCount', { count: unreadCount })
                : t('notifications.allCaughtUp')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadNotifications(true)}
            disabled={isRefreshing}
            title={t('common.refresh')}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Push notification banner - enable */}
      {push.isSupported && !push.isSubscribed && push.permission !== 'denied' && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-900">{t('notifications.enablePush')}</p>
              <p className="text-xs text-zinc-500">{t('notifications.enablePushDesc')}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={push.subscribe}
            disabled={push.isLoading}
          >
            {t('notifications.enable')}
          </Button>
        </div>
      )}

      {/* Push notification banner - enabled */}
      {push.isSupported && push.isSubscribed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-600">{t('notifications.pushEnabled')}</span>
          </div>
          <button
            onClick={push.unsubscribe}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            {t('notifications.disable')}
          </button>
        </div>
      )}

      {/* Push notification banner - blocked */}
      {push.isSupported && push.permission === 'denied' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-3">
          <Bell className="h-4 w-4 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">{t('notifications.pushBlocked')}</p>
            <p className="text-xs text-red-500">{t('notifications.pushBlockedDesc')}</p>
          </div>
        </div>
      )}

      {/* Push not supported */}
      {!push.isSupported && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex items-center gap-3">
          <Bell className="h-4 w-4 text-zinc-400 shrink-0" />
          <span className="text-sm text-zinc-500">{t('notifications.pushNotSupported')}</span>
        </div>
      )}

      {/* Filter + Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-all capitalize',
                filter === f
                  ? 'bg-white text-primary-600 font-medium shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              {f === 'all' ? t('notifications.all') : `${t('notifications.unread')} (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-zinc-400" />
          </div>
          {filter === 'unread' ? (
            <>
              <p className="text-lg font-medium text-zinc-700">
                {t('notifications.noUnread')}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {t('notifications.allCaughtUpMsg')}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-zinc-700">
                {t('notifications.noNotifications')}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {t('notifications.noNotificationsDesc')}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

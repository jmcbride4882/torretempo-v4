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
  return 'text-kresna-gray bg-kresna-light';
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
        <div key={i} className="flex gap-4 rounded-2xl border border-kresna-border bg-white p-5">
          <div className="h-10 w-10 rounded-xl bg-kresna-light shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-lg bg-kresna-light" />
            <div className="h-3 w-1/2 rounded-lg bg-kresna-light" />
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
        'flex gap-4 rounded-2xl p-5 border transition-all cursor-pointer',
        notification.read
          ? 'border-kresna-border bg-white hover:bg-kresna-light shadow-card'
          : 'border-primary-200 bg-primary-50 hover:bg-primary-100 shadow-card'
      )}
    >
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', notification.read ? 'text-kresna-gray-dark' : 'font-semibold text-charcoal')}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary-500 shrink-0 ring-2 ring-primary-100" />
          )}
        </div>
        <p className="text-xs text-kresna-gray mt-1 line-clamp-2">{notification.message}</p>
        <p className="text-[11px] text-kresna-gray mt-1.5">{timeAgo(notification.createdAt, t)}</p>
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
            <h1 className="text-2xl font-bold text-charcoal tracking-tight">{t('notifications.title')}</h1>
            <p className="text-sm text-kresna-gray">
              {unreadCount > 0
                ? t('notifications.unreadCount', { count: unreadCount })
                : t('notifications.allCaughtUp')}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => loadNotifications(true)}
          disabled={isRefreshing}
          title={t('common.refresh')}
          className="rounded-xl"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Push notification banner - enable */}
      {push.isSupported && !push.isSubscribed && push.permission !== 'denied' && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 flex items-center justify-between gap-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">{t('notifications.enablePush')}</p>
              <p className="text-xs text-kresna-gray mt-0.5">{t('notifications.enablePushDesc')}</p>
            </div>
          </div>
          <Button
            variant="gradient"
            size="sm"
            onClick={push.subscribe}
            disabled={push.isLoading}
            className="rounded-xl shrink-0"
          >
            {t('notifications.enable')}
          </Button>
        </div>
      )}

      {/* Push notification banner - enabled */}
      {push.isSupported && push.isSubscribed && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-600">{t('notifications.pushEnabled')}</span>
          </div>
          <button
            onClick={push.unsubscribe}
            className="text-xs text-kresna-gray hover:text-kresna-gray-dark transition-colors"
          >
            {t('notifications.disable')}
          </button>
        </div>
      )}

      {/* Push notification banner - blocked */}
      {push.isSupported && push.permission === 'denied' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <Bell className="h-4 w-4 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">{t('notifications.pushBlocked')}</p>
            <p className="text-xs text-red-500 mt-0.5">{t('notifications.pushBlockedDesc')}</p>
          </div>
        </div>
      )}

      {/* Push not supported */}
      {!push.isSupported && (
        <div className="rounded-2xl border border-kresna-border bg-kresna-light p-4 flex items-center gap-3">
          <Bell className="h-4 w-4 text-kresna-gray shrink-0" />
          <span className="text-sm text-kresna-gray">{t('notifications.pushNotSupported')}</span>
        </div>
      )}

      {/* Filter + Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-kresna-light p-1">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-full transition-all min-h-touch',
                filter === f
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-kresna-gray hover:text-kresna-gray-dark'
              )}
            >
              {f === 'all' ? t('notifications.all') : `${t('notifications.unread')} (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-kresna-border bg-kresna-light px-6 py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-card">
            <Inbox className="h-8 w-8 text-kresna-gray" />
          </div>
          {filter === 'unread' ? (
            <>
              <p className="text-lg font-semibold text-charcoal mb-1">
                {t('notifications.noUnread')}
              </p>
              <p className="text-sm text-kresna-gray">
                {t('notifications.allCaughtUpMsg')}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-charcoal mb-1">
                {t('notifications.noNotifications')}
              </p>
              <p className="text-sm text-kresna-gray">
                {t('notifications.noNotificationsDesc')}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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

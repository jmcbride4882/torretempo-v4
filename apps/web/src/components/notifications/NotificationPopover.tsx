import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { BellOff, CheckCheck, ChevronRight, Loader2 } from 'lucide-react';
import { PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

interface NotificationPopoverProps {
  onUnreadCountChange?: (count: number) => void;
  onClose?: () => void;
}

export function NotificationPopover({
  onUnreadCountChange,
  onClose,
}: NotificationPopoverProps) {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadNotifications = async () => {
    if (!slug || hasLoadedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchNotifications(slug, { limit: 10 });
      const items = data.data || [];
      setNotifications(items);

      // Update unread count
      const unreadCount = items.filter((n) => !n.read).length;
      onUnreadCountChange?.(unreadCount);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(t('notifications.failedToLoad'));
      console.error('Error loading notifications:', err);
      hasLoadedRef.current = true; // Stop retrying on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only load once on mount

  const handleNotificationClick = async (notification: Notification) => {
    if (!slug) return;

    // Optimistically mark as read
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      onUnreadCountChange?.(
        notifications.filter((n) => !n.read && n.id !== notification.id).length
      );

      // Fire and forget the API call
      markAsRead(slug, notification.id).catch(console.error);
    }

    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link);
      onClose?.();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!slug || isMarkingAll) return;

    setIsMarkingAll(true);

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onUnreadCountChange?.(0);

    try {
      await markAllAsRead(slug);
    } catch (err) {
      // Revert on error - reload notifications
      hasLoadedRef.current = false;
      await loadNotifications();
      console.error('Error marking all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleViewAll = () => {
    navigate(`/t/${slug}/notifications`);
    onClose?.();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PopoverContent
      align="end"
      sideOffset={8}
      className="w-[380px] p-0 overflow-hidden border-kresna-border bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-kresna-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-charcoal">{t('notifications.title')}</h2>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-[11px] font-bold text-white"
            >
              {unreadCount}
            </motion.span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="h-7 text-xs text-kresna-gray hover:text-charcoal gap-1.5"
          >
            {isMarkingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="h-[340px]">
        <div className="p-2">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
                <p className="text-sm text-kresna-gray">{t('notifications.loadingNotifications')}</p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <BellOff className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-sm text-kresna-gray">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    hasLoadedRef.current = false;
                    loadNotifications();
                  }}
                  className="text-xs"
                >
                  {t('common.tryAgain')}
                </Button>
              </motion.div>
            ) : notifications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-100 blur-xl rounded-full" />
                  <div className="relative w-14 h-14 rounded-full bg-kresna-light border border-kresna-border flex items-center justify-center">
                    <BellOff className="h-7 w-7 text-kresna-gray" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-kresna-gray-dark">{t('notifications.allCaughtUp')}</p>
                  <p className="text-xs text-kresna-gray mt-1">
                    {t('notifications.noNotificationsAtMoment')}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {notifications.map((notification, index) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    index={index}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-kresna-border">
        <Button
          variant="ghost"
          onClick={handleViewAll}
          className={cn(
            'w-full h-11 rounded-none text-sm text-kresna-gray hover:text-charcoal',
            'flex items-center justify-center gap-2 group'
          )}
        >
          {t('notifications.viewAllNotifications')}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
    </PopoverContent>
  );
}

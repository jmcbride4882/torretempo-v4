import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/lib/api/notifications';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  index?: number;
}

/**
 * Get icon and color based on notification type
 */
function getNotificationMeta(type: NotificationType) {
  switch (type) {
    case 'swap_requested':
      return {
        icon: ArrowLeftRight,
        color: 'text-primary-400',
        bgColor: 'bg-primary-500/20',
        borderColor: 'border-primary-500/30',
      };
    case 'swap_accepted':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
      };
    case 'swap_rejected':
      return {
        icon: XCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
      };
    case 'swap_manager_needed':
      return {
        icon: AlertCircle,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
      };
    case 'swap_approved':
      return {
        icon: UserCheck,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
      };
    case 'swap_completed':
      return {
        icon: PartyPopper,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/20',
        borderColor: 'border-violet-500/30',
      };
    default:
      return {
        icon: ArrowLeftRight,
        color: 'text-neutral-400',
        bgColor: 'bg-neutral-500/20',
        borderColor: 'border-neutral-500/30',
      };
  }
}

/**
 * Format relative time from date string
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function NotificationItem({
  notification,
  onClick,
  index = 0,
}: NotificationItemProps) {
  const meta = getNotificationMeta(notification.type);
  const Icon = meta.icon;
  const relativeTime = formatRelativeTime(notification.createdAt);

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'group relative w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200',
        'hover:bg-white/5 active:scale-[0.98]',
        !notification.read && 'bg-white/[0.03]'
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <motion.div
          layoutId={`unread-${notification.id}`}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary-500"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      )}

      {/* Icon container */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-transform duration-200',
          'group-hover:scale-105',
          meta.bgColor,
          meta.borderColor
        )}
      >
        <Icon className={cn('h-5 w-5', meta.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p
          className={cn(
            'text-sm leading-tight line-clamp-1',
            notification.read ? 'text-neutral-300 font-normal' : 'text-white font-medium'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-[10px] text-neutral-600 mt-1.5 uppercase tracking-wider font-medium">
          {relativeTime}
        </p>
      </div>

      {/* Hover glow effect */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
          'bg-gradient-to-r from-transparent via-white/[0.02] to-transparent'
        )}
      />
    </motion.button>
  );
}

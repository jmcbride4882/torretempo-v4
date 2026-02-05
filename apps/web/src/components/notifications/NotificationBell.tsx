import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { NotificationPopover } from './NotificationPopover';
import { fetchUnreadCount } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

// Polling interval: 30 seconds
const POLL_INTERVAL = 30000;

export function NotificationBell() {
  const { slug } = useParams<{ slug: string }>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadUnreadCount = useCallback(async () => {
    if (!slug) return;

    try {
      setHasError(false);
      const count = await fetchUnreadCount(slug);
      setUnreadCount(count);
    } catch (err) {
      setHasError(true);
      console.error('Error fetching unread count:', err);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  // Initial load and polling
  useEffect(() => {
    loadUnreadCount();

    // Set up polling
    pollRef.current = setInterval(loadUnreadCount, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [loadUnreadCount]);

  // Refresh when popover closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Small delay to allow animations to complete
      setTimeout(loadUnreadCount, 300);
    }
  };

  const handleUnreadCountChange = (count: number) => {
    setUnreadCount(count);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative group',
            isOpen && 'bg-white/10'
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          {/* Bell icon with subtle animation on hover */}
          <motion.div
            whileHover={{ rotate: [0, -15, 15, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Bell
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                isOpen ? 'text-white' : 'text-neutral-300 group-hover:text-white'
              )}
            />
          </motion.div>

          {/* Unread badge */}
          <AnimatePresence>
            {!isLoading && unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 25,
                }}
                className={cn(
                  'absolute -top-0.5 -right-0.5',
                  'flex items-center justify-center',
                  'min-w-[18px] h-[18px] px-1',
                  'rounded-full',
                  'bg-gradient-to-br from-primary-500 to-primary-700',
                  'text-[10px] font-bold text-white',
                  'shadow-lg shadow-primary-500/30',
                  'ring-2 ring-neutral-900'
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state - subtle pulse */}
          {isLoading && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-neutral-600 animate-pulse" />
          )}

          {/* Error state - dim indicator */}
          {!isLoading && hasError && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500/50" />
          )}

          {/* Active glow ring when open */}
          {isOpen && (
            <motion.div
              layoutId="notification-glow"
              className="absolute inset-0 rounded-lg ring-2 ring-primary-500/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <NotificationPopover
        onUnreadCountChange={handleUnreadCountChange}
        onClose={() => setIsOpen(false)}
      />
    </Popover>
  );
}

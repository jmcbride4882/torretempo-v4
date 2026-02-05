import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Clock,
  ArrowLeftRight,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: 'dashboard' },
  { icon: Users, label: 'Roster', path: 'roster' },
  { icon: Clock, label: 'Clock', path: 'clock' },
  { icon: ArrowLeftRight, label: 'Swaps', path: 'swaps' },
  { icon: BarChart3, label: 'Reports', path: 'reports' },
  { icon: Settings, label: 'Settings', path: 'settings' },
];

export function BottomTabs() {
  const { slug } = useParams<{ slug: string }>();
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);

  // Fetch pending swaps count
  useEffect(() => {
    if (!slug) return;
    
    const fetchCount = async () => {
      const count = await fetchPendingSwapsCount(slug);
      setPendingSwapsCount(count);
    };
    
    fetchCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
    >
      {/* Gradient overlay for seamless blend */}
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-neutral-950 to-transparent pointer-events-none" />
      
      {/* Tab bar */}
      <div className="glass-dark border-t border-white/5 px-2 pb-safe">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={`/t/${slug}/${item.path}`}
              className={({ isActive }) =>
                cn(
                  'group relative flex flex-1 flex-col items-center gap-1 py-3 transition-colors',
                  isActive ? 'text-primary-400' : 'text-neutral-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-tab-indicator"
                      className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="relative"
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-all',
                        isActive ? 'text-primary-400' : 'text-neutral-500 group-hover:text-neutral-300'
                      )}
                    />
                    {/* Pending swaps badge */}
                    {item.path === 'swaps' && pendingSwapsCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-500 px-1 text-[8px] font-bold text-white"
                      >
                        {pendingSwapsCount > 9 ? '9+' : pendingSwapsCount}
                      </motion.span>
                    )}
                  </motion.div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      isActive ? 'text-primary-400' : 'text-neutral-500 group-hover:text-neutral-300'
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}

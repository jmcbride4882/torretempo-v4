import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  Users,
  ArrowLeftRight,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';

const tabs = [
  { icon: LayoutDashboard, label: 'Home', path: 'dashboard' },
  { icon: Users, label: 'Roster', path: 'roster' },
  { icon: Clock, label: 'Clock', path: 'clock', primary: true },
  { icon: ArrowLeftRight, label: 'Swaps', path: 'swaps', badge: true },
  { icon: BarChart3, label: 'Reports', path: 'reports' },
];

export function BottomTabs() {
  const { slug } = useParams<{ slug: string }>();
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);

  useEffect(() => {
    if (!slug) return;

    const fetchCount = async () => {
      const count = await fetchPendingSwapsCount(slug);
      setPendingSwapsCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Fade gradient */}
      <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-surface-0 to-transparent pointer-events-none" />

      {/* Tab bar — 64px height for large tap targets */}
      <div className="glass-dark px-1 pb-safe">
        <div className="flex items-stretch h-16">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={`/t/${slug}/${tab.path}`}
              className={({ isActive }) =>
                cn(
                  'group relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors min-h-touch-lg',
                  isActive ? 'text-primary-400' : 'text-neutral-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator line */}
                  {isActive && (
                    <motion.div
                      layoutId="bottom-tab-indicator"
                      className="absolute top-0 left-1/2 h-[2px] w-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-400 to-primary-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}

                  <motion.div whileTap={{ scale: 0.85 }} className="relative">
                    {/* Primary tab (Clock) gets special styling */}
                    {tab.primary ? (
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-2xl transition-all',
                          isActive
                            ? 'bg-primary-500 shadow-lg shadow-primary-500/30'
                            : 'bg-white/[0.06]'
                        )}
                      >
                        <tab.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-neutral-400')} />
                      </div>
                    ) : (
                      <tab.icon
                        className={cn(
                          'h-[22px] w-[22px] transition-all',
                          isActive ? 'text-primary-400' : 'text-neutral-500 group-hover:text-neutral-300'
                        )}
                      />
                    )}

                    {/* Badge */}
                    {'badge' in tab && tab.badge && pendingSwapsCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-500 px-1 text-[8px] font-bold text-white"
                      >
                        {pendingSwapsCount > 9 ? '9+' : pendingSwapsCount}
                      </motion.span>
                    )}
                  </motion.div>

                  {!tab.primary && (
                    <span
                      className={cn(
                        'text-[10px] font-medium transition-colors',
                        isActive ? 'text-primary-400' : 'text-neutral-500'
                      )}
                    >
                      {tab.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

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
  LogOut,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
  { icon: Users, label: 'Roster', path: 'roster' },
  { icon: Store, label: 'Open Shifts', path: 'open-shifts' },
  { icon: Clock, label: 'Clock', path: 'clock' },
  { icon: ArrowLeftRight, label: 'Swaps', path: 'swaps' },
  { icon: BarChart3, label: 'Reports', path: 'reports' },
  { icon: Settings, label: 'Settings', path: 'settings' },
];

export function Sidebar() {
  const { slug } = useParams<{ slug: string }>();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
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
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col border-r border-white/5 bg-neutral-950"
    >
      {/* Logo and org name */}
      <div className="flex h-16 items-center gap-3 border-b border-white/5 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold text-white">
            {organization?.name || 'Loading...'}
          </p>
          <p className="truncate text-xs text-neutral-500">Torre Tempo</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavLink
              to={`/t/${slug}/${item.path}`}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-600/10 text-primary-400'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-primary-400' : 'text-neutral-500 group-hover:text-white'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {/* Pending swaps badge */}
                  {item.path === 'swaps' && pendingSwapsCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white"
                    >
                      {pendingSwapsCount > 99 ? '99+' : pendingSwapsCount}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="h-1.5 w-1.5 rounded-full bg-primary-400"
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-medium text-white">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-neutral-500">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

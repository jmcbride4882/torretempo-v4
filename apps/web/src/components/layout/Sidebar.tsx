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
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';

const mainNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
  { icon: Clock, label: 'Clock In/Out', path: 'clock' },
  { icon: Users, label: 'Roster', path: 'roster' },
  { icon: Store, label: 'Open Shifts', path: 'open-shifts' },
];

const managementNav = [
  { icon: ArrowLeftRight, label: 'Swaps', path: 'swaps', badge: true },
  { icon: Bell, label: 'Notifications', path: 'notifications' },
  { icon: BarChart3, label: 'Reports', path: 'reports' },
];

const accountNav = [
  { icon: Settings, label: 'Settings', path: 'settings' },
];

function NavSection({
  title,
  items,
  slug,
  pendingSwapsCount,
}: {
  title: string;
  items: typeof mainNav;
  slug: string;
  pendingSwapsCount: number;
}) {
  return (
    <div className="mb-2">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={`/t/${slug}/${item.path}`}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] transition-colors',
                    isActive ? 'text-primary-400' : 'text-neutral-500 group-hover:text-neutral-300'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && item.badge && pendingSwapsCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingSwapsCount > 99 ? '99+' : pendingSwapsCount}
                  </span>
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
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { slug } = useParams<{ slug: string }>();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
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
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-surface-0 border-r border-white/[0.06]"
    >
      {/* Branding */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold text-white">
            {organization?.name || 'Loading...'}
          </p>
          <p className="truncate text-[11px] text-neutral-500">Torre Tempo</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 pt-4 scrollbar-thin space-y-4">
        <NavSection title="Main" items={mainNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} />
        <NavSection title="Management" items={managementNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} />
        <NavSection title="Account" items={accountNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} />
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white shadow-md">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="truncate text-[11px] text-neutral-500">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

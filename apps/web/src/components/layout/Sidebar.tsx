import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  ArrowLeftRight,
  CalendarOff,
  ClipboardCheck,
  BarChart3,
  Bell,
  Settings,
  CreditCard,
  LogOut,
  Copy,
  CalendarPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  path: string;
  badge?: boolean;
  roles?: string[];
}

const mainNav: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: 'dashboard' },
  { icon: Clock, labelKey: 'nav.clock', path: 'clock' },
  { icon: CalendarDays, labelKey: 'nav.roster', path: 'roster' },
];

const managementNav: NavItem[] = [
  { icon: Users, labelKey: 'nav.team', path: 'team' },
  { icon: ArrowLeftRight, labelKey: 'nav.swaps', path: 'swaps', badge: true },
  { icon: CalendarPlus, labelKey: 'nav.openShifts', path: 'open-shifts' },
  { icon: CalendarOff, labelKey: 'nav.leave', path: 'leave' },
  { icon: ClipboardCheck, labelKey: 'nav.corrections', path: 'corrections' },
  { icon: Copy, labelKey: 'nav.templates', path: 'shift-templates' },
];

const reportsNav: NavItem[] = [
  { icon: BarChart3, labelKey: 'nav.reportsPage', path: 'reports' },
  { icon: Bell, labelKey: 'nav.notifications', path: 'notifications' },
];

const configNav: NavItem[] = [
  { icon: Settings, labelKey: 'nav.settings', path: 'settings' },
  { icon: CreditCard, labelKey: 'nav.billing', path: 'billing', roles: ['owner', 'tenantAdmin'] },
];

function NavSection({
  title,
  items,
  slug,
  pendingSwapsCount,
}: {
  title: string;
  items: NavItem[];
  slug: string;
  pendingSwapsCount: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-2">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={`/t/${slug}/${item.path}`}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] transition-colors',
                    isActive ? 'text-primary-600' : 'text-zinc-400 group-hover:text-zinc-600'
                  )}
                />
                <span className="flex-1">{t(item.labelKey)}</span>
                {item.badge && pendingSwapsCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingSwapsCount > 99 ? '99+' : pendingSwapsCount}
                  </span>
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
  const { t } = useTranslation();
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
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-white border-r border-zinc-200">
      {/* Branding */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 shadow-sm">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {organization?.name || 'Loading...'}
          </p>
          <p className="truncate text-[11px] text-zinc-400">Torre Tempo</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 pt-4 scrollbar-thin space-y-4">
        <NavSection title={t('nav.main')} items={mainNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} />
        <NavSection title={t('nav.management')} items={managementNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} />
        <NavSection title={t('nav.reports')} items={reportsNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} />
        <NavSection title={t('nav.config')} items={configNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} />
      </nav>

      {/* Footer: language + user */}
      <div className="border-t border-zinc-200 p-3 space-y-3">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-zinc-900">{user?.name || 'User'}</p>
            <p className="truncate text-[11px] text-zinc-400">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
            title={t('nav.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

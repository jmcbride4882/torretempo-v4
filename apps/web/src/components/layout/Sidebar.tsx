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
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
                  ? 'border-l-2 border-accent-500 bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] transition-colors',
                    isActive ? 'text-accent-500' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <span className="flex-1">{t(item.labelKey)}</span>
                {item.badge && pendingSwapsCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">
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
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-surface-dark">
      {/* Branding */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold text-white">
            {organization?.name || 'Loading...'}
          </p>
          <p className="truncate text-[11px] text-slate-500">Torre Tempo</p>
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
      <div className="border-t border-white/10 p-3 space-y-3">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
            title={t('nav.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

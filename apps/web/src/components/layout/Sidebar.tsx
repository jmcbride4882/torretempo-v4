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
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

/* ──────────────────────────────────────────────────────────────
   Kresna Sidebar — Redesigned
   - Filled active backgrounds (not left-border style)
   - Pending count badges on nav items
   - Collapse to icon-only toggle
   - Section labels with spacing
   - Larger user profile card
   - Kresna shadows + transitions
   ────────────────────────────────────────────────────────────── */

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
  collapsed,
}: {
  title: string;
  items: NavItem[];
  slug: string;
  pendingSwapsCount: number;
  collapsed: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      {!collapsed && (
        <p className="px-4 mb-2 text-caption font-semibold uppercase tracking-widest text-kresna-gray">
          {title}
        </p>
      )}
      <div className="space-y-1 px-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={`/t/${slug}/${item.path}`}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-2xl text-body-sm font-medium transition-all duration-200',
                collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5',
                isActive
                  ? 'bg-primary-500 text-white shadow-kresna-btn'
                  : 'text-kresna-gray-dark hover:bg-kresna-light hover:text-charcoal'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-kresna-gray group-hover:text-kresna-gray-dark'
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                    {item.badge && pendingSwapsCount > 0 && (
                      <span className={cn(
                        'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-primary-500 text-white'
                      )}>
                        {pendingSwapsCount > 99 ? '99+' : pendingSwapsCount}
                      </span>
                    )}
                  </>
                )}
                {/* Tooltip for collapsed mode */}
                {collapsed && (
                  <div className="absolute left-full ml-2 hidden group-hover:flex z-50">
                    <div className="rounded-xl bg-charcoal px-3 py-1.5 text-xs font-medium text-white shadow-kresna whitespace-nowrap">
                      {t(item.labelKey)}
                      {item.badge && pendingSwapsCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px]">
                          {pendingSwapsCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed: externalCollapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void } = {}) {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = externalCollapsed ?? internalCollapsed;
  const toggleCollapsed = onToggle ?? (() => setInternalCollapsed(c => !c));

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
    <aside
      className={cn(
        'hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-white border-r border-kresna-border transition-all duration-300 ease-kresna',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Branding */}
      <div className={cn(
        'flex h-16 items-center border-b border-kresna-border',
        collapsed ? 'justify-center px-2' : 'gap-3 px-4'
      )}>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary flex-shrink-0 shadow-kresna-btn">
          <Clock className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-body-sm font-semibold text-charcoal">
              {organization?.name || 'Torre Tempo'}
            </p>
            <p className="truncate text-caption text-kresna-gray">Torre Tempo</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div className={cn('flex px-2 py-2', collapsed ? 'justify-center' : 'justify-end')}>
        <button
          onClick={toggleCollapsed}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-kresna-gray hover:bg-kresna-light hover:text-charcoal transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <NavSection title={t('nav.main')} items={mainNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} collapsed={collapsed} />
        <NavSection title={t('nav.management')} items={managementNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} collapsed={collapsed} />
        <NavSection title={t('nav.reports')} items={reportsNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} collapsed={collapsed} />
        <NavSection title={t('nav.config')} items={configNav} slug={slug || ''} pendingSwapsCount={pendingSwapsCount} collapsed={collapsed} />
      </nav>

      {/* Footer: language + user */}
      <div className="border-t border-kresna-border p-3 space-y-3">
        {!collapsed && (
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>
        )}
        <div className={cn(
          'flex items-center rounded-2xl bg-kresna-light transition-all duration-200',
          collapsed ? 'justify-center p-2' : 'gap-3 p-3'
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-body-sm font-medium text-charcoal">{user?.name || 'User'}</p>
                <p className="truncate text-caption text-kresna-gray">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="rounded-xl p-2 text-kresna-gray transition-colors hover:bg-kresna-border/50 hover:text-red-500"
                title={t('nav.signOut')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

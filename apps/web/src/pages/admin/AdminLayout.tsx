import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Users,
  CreditCard,
  Server,
  Key,
  FileText,
  BarChart3,
  Shield,
  LogOut,
  ChevronRight,
  Clock,
  AlertTriangle,
  Menu,
  X,
  Flag,
  Bell,
  Monitor,
  Settings,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ──────────────────────────────────────────────────────────────
   Kresna AdminLayout — Redesigned
   - Filled active nav backgrounds (not left-border)
   - Dense professional aesthetic
   - Kresna shadows + transitions
   - Section labels with proper spacing
   ────────────────────────────────────────────────────────────── */

// Admin page imports
import TenantsPage from './TenantsPage';
import UsersPage from './UsersPage';
import SubscriptionsPage from './SubscriptionsPage';
import SystemPage from './SystemPage';
import ErrorLogsPage from './ErrorLogsPage';
import InspectorTokensPage from './InspectorTokensPage';
import AuditPage from './AuditPage';
import AnalyticsPage from './AnalyticsPage';
import FeatureFlagsPage from './FeatureFlagsPage';
import NotificationsPage from './NotificationsPage';
import SessionsPage from './SessionsPage';
import SettingsPage from './SettingsPage';
import PlansPage from './PlansPage';
import BillingPage from './BillingPage';

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const adminNavSections: NavSection[] = [
  {
    titleKey: 'admin.sections.tenants',
    items: [
      { icon: Building2, labelKey: 'admin.nav.tenants', path: 'tenants' },
      { icon: CreditCard, labelKey: 'admin.nav.subscriptions', path: 'subscriptions' },
      { icon: DollarSign, labelKey: 'admin.nav.plans', path: 'plans' },
      { icon: Receipt, labelKey: 'admin.nav.billing', path: 'billing' },
    ],
  },
  {
    titleKey: 'admin.sections.users',
    items: [
      { icon: Users, labelKey: 'admin.nav.users', path: 'users' },
      { icon: Monitor, labelKey: 'admin.nav.sessions', path: 'sessions' },
    ],
  },
  {
    titleKey: 'admin.sections.system',
    items: [
      { icon: Server, labelKey: 'admin.nav.system', path: 'system' },
      { icon: AlertTriangle, labelKey: 'admin.nav.errors', path: 'errors' },
      { icon: Flag, labelKey: 'admin.nav.featureFlags', path: 'feature-flags' },
    ],
  },
  {
    titleKey: 'admin.sections.compliance',
    items: [
      { icon: FileText, labelKey: 'admin.nav.audit', path: 'audit' },
      { icon: Key, labelKey: 'admin.nav.inspectorTokens', path: 'inspector-tokens' },
      { icon: Bell, labelKey: 'admin.nav.notifications', path: 'notifications' },
    ],
  },
  {
    titleKey: 'admin.sections.config',
    items: [
      { icon: BarChart3, labelKey: 'admin.nav.analytics', path: 'analytics' },
      { icon: Settings, labelKey: 'admin.nav.settings', path: 'settings' },
    ],
  },
];

const mobileBottomItems: NavItem[] = [
  { icon: Building2, labelKey: 'admin.nav.tenants', path: 'tenants' },
  { icon: Users, labelKey: 'admin.nav.users', path: 'users' },
  { icon: Server, labelKey: 'admin.nav.system', path: 'system' },
  { icon: FileText, labelKey: 'admin.nav.audit', path: 'audit' },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
      {adminNavSections.map((section) => (
        <div key={section.titleKey} className="mb-4">
          <h3 className="mb-2 px-5 text-caption font-semibold uppercase tracking-widest text-kresna-gray">
            {t(section.titleKey)}
          </h3>
          <div className="space-y-1 px-2">
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={`/admin/${item.path}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-body-sm font-medium transition-all duration-200',
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
                        'h-[18px] w-[18px] shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-kresna-gray group-hover:text-kresna-gray-dark'
                      )}
                    />
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}

      {/* Back to app link */}
      <div className="mt-2 border-t border-kresna-border mx-3 pt-3">
        <NavLink
          to="/"
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-body-sm font-medium text-kresna-gray-dark transition-all duration-200 hover:bg-kresna-light hover:text-charcoal mx-[-4px]"
        >
          <Clock className="h-[18px] w-[18px] shrink-0 text-kresna-gray group-hover:text-kresna-gray-dark" />
          <span className="flex-1">{t('admin.backToApp')}</span>
          <ChevronRight className="h-4 w-4 text-kresna-gray" />
        </NavLink>
      </div>
    </nav>
  );
}

function SidebarUserCard() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="border-t border-kresna-border p-3">
      <div className="flex items-center gap-3 rounded-2xl bg-kresna-light p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
          {user?.name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <p className="truncate text-body-sm font-medium text-charcoal">
              {user?.name || 'Admin'}
            </p>
            <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-600">
              {t('admin.adminBadge')}
            </span>
          </div>
          <p className="truncate text-caption text-kresna-gray">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="shrink-0 rounded-xl p-2 text-kresna-gray transition-colors hover:bg-kresna-border/50 hover:text-red-500"
          title={t('admin.signOut')}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SidebarLogo() {
  const { t } = useTranslation();

  return (
    <div className="flex h-16 items-center gap-3 border-b border-kresna-border px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-kresna-btn flex-shrink-0">
        <Shield className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-body-sm font-semibold text-charcoal">Torre Tempo</span>
        <span className="text-caption font-medium text-primary-500">{t('admin.panel')}</span>
      </div>
    </div>
  );
}

function AdminSidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-white border-r border-kresna-border">
      <SidebarLogo />
      <SidebarNav />
      <SidebarUserCard />
    </aside>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu(): void {
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={closeMobileMenu}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-white border-r border-kresna-border shadow-kresna-lg lg:hidden animate-slide-up">
            <div className="flex h-16 items-center justify-between border-b border-kresna-border px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-sm">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-body-sm font-semibold text-charcoal">Torre Tempo</span>
                  <span className="text-caption font-medium text-primary-500">{t('admin.panel')}</span>
                </div>
              </div>
              <button
                onClick={closeMobileMenu}
                className="rounded-xl p-2 text-kresna-gray hover:bg-kresna-light hover:text-kresna-gray-dark transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarNav onNavigate={closeMobileMenu} />
            <SidebarUserCard />
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="pb-16 lg:pb-0 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 glass border-b border-kresna-border/50">
          <div className="flex h-full items-center justify-between px-4 lg:px-8">
            {/* Mobile: Menu button and Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-2xl p-2 text-kresna-gray-dark hover:bg-kresna-light hover:text-charcoal transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-sm">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-charcoal text-body-sm">
                  {t('admin.adminBadge')}
                </span>
              </div>
            </div>

            {/* Desktop: Admin badge */}
            <div className="hidden items-center gap-3 lg:flex">
              <span className="rounded-full bg-primary-50 px-3 py-1.5 text-caption font-bold uppercase tracking-wider text-primary-600">
                {t('admin.panel')}
              </span>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2 rounded-2xl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="hidden text-body-sm font-medium text-charcoal md:inline">
                      {user?.name?.split(' ')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-charcoal">{user?.name}</span>
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-600">
                          {t('admin.adminBadge')}
                        </span>
                      </div>
                      <span className="text-caption font-normal text-kresna-gray">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => (window.location.href = '/')}>
                    {t('admin.backToApp')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-red-600 focus:text-red-600"
                  >
                    {t('admin.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="errors" element={<ErrorLogsPage />} />
            <Route path="inspector-tokens" element={<InspectorTokensPage />} />
            <Route path="feature-flags" element={<FeatureFlagsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="tenants" replace />} />
          </Routes>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-kresna-border/50 lg:hidden">
          <div className="grid grid-cols-4 gap-1 p-2 pb-safe">
            {mobileBottomItems.map((item) => {
              const isActive = location.pathname === `/admin/${item.path}`;
              return (
                <NavLink
                  key={item.path}
                  to={`/admin/${item.path}`}
                  className="group relative flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2 transition-all duration-200 active:scale-[0.95]"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
                      isActive
                        ? 'bg-primary-500 text-white shadow-kresna-btn'
                        : 'text-kresna-gray group-hover:bg-kresna-light group-hover:text-kresna-gray-dark'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      isActive ? 'text-primary-600' : 'text-kresna-gray group-hover:text-kresna-gray-dark'
                    )}
                  >
                    {t(item.labelKey)}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

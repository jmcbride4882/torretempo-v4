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

// --- Grouped navigation model ---

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

// Flat list for mobile bottom tabs (first 4 items across all sections)
const mobileBottomItems: NavItem[] = [
  { icon: Building2, labelKey: 'admin.nav.tenants', path: 'tenants' },
  { icon: Users, labelKey: 'admin.nav.users', path: 'users' },
  { icon: Server, labelKey: 'admin.nav.system', path: 'system' },
  { icon: FileText, labelKey: 'admin.nav.audit', path: 'audit' },
];

// --- Shared sidebar nav rendering ---

interface SidebarNavProps {
  onNavigate?: () => void;
}

function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {adminNavSections.map((section) => (
        <div key={section.titleKey} className="mb-5">
          <h3 className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t(section.titleKey)}
          </h3>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={`/admin/${item.path}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-l-2 border-violet-400 bg-white/10 text-white'
                      : 'border-l-2 border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        isActive
                          ? 'text-violet-400'
                          : 'text-slate-500 group-hover:text-slate-300'
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
      <div className="mt-2 border-t border-slate-700/50 pt-3">
        <NavLink
          to="/"
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
        >
          <Clock className="h-5 w-5 shrink-0 text-slate-600 group-hover:text-slate-400" />
          <span className="flex-1">{t('admin.backToApp')}</span>
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </NavLink>
      </div>
    </nav>
  );
}

// --- Sidebar user card ---

function SidebarUserCard() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="border-t border-slate-700/50 p-3">
      <div className="flex items-center gap-3 rounded-lg bg-slate-800 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
          {user?.name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-200">
              {user?.name || 'Admin'}
            </p>
            <span className="shrink-0 rounded bg-violet-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-300">
              {t('admin.adminBadge')}
            </span>
          </div>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300"
          title={t('admin.signOut')}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// --- Sidebar logo ---

function SidebarLogo() {
  const { t } = useTranslation();

  return (
    <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
        <Shield className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-white">Torre Tempo</span>
        <span className="text-xs text-violet-400">{t('admin.panel')}</span>
      </div>
    </div>
  );
}

// --- Desktop sidebar ---

function AdminSidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-slate-900">
      <SidebarLogo />
      <SidebarNav />
      <SidebarUserCard />
    </aside>
  );
}

// --- Main layout ---

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu(): void {
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeMobileMenu}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-slate-900 lg:hidden">
            {/* Logo and close button */}
            <div className="flex h-16 items-center justify-between border-b border-slate-700/50 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Torre Tempo</span>
                  <span className="text-xs text-violet-400">{t('admin.panel')}</span>
                </div>
              </div>
              <button
                onClick={closeMobileMenu}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"
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
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile: Menu button and Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-slate-900">
                  {t('admin.adminBadge')}
                </span>
              </div>
            </div>

            {/* Desktop: Admin badge */}
            <div className="hidden items-center gap-3 lg:flex">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
                {t('admin.panel')}
              </span>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="hidden text-sm font-medium text-slate-700 md:inline">
                      {user?.name?.split(' ')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900">{user?.name}</span>
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                          {t('admin.adminBadge')}
                        </span>
                      </div>
                      <span className="text-xs font-normal text-slate-500">
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
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
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
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white lg:hidden">
          <div className="grid grid-cols-4 gap-1 p-2">
            {mobileBottomItems.map((item) => {
              const isActive = location.pathname === `/admin/${item.path}`;
              return (
                <NavLink
                  key={item.path}
                  to={`/admin/${item.path}`}
                  className="group relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                      isActive
                        ? 'bg-violet-50 text-violet-600'
                        : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      isActive
                        ? 'text-violet-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  >
                    {t(item.labelKey)}
                  </span>
                  {isActive && (
                    <div className="absolute -top-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-violet-500" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

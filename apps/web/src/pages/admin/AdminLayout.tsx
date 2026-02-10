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

// Admin nav items
const adminNavItems = [
  { icon: Building2, labelKey: 'admin.nav.tenants', path: 'tenants' },
  { icon: Users, labelKey: 'admin.nav.users', path: 'users' },
  { icon: Monitor, labelKey: 'admin.nav.sessions', path: 'sessions' },
  { icon: CreditCard, labelKey: 'admin.nav.subscriptions', path: 'subscriptions' },
  { icon: DollarSign, labelKey: 'admin.nav.plans', path: 'plans' },
  { icon: Receipt, labelKey: 'admin.nav.billing', path: 'billing' },
  { icon: Server, labelKey: 'admin.nav.system', path: 'system' },
  { icon: AlertTriangle, labelKey: 'admin.nav.errors', path: 'errors' },
  { icon: Key, labelKey: 'admin.nav.inspectorTokens', path: 'inspector-tokens' },
  { icon: Flag, labelKey: 'admin.nav.featureFlags', path: 'feature-flags' },
  { icon: Bell, labelKey: 'admin.nav.notifications', path: 'notifications' },
  { icon: FileText, labelKey: 'admin.nav.audit', path: 'audit' },
  { icon: BarChart3, labelKey: 'admin.nav.analytics', path: 'analytics' },
  { icon: Settings, labelKey: 'admin.nav.settings', path: 'settings' },
];

// Admin Sidebar
function AdminSidebar() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col border-r border-zinc-200 bg-white">
      {/* Logo and admin badge */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-900">Torre Tempo</span>
            <span className="text-xs text-amber-600">{t('admin.panel')}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={`/admin/${item.path}`}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-amber-600' : 'text-zinc-400 group-hover:text-zinc-600'
                  )}
                />
                <span className="flex-1">{t(item.labelKey)}</span>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Separator and back to app link */}
        <div className="my-4 border-t border-zinc-200" />
        <NavLink
          to="/"
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <Clock className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600" />
          <span className="flex-1">{t('admin.backToApp')}</span>
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        </NavLink>
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-sm font-medium text-white">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-zinc-900">{user?.name || 'Admin'}</p>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                Admin
              </span>
            </div>
            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            title={t('admin.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-zinc-200 bg-white lg:hidden">
            {/* Logo and close button */}
            <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900">Torre Tempo</span>
                  <span className="text-xs text-amber-600">{t('admin.panel')}</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={`/admin/${item.path}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-5 w-5 transition-colors',
                          isActive ? 'text-amber-600' : 'text-zinc-400 group-hover:text-zinc-600'
                        )}
                      />
                      <span className="flex-1">{t(item.labelKey)}</span>
                    </>
                  )}
                </NavLink>
              ))}

              {/* Separator and back to app link */}
              <div className="my-4 border-t border-zinc-200" />
              <NavLink
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              >
                <Clock className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600" />
                <span className="flex-1">{t('admin.backToApp')}</span>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </NavLink>
            </nav>

            {/* User section */}
            <div className="border-t border-zinc-200 p-3">
              <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-sm font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-zinc-900">{user?.name || 'Admin'}</p>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      Admin
                    </span>
                  </div>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  title={t('admin.signOut')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="lg:pl-64 pb-16 lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-zinc-200 bg-white">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile: Menu button and Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-zinc-900">Admin</span>
              </div>
            </div>

            {/* Desktop: Admin badge */}
            <div className="hidden items-center gap-3 lg:flex">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                {t('admin.panel')}
              </span>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="hidden text-sm font-medium text-zinc-700 md:inline">
                      {user?.name?.split(' ')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-900">{user?.name}</span>
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          Admin
                        </span>
                      </div>
                      <span className="text-xs font-normal text-zinc-500">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/'}>
                    {t('admin.backToApp')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
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
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white lg:hidden">
          <div className="grid grid-cols-4 gap-1 p-2">
            {adminNavItems.slice(0, 4).map((item) => {
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
                        ? 'bg-amber-50 text-amber-600'
                        : 'text-zinc-400 group-hover:bg-zinc-50 group-hover:text-zinc-600'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      isActive ? 'text-amber-600' : 'text-zinc-400 group-hover:text-zinc-600'
                    )}
                  >
                    {t(item.labelKey)}
                  </span>
                  {isActive && (
                    <div className="absolute -top-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-amber-500" />
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

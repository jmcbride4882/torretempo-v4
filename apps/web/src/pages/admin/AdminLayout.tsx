import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

// Admin nav items
const adminNavItems = [
  { icon: Building2, label: 'Tenants', path: 'tenants' },
  { icon: Users, label: 'Users', path: 'users' },
  { icon: CreditCard, label: 'Subscriptions', path: 'subscriptions' },
  { icon: Server, label: 'System', path: 'system' },
  { icon: AlertTriangle, label: 'Error Logs', path: 'errors' },
  { icon: Key, label: 'Inspector Tokens', path: 'inspector-tokens' },
  { icon: FileText, label: 'Audit', path: 'audit' },
  { icon: BarChart3, label: 'Analytics', path: 'analytics' },
];



// Admin Sidebar
function AdminSidebar() {
  const { user, signOut } = useAuth();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col border-r border-white/5 bg-neutral-950"
    >
      {/* Logo and admin badge */}
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Torre Tempo</span>
            <span className="text-xs text-amber-400">Admin Panel</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {adminNavItems.filter(Boolean).map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavLink
              to={`/admin/${item.path}`}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-amber-600/10 text-amber-400'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-white'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="admin-sidebar-indicator"
                      className="h-1.5 w-1.5 rounded-full bg-amber-400"
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}

        {/* Separator and back to app link */}
        <div className="my-4 border-t border-white/5" />
        <NavLink
          to="/"
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-200"
        >
          <Clock className="h-5 w-5 text-neutral-500 group-hover:text-white" />
          <span className="flex-1">Back to App</span>
          <ChevronRight className="h-4 w-4 text-neutral-600" />
        </NavLink>
      </nav>

      {/* User section */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-sm font-medium text-white">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-white">{user?.name || 'Admin'}</p>
              <span className="rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                Admin
              </span>
            </div>
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

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile navigation drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/5 bg-neutral-950 lg:hidden"
            >
              {/* Logo and close button */}
              <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">Torre Tempo</span>
                    <span className="text-xs text-amber-400">Admin Panel</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={`/admin/${item.path}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-amber-600/10 text-amber-400'
                          : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            'h-5 w-5 transition-colors',
                            isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-white'
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}

                {/* Separator and back to app link */}
                <div className="my-4 border-t border-white/5" />
                <NavLink
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <Clock className="h-5 w-5 text-neutral-500 group-hover:text-white" />
                  <span className="flex-1">Back to App</span>
                  <ChevronRight className="h-4 w-4 text-neutral-600" />
                </NavLink>
              </nav>

              {/* User section */}
              <div className="border-t border-white/5 p-3">
                <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-sm font-medium text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{user?.name || 'Admin'}</p>
                      <span className="rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                        Admin
                      </span>
                    </div>
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
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="lg:pl-64 pb-16 lg:pb-0">
        {/* Header */}
        <header className="glass-header sticky top-0 z-30 h-16 border-b border-amber-500/20">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile: Menu button and Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-white">Admin</span>
              </div>
            </div>

            {/* Desktop: Admin badge */}
            <div className="hidden items-center gap-3 lg:flex">
              <span className="rounded-full bg-amber-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                Admin Panel
              </span>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-sm font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="hidden text-sm font-medium text-white md:inline">
                      {user?.name?.split(' ')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{user?.name}</span>
                        <span className="rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                          Admin
                        </span>
                      </div>
                      <span className="text-xs font-normal text-neutral-400">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/'}>
                    Back to App
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-400 focus:text-red-400">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div {...pageTransition}>
              <Routes>
                <Route path="tenants" element={<TenantsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="system" element={<SystemPage />} />
                <Route path="errors" element={<ErrorLogsPage />} />
                <Route path="inspector-tokens" element={<InspectorTokensPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="*" element={<Navigate to="tenants" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/5 bg-neutral-950 lg:hidden">
          <div className="grid grid-cols-4 gap-1 p-2">
            {adminNavItems.slice(0, 4).map((item) => {
              const isActive = location.pathname === `/admin/${item.path}`;
              return (
                <NavLink
                  key={item.path}
                  to={`/admin/${item.path}`}
                  className="group relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-amber-600/20 text-amber-400 shadow-lg shadow-amber-500/20'
                        : 'text-neutral-500 group-hover:bg-white/5 group-hover:text-white'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-white'
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="admin-mobile-indicator"
                      className="absolute -top-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-amber-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
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

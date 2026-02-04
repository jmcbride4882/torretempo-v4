import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
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
} from 'lucide-react';
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

// Admin nav items
const adminNavItems = [
  { icon: Building2, label: 'Tenants', path: 'tenants' },
  { icon: Users, label: 'Users', path: 'users' },
  { icon: CreditCard, label: 'Subscriptions', path: 'subscriptions' },
  { icon: Server, label: 'System', path: 'system' },
  { icon: Key, label: 'Inspector Tokens', path: 'inspector-tokens' },
  { icon: FileText, label: 'Audit', path: 'audit' },
  { icon: BarChart3, label: 'Analytics', path: 'analytics' },
];

// Placeholder page component
function AdminPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600/20">
          <Shield className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="max-w-md text-neutral-400">{description}</p>
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Admin Feature - Phase 2+
        </div>
      </motion.div>
    </div>
  );
}

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
        {adminNavItems.map((item, index) => (
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

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="glass-header sticky top-0 z-30 h-16 border-b border-amber-500/20">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile: Logo */}
            <div className="flex items-center gap-3 lg:hidden">
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
                <Route
                  path="tenants"
                  element={
                    <AdminPlaceholder
                      title="Tenants"
                      description="Manage all organizations, view their subscription status, and access tenant settings."
                    />
                  }
                />
                <Route
                  path="users"
                  element={
                    <AdminPlaceholder
                      title="Users"
                      description="View and manage all users across the platform. Grant admin access and manage permissions."
                    />
                  }
                />
                <Route
                  path="subscriptions"
                  element={
                    <AdminPlaceholder
                      title="Subscriptions"
                      description="Manage billing plans, view revenue metrics, and handle subscription changes."
                    />
                  }
                />
                <Route
                  path="system"
                  element={
                    <AdminPlaceholder
                      title="System"
                      description="System health monitoring, configuration, and maintenance tools."
                    />
                  }
                />
                <Route
                  path="inspector-tokens"
                  element={
                    <AdminPlaceholder
                      title="Inspector Tokens"
                      description="Generate and manage inspector authentication tokens for external integrations."
                    />
                  }
                />
                <Route
                  path="audit"
                  element={
                    <AdminPlaceholder
                      title="Audit Log"
                      description="View all administrative actions and system events for compliance and debugging."
                    />
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <AdminPlaceholder
                      title="Analytics"
                      description="Platform-wide analytics, usage metrics, and growth insights."
                    />
                  }
                />
                <Route path="*" element={<Navigate to="tenants" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Clock, Shield, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Roster page
import RosterPage from '@/pages/Roster';
import OpenShiftsPage from '@/pages/OpenShifts';
import SwapsPage from '@/pages/Swaps';
import TimeEntryList from '@/pages/TimeClock/TimeEntryList';

// Dashboard
import DashboardPage from '@/pages/Dashboard';

// Reports pages
import ReportsPage from '@/pages/Reports';
import ReportDetailPage from '@/pages/Reports/ReportDetail';
import GenerateReportPage from '@/pages/Reports/GenerateReport';
import SettingsPage from '@/pages/Settings';
import NotificationsPage from '@/pages/Notifications';


const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

export default function AppShell() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              <div className="relative h-full">
                <Sidebar />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-2 top-4 rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Offline indicator */}
      <OfflineIndicator />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="glass-header sticky top-0 z-30 h-16">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile menu button and logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-white">{organization?.name || 'Tempo'}</span>
              </div>
            </div>

            {/* Desktop: Page title area */}
            <div className="hidden lg:block" />

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <NotificationBell />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
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
                        {(user as any)?.role === 'admin' && (
                          <span className="rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-normal text-neutral-400">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(user as any)?.role === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4 text-amber-400" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate(`/t/${slug}/settings`)}>
                    Settings
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
        <main className="min-h-[calc(100vh-4rem)] pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div {...pageTransition} className="p-4 lg:p-6">
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="roster" element={<RosterPage />} />
                <Route path="open-shifts" element={<OpenShiftsPage />} />
                <Route path="clock" element={<TimeEntryList />} />
                <Route path="swaps" element={<SwapsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/:id" element={<ReportDetailPage />} />
                <Route path="reports/generate" element={<GenerateReportPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to={`/t/${slug}/dashboard`} replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <BottomTabs />
    </div>
  );
}

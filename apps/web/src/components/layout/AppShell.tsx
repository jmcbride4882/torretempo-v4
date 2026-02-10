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

import RosterPage from '@/pages/Roster';
import OpenShiftsPage from '@/pages/OpenShifts';
import SwapsPage from '@/pages/Swaps';
import TimeEntryList from '@/pages/TimeClock/TimeEntryList';
import DashboardPage from '@/pages/Dashboard';
import ReportsPage from '@/pages/Reports';
import ReportDetailPage from '@/pages/Reports/ReportDetail';
import GenerateReportPage from '@/pages/Reports/GenerateReport';
import SettingsPage from '@/pages/Settings';
import NotificationsPage from '@/pages/Notifications';

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.15, ease: 'easeOut' },
};

export default function AppShell() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-0">
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
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
            >
              <div className="relative h-full">
                <Sidebar />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-3 top-4 rounded-xl p-2 text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors"
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
            {/* Mobile: menu + brand */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors min-h-touch"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-white text-sm">{organization?.name || 'Tempo'}</span>
              </div>
            </div>

            {/* Desktop: spacer */}
            <div className="hidden lg:block" />

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2 h-10 min-h-touch">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white">
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
                          <span className="badge-warning text-[10px] py-0 px-1.5">Admin</span>
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

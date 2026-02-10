import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

// New pages (lazy loaded)
const TeamPage = lazy(() => import('@/pages/Team'));
const EmployeeProfilePage = lazy(() => import('@/pages/Team/EmployeeProfile'));
const LeavePage = lazy(() => import('@/pages/Leave'));
const CorrectionsPage = lazy(() => import('@/pages/Corrections'));
const BillingPage = lazy(() => import('@/pages/Billing'));
const ShiftTemplatesPage = lazy(() => import('@/pages/ShiftTemplates'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-primary-500" />
    </div>
  );
}

export default function AppShell() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden bg-white shadow-xl">
            <div className="relative h-full">
              <Sidebar />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-3 top-4 rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Offline indicator */}
      <OfflineIndicator />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-zinc-200">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile: menu + brand */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors min-h-touch"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-zinc-900 text-sm">{organization?.name || 'Tempo'}</span>
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
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
                        {(user as any)?.role === 'admin' && (
                          <span className="badge-warning text-[10px] py-0 px-1.5">Admin</span>
                        )}
                      </div>
                      <span className="text-xs font-normal text-zinc-500">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(user as any)?.role === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4 text-amber-500" />
                        <span>{t('nav.admin')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate(`/t/${slug}/settings`)}>
                    {t('nav.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                    {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] pb-24 lg:pb-8">
          <div className="p-4 lg:p-6">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="roster" element={<RosterPage />} />
                <Route path="open-shifts" element={<OpenShiftsPage />} />
                <Route path="clock" element={<TimeEntryList />} />
                <Route path="swaps" element={<SwapsPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="team/:id" element={<EmployeeProfilePage />} />
                <Route path="leave" element={<LeavePage />} />
                <Route path="corrections" element={<CorrectionsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="shift-templates" element={<ShiftTemplatesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/:id" element={<ReportDetailPage />} />
                <Route path="reports/generate" element={<GenerateReportPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to={`/t/${slug}/dashboard`} replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <BottomTabs />
    </div>
  );
}

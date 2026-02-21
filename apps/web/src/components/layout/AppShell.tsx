import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Clock, Shield, User, X, AlertTriangle, Sparkles } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

// Lazy-loaded pages
const TeamPage = lazy(() => import('@/pages/Team'));
const EmployeeProfilePage = lazy(() => import('@/pages/Team/EmployeeProfile'));
const LeavePage = lazy(() => import('@/pages/Leave'));
const CorrectionsPage = lazy(() => import('@/pages/Corrections'));
const BillingPage = lazy(() => import('@/pages/Billing'));
const CheckoutSuccess = lazy(() => import('@/pages/Billing/CheckoutSuccess'));
const ShiftTemplatesPage = lazy(() => import('@/pages/ShiftTemplates'));
const ProfilePage = lazy(() => import('@/pages/Profile'));

/* ──────────────────────────────────────────────────────────────
   Kresna AppShell — Redesigned
   - Collapsible sidebar support
   - Frosted glass header
   - Better mobile drawer with slide animation
   - Kresna shadow + transitions
   ────────────────────────────────────────────────────────────── */

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-kresna-border border-t-primary-500" />
        <span className="text-body-sm text-kresna-gray animate-pulse">Loading...</span>
      </div>
    </div>
  );
}

function TrialBanner({ daysRemaining, slug }: { daysRemaining: number | null; slug: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const daysText = daysRemaining !== null ? daysRemaining : '?';

  return (
    <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-white">
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <p className="text-body-sm font-medium">
            {t('billing.trialBanner', { days: daysText, defaultValue: `Trial: ${daysText} days remaining` })}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/t/${slug}/billing`)}
          className="bg-white text-primary-600 hover:bg-white/90 text-xs font-semibold px-4 shadow-sm"
        >
          {t('billing.upgrade', { defaultValue: 'Upgrade' })}
        </Button>
      </div>
    </div>
  );
}

function PastDueBanner({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-body-sm font-medium">
            {t('billing.pastDueBanner', { defaultValue: 'Payment past due. Please update your billing information.' })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/t/${slug}/billing`)}
          className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-semibold"
        >
          {t('billing.updateBilling', { defaultValue: 'Update billing' })}
        </Button>
      </div>
    </div>
  );
}

function ExpiredOverlay({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 text-center shadow-kresna-lg animate-scale-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
          <AlertTriangle className="h-10 w-10 text-primary-500" />
        </div>
        <h2 className="mb-3 text-heading-3 text-charcoal">
          {t('billing.expiredTitle', { defaultValue: 'Subscription expired' })}
        </h2>
        <p className="mb-8 text-body-sm text-kresna-gray-dark leading-relaxed">
          {t('billing.expiredDescription', { defaultValue: 'Your trial or subscription has ended. Upgrade to continue using Torre Tempo.' })}
        </p>
        <Button
          size="touch-lg"
          variant="gradient"
          onClick={() => navigate(`/t/${slug}/billing`)}
          className="w-full"
        >
          {t('billing.choosePlan', { defaultValue: 'Choose a plan' })}
        </Button>
      </div>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const subscription = useSubscription();

  const showTrialBanner = subscription.isTrialing && !subscription.isLoading;
  const showPastDueBanner = subscription.subscriptionStatus === 'past_due' && !subscription.isLoading;
  const showExpiredOverlay = subscription.isExpired && !subscription.isLoading;

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Desktop sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden bg-white border-r border-kresna-border shadow-kresna-lg animate-slide-up">
            <div className="relative h-full">
              <Sidebar />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-3 top-4 rounded-xl p-2 text-kresna-gray hover:bg-kresna-light hover:text-kresna-gray-dark transition-colors"
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
      <div className={cn(
        'transition-all duration-300 ease-kresna',
        sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
      )}>
        {/* Subscription banners */}
        {showTrialBanner && <TrialBanner daysRemaining={subscription.daysRemaining} slug={slug || ''} />}
        {showPastDueBanner && <PastDueBanner slug={slug || ''} />}

        {/* Header — frosted glass on scroll */}
        <header className="sticky top-0 z-30 h-16 glass border-b border-kresna-border/50">
          <div className="flex h-full items-center justify-between px-4 lg:px-8">
            {/* Mobile: menu + brand */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-kresna-gray-dark hover:bg-kresna-light hover:text-charcoal transition-colors min-h-touch"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-sm">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-charcoal text-body-sm">{organization?.name || 'Tempo'}</span>
              </div>
            </div>

            {/* Desktop: spacer */}
            <div className="hidden lg:block" />

            {/* Right side */}
            <div className="flex items-center gap-2">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2 h-10 min-h-touch rounded-2xl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
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
                        {(user as any)?.role === 'admin' && (
                          <span className="badge-warning text-[10px] py-0 px-1.5">Admin</span>
                        )}
                      </div>
                      <span className="text-caption font-normal text-kresna-gray">{user?.email}</span>
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
                  <DropdownMenuItem onClick={() => navigate(`/t/${slug}/profile`)}>
                    <User className="mr-2 h-4 w-4" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
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
          <div className="p-4 sm:p-6 lg:p-8">
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
                <Route path="billing/success" element={<CheckoutSuccess />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="shift-templates" element={<ShiftTemplatesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/:id" element={<ReportDetailPage />} />
                <Route path="reports/generate" element={<GenerateReportPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to={`/t/${slug}/dashboard`} replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <BottomTabs />

      {/* Expired paywall overlay (renders on top of everything) */}
      {showExpiredOverlay && <ExpiredOverlay slug={slug || ''} />}
    </div>
  );
}

/**
 * Dashboard Page
 *
 * Role-aware landing page per architecture doc:
 * - Employee (Maria): Today's shift + giant clock-in CTA + weekly hours bar + upcoming 3-day shifts
 * - Manager (Carlos): LiveAttendance at top + pending actions cards + team overview
 * - Owner (Javier): 4-column KPI grid + subscription status + compliance traffic light
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Calendar,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Repeat2,
  FileText,
  Users,
  CreditCard,
  Sparkles,
  Play,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useIsManager } from '@/hooks/useIsManager';
import { useOrganization } from '@/hooks/useOrganization';
import { useSubscription } from '@/hooks/useSubscription';
import { LiveAttendanceWidget } from '@/components/dashboard/LiveAttendanceWidget';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';
import { fetchUnreadCount } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

interface TodayShift {
  id: string;
  start_time: string;
  end_time: string;
  location_name?: string;
  status: string;
}

interface WeeklyHours {
  totalHours: number;
  scheduledHours: number;
  overtimeHours: number;
}

interface DashboardData {
  todayShifts: TodayShift[];
  weeklyHours: WeeklyHours;
  upcomingShifts: TodayShift[];
  pendingSwaps: number;
  unreadNotifications: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ============================================================================
// Skeleton
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
      <div className="h-10 w-56 rounded-2xl bg-kresna-border" />
      <div className="h-4 w-40 rounded-lg bg-kresna-light" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-40 rounded-3xl bg-kresna-light border border-kresna-border"
          />
        ))}
      </div>
      <div className="h-64 rounded-3xl bg-kresna-light border border-kresna-border" />
    </div>
  );
}

// ============================================================================
// Stat Card (inline, Kresna-styled)
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'primary',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'primary' | 'emerald' | 'amber' | 'red';
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const colorMap = {
    primary: {
      bg: 'bg-white',
      border: 'border-kresna-border',
      text: 'text-primary-600',
      icon: 'bg-primary-50',
      value: 'text-charcoal',
    },
    emerald: {
      bg: 'bg-white',
      border: 'border-kresna-border',
      text: 'text-emerald-600',
      icon: 'bg-emerald-50',
      value: 'text-charcoal',
    },
    amber: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      text: 'text-amber-600',
      icon: 'bg-amber-100',
      value: 'text-amber-700',
    },
    red: {
      bg: 'bg-red-50/50',
      border: 'border-red-200',
      text: 'text-red-600',
      icon: 'bg-red-100',
      value: 'text-red-700',
    },
  };
  const c = colorMap[color];

  return (
    <div
      className={cn(
        'rounded-3xl p-6 sm:p-8 border shadow-card transition-all duration-300 ease-kresna',
        c.bg,
        c.border,
        onClick &&
          'cursor-pointer hover:-translate-y-1 hover:shadow-kresna active:scale-[0.98]'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-body-sm font-medium text-kresna-gray leading-tight">
          {label}
        </span>
        <div
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0',
            c.icon
          )}
        >
          <Icon className={cn('h-6 w-6', c.text)} />
        </div>
      </div>
      <p
        className={cn(
          'text-metric tabular-nums tracking-tighter leading-none mb-2',
          c.value
        )}
      >
        {value}
      </p>
      {sub && (
        <span className="text-caption text-kresna-gray">{sub}</span>
      )}
      {onClick && (
        <div
          className={cn(
            'flex items-center gap-1 mt-3 text-body-sm font-medium',
            c.text
          )}
        >
          <span>{t('common.view')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Subscription Status Card (Owner/Admin only)
// ============================================================================

function SubscriptionStatusCard({
  subscription,
  slug,
  onNavigate,
}: {
  subscription: ReturnType<typeof useSubscription>;
  slug: string;
  onNavigate: (path: string) => void;
}) {
  const { t } = useTranslation();

  const tierLabel = subscription.isTrialing
    ? t('dashboard.subscription.freeTrial')
    : subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1);

  const daysRemaining = subscription.daysRemaining ?? 0;

  const trialProgress = subscription.isTrialing
    ? Math.max(0, Math.min(100, ((14 - daysRemaining) / 14) * 100))
    : 0;

  const employeePercent =
    subscription.employeeLimit && subscription.employeeLimit > 0
      ? Math.round((subscription.employeeCount / subscription.employeeLimit) * 100)
      : 0;

  const showUpgradeButton = subscription.isTrialing || subscription.needsUpgrade;

  let borderColor = 'border-primary-200';
  let gradientBg = 'bg-gradient-to-br from-primary-50 to-accent-50';
  if (subscription.isExpired) {
    borderColor = 'border-red-300';
    gradientBg = 'bg-gradient-to-br from-red-50 to-amber-50';
  } else if (subscription.needsUpgrade) {
    borderColor = 'border-amber-300';
    gradientBg = 'bg-gradient-to-br from-amber-50 to-primary-50';
  }

  return (
    <div
      className={cn(
        'rounded-3xl p-6 sm:p-8 border shadow-card',
        borderColor,
        gradientBg
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-body-sm font-medium text-kresna-gray">
              {t('dashboard.subscription.title')}
            </p>
            <p className="text-heading-4 text-charcoal">{tierLabel}</p>
          </div>
        </div>
        {showUpgradeButton && (
          <button
            onClick={() => onNavigate(`/t/${slug}/billing`)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-primary px-4 py-2 text-body-sm font-semibold text-white hover:shadow-glow transition-all duration-300 ease-kresna shadow-kresna-btn"
          >
            <Sparkles className="h-4 w-4" />
            {t('dashboard.subscription.upgrade')}
          </button>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {subscription.isTrialing && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-body-sm font-medium text-kresna-gray-dark">
                {t('dashboard.subscription.trialRemaining')}
              </span>
              <span
                className={cn(
                  'text-body-sm font-semibold',
                  daysRemaining <= 3 ? 'text-red-600' : 'text-primary-600'
                )}
              >
                {daysRemaining} {t('dashboard.subscription.days')}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  daysRemaining <= 3 ? 'bg-red-500' : 'bg-primary-500'
                )}
                style={{ width: `${trialProgress}%` }}
              />
            </div>
          </div>
        )}

        {subscription.employeeLimit !== null && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-body-sm font-medium text-kresna-gray-dark">
                {t('dashboard.subscription.employees')}
              </span>
              <span className="text-body-sm font-semibold text-kresna-gray-dark">
                {subscription.employeeCount} / {subscription.employeeLimit}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  employeePercent >= 90 ? 'bg-amber-500' : 'bg-accent-500'
                )}
                style={{ width: `${Math.min(employeePercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {subscription.isExpired && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-body-sm font-medium text-red-700">
              {t('dashboard.subscription.expired')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = useIsManager();
  const { organization } = useOrganization();
  const subscription = useSubscription();

  // Determine if user is owner/tenantAdmin to show subscription card
  const memberRole = (organization as any)?.members?.find(
    (m: any) => m.userId === user?.id
  )?.role;
  const isOwnerOrAdmin = ['tenantAdmin', 'owner'].includes(memberRole || '');

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    todayShifts: [],
    weeklyHours: { totalHours: 0, scheduledHours: 0, overtimeHours: 0 },
    upcomingShifts: [],
    pendingSwaps: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    if (!slug) return;

    async function loadDashboard() {
      try {
        // Fetch data in parallel
        const [swapCount, notifCount, shiftsRes] = await Promise.allSettled([
          fetchPendingSwapsCount(slug!),
          fetchUnreadCount(slug!),
          fetch(`${API_URL}/api/v1/org/${slug}/shifts?range=week`, {
            credentials: 'include',
          }).then((r) => (r.ok ? r.json() : { data: [] })),
        ]);

        const pendingSwaps = swapCount.status === 'fulfilled' ? swapCount.value : 0;
        const unreadNotifications = notifCount.status === 'fulfilled' ? notifCount.value : 0;
        const shiftsVal = shiftsRes.status === 'fulfilled' ? shiftsRes.value : {};
        const shifts = shiftsVal?.shifts || shiftsVal?.data || [];

        // Split shifts
        const today = new Date().toISOString().slice(0, 10);
        const todayShifts = shifts.filter(
          (s: any) => s.start_time?.slice(0, 10) === today && s.user_id === user?.id
        );
        const upcomingShifts = shifts
          .filter((s: any) => s.start_time?.slice(0, 10) > today && s.user_id === user?.id)
          .slice(0, 5);

        // Calculate weekly hours
        const myShifts = shifts.filter((s: any) => s.user_id === user?.id);
        const totalHours = myShifts.reduce((sum: number, s: any) => {
          if (!s.start_time || !s.end_time) return sum;
          const diff = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 3600000;
          return sum + diff - (s.break_minutes || 0) / 60;
        }, 0);

        setData({
          todayShifts,
          weeklyHours: {
            totalHours: Math.round(totalHours * 10) / 10,
            scheduledHours: 40,
            overtimeHours: Math.max(0, Math.round((totalHours - 40) * 10) / 10),
          },
          upcomingShifts,
          pendingSwaps,
          unreadNotifications,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [slug, user?.id]);

  if (isLoading) return <DashboardSkeleton />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  })();

  const weekProgress = Math.min(100, (data.weeklyHours.totalHours / 40) * 100);

  // ─── Owner / Admin Layout ───────────────────────────────────────────────────
  if (isOwnerOrAdmin) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-heading-2 text-charcoal">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-body-sm text-kresna-gray mt-1">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Subscription Status */}
        {!subscription.isLoading && (
          <div className="animate-stagger-1">
            <SubscriptionStatusCard
              subscription={subscription}
              slug={slug || ''}
              onNavigate={navigate}
            />
          </div>
        )}

        {/* 4-Column KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger-2">
          <StatCard
            icon={Timer}
            label={t('dashboard.weeklyHours')}
            value={`${data.weeklyHours.totalHours}h`}
            sub={`${t('dashboard.of')} ${data.weeklyHours.scheduledHours}h ${t('dashboard.scheduled')}`}
            color={data.weeklyHours.overtimeHours > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            icon={Users}
            label={t('dashboard.employees')}
            value={subscription.employeeCount || 0}
            sub={t('dashboard.vsLastWeek')}
            color="primary"
            onClick={() => navigate(`/t/${slug}/employees`)}
          />
          <StatCard
            icon={Repeat2}
            label={t('dashboard.pendingSwaps')}
            value={data.pendingSwaps}
            sub={t('dashboard.awaitingResponse')}
            color={data.pendingSwaps > 0 ? 'amber' : 'primary'}
            onClick={() => navigate(`/t/${slug}/swaps`)}
          />
          <StatCard
            icon={FileText}
            label={t('nav.notifications')}
            value={data.unreadNotifications}
            sub={t('dashboard.unread')}
            color={data.unreadNotifications > 0 ? 'red' : 'primary'}
            onClick={() => navigate(`/t/${slug}/notifications`)}
          />
        </div>

        {/* Compliance Traffic Light */}
        {data.weeklyHours.overtimeHours > 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8 flex items-start gap-4 shadow-card animate-stagger-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-heading-4 text-amber-700">
                {t('dashboard.overtimeAlert')}
              </p>
              <p className="text-body-sm text-amber-600 mt-1">
                {t('dashboard.overtimeMessage', {
                  hours: data.weeklyHours.overtimeHours,
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 sm:p-8 flex items-start gap-4 shadow-card animate-stagger-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-heading-4 text-emerald-700">
                {t('dashboard.complianceScore')}
              </p>
              <p className="text-body-sm text-emerald-600 mt-1">
                {t('dashboard.spanishLaborLaw')}
              </p>
            </div>
          </div>
        )}

        {/* Manager section: LiveAttendance if also a manager */}
        {isManager && (
          <div className="animate-stagger-4">
            <h2 className="text-heading-4 text-charcoal mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              {t('dashboard.teamOverview')}
            </h2>
            <LiveAttendanceWidget />
          </div>
        )}
      </div>
    );
  }

  // ─── Manager Layout ─────────────────────────────────────────────────────────
  if (isManager) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-heading-2 text-charcoal">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-body-sm text-kresna-gray mt-1">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* LiveAttendance prominently at top */}
        <div className="animate-stagger-1">
          <LiveAttendanceWidget />
        </div>

        {/* Pending Actions Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-stagger-2">
          <StatCard
            icon={Repeat2}
            label={t('dashboard.pendingSwaps')}
            value={data.pendingSwaps}
            sub={t('dashboard.awaitingResponse')}
            color={data.pendingSwaps > 0 ? 'amber' : 'primary'}
            onClick={() => navigate(`/t/${slug}/swaps`)}
          />
          <StatCard
            icon={FileText}
            label={t('nav.notifications')}
            value={data.unreadNotifications}
            sub={t('dashboard.unread')}
            color={data.unreadNotifications > 0 ? 'red' : 'primary'}
            onClick={() => navigate(`/t/${slug}/notifications`)}
          />
          <StatCard
            icon={Timer}
            label={t('dashboard.weeklyHours')}
            value={`${data.weeklyHours.totalHours}h`}
            sub={`${t('dashboard.of')} ${data.weeklyHours.scheduledHours}h ${t('dashboard.scheduled')}`}
            color={data.weeklyHours.overtimeHours > 0 ? 'amber' : 'emerald'}
          />
        </div>

        {/* Compliance Warning */}
        {data.weeklyHours.overtimeHours > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8 flex items-start gap-4 shadow-card animate-stagger-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-heading-4 text-amber-700">
                {t('dashboard.overtimeAlert')}
              </p>
              <p className="text-body-sm text-amber-600 mt-1">
                {t('dashboard.overtimeMessage', {
                  hours: data.weeklyHours.overtimeHours,
                })}
              </p>
            </div>
          </div>
        )}

        {/* Today's Shift (own) */}
        {data.todayShifts.length > 0 && (
          <div className="animate-stagger-3">
            <h2 className="text-heading-4 text-charcoal mb-4">
              {t('dashboard.todayShift')}
            </h2>
            <div
              className="rounded-3xl p-6 sm:p-8 border border-primary-200 bg-white/90 backdrop-blur-sm shadow-card cursor-pointer hover:-translate-y-1 hover:shadow-kresna transition-all duration-300 ease-kresna"
              onClick={() => navigate(`/t/${slug}/clock`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-heading-4 text-charcoal">
                      {formatTime(data.todayShifts[0]!.start_time)} —{' '}
                      {formatTime(data.todayShifts[0]!.end_time)}
                    </p>
                    {data.todayShifts[0]!.location_name && (
                      <p className="text-body-sm text-kresna-gray mt-0.5">
                        {data.todayShifts[0]!.location_name}
                      </p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-kresna-gray" />
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Shifts */}
        {data.upcomingShifts.length > 0 && (
          <div className="animate-stagger-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading-4 text-charcoal flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-600" />
                {t('dashboard.upcomingShifts')}
              </h2>
              <button
                onClick={() => navigate(`/t/${slug}/roster`)}
                className="text-body-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
              >
                {t('dashboard.viewRoster')} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {data.upcomingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-2xl p-4 border border-kresna-border bg-white shadow-card flex items-center justify-between hover:shadow-kresna transition-all duration-300 ease-kresna"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-body-sm font-medium text-charcoal">
                        {formatDay(shift.start_time)}
                      </p>
                      <p className="text-caption text-kresna-gray">
                        {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                      </p>
                    </div>
                  </div>
                  {shift.location_name && (
                    <span className="text-caption text-kresna-gray">
                      {shift.location_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Employee Layout (default) ──────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Greeting with date */}
      <div className="animate-fade-in">
        <h1 className="text-heading-2 text-charcoal">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-body-sm text-kresna-gray mt-1">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Today's Shift Card — prominent with giant clock-in CTA */}
      {data.todayShifts.length > 0 ? (
        <div
          className="rounded-3xl p-6 sm:p-8 border border-primary-200 bg-white/90 backdrop-blur-sm shadow-card cursor-pointer hover:-translate-y-1 hover:shadow-kresna transition-all duration-300 ease-kresna animate-stagger-1"
          onClick={() => navigate(`/t/${slug}/clock`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center">
                <Clock className="h-7 w-7 text-primary-600" />
              </div>
              <div>
                <p className="text-body-sm text-kresna-gray">
                  {t('dashboard.todayShift')}
                </p>
                <p className="text-heading-3 text-charcoal">
                  {formatTime(data.todayShifts[0]!.start_time)} —{' '}
                  {formatTime(data.todayShifts[0]!.end_time)}
                </p>
                {data.todayShifts[0]!.location_name && (
                  <p className="text-body-sm text-kresna-gray mt-0.5">
                    {data.todayShifts[0]!.location_name}
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-kresna-gray" />
          </div>

          {/* Giant Clock-In CTA */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/t/${slug}/clock`);
            }}
            className="mt-6 w-full bg-gradient-primary text-white rounded-2xl min-h-[80px] shadow-glow hover:shadow-glow-lg flex items-center justify-center gap-3 text-heading-4 font-semibold transition-all duration-300 ease-kresna active:scale-[0.97]"
          >
            <Play className="h-7 w-7" />
            {t('clock.clockIn')}
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-stagger-1">
          <div className="rounded-3xl p-6 sm:p-8 border border-kresna-border bg-white/90 backdrop-blur-sm shadow-card">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-body-sm text-kresna-gray">
                  {t('dashboard.today')}
                </p>
                <p className="text-heading-4 text-charcoal">
                  {t('dashboard.noShifts')}
                </p>
                <p className="text-body-sm text-kresna-gray mt-0.5">
                  {t('dashboard.enjoyDayOff')}
                </p>
              </div>
            </div>
          </div>

          {/* Clock-In CTA even when no shifts scheduled */}
          <button
            onClick={() => navigate(`/t/${slug}/clock`)}
            className="w-full bg-gradient-primary text-white rounded-2xl min-h-[80px] shadow-glow hover:shadow-glow-lg flex items-center justify-center gap-3 text-heading-4 font-semibold transition-all duration-300 ease-kresna active:scale-[0.97]"
          >
            <Play className="h-7 w-7" />
            {t('clock.clockIn')}
          </button>
        </div>
      )}

      {/* Weekly Hours Progress */}
      <div className="rounded-3xl border border-kresna-border bg-white/90 backdrop-blur-sm shadow-card p-6 sm:p-8 animate-stagger-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-body-sm font-medium text-kresna-gray-dark">
            {t('dashboard.hoursThisWeek')}
          </span>
          <span className="text-heading-4 tabular-nums text-charcoal">
            {data.weeklyHours.totalHours}h{' '}
            <span className="text-body-sm font-normal text-kresna-gray">
              / {data.weeklyHours.scheduledHours}h
            </span>
          </span>
        </div>
        <div className="h-3 rounded-full bg-kresna-light overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              weekProgress > 100 ? 'bg-amber-500' : 'bg-primary-500'
            )}
            style={{ width: `${Math.min(weekProgress, 100)}%` }}
          />
        </div>
        {data.weeklyHours.overtimeHours > 0 && (
          <p className="text-body-sm text-amber-600 font-medium mt-2">
            {data.weeklyHours.overtimeHours}h {t('dashboard.overtime')}
          </p>
        )}
      </div>

      {/* Stats: Swaps + Notifications */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-stagger-2">
        <StatCard
          icon={Repeat2}
          label={t('dashboard.pendingSwaps')}
          value={data.pendingSwaps}
          sub={t('dashboard.awaitingResponse')}
          color={data.pendingSwaps > 0 ? 'amber' : 'primary'}
          onClick={() => navigate(`/t/${slug}/swaps`)}
        />
        <StatCard
          icon={FileText}
          label={t('nav.notifications')}
          value={data.unreadNotifications}
          sub={t('dashboard.unread')}
          color={data.unreadNotifications > 0 ? 'red' : 'primary'}
          onClick={() => navigate(`/t/${slug}/notifications`)}
        />
      </div>

      {/* Upcoming Shifts — compact 3-day timeline */}
      {data.upcomingShifts.length > 0 && (
        <div className="animate-stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-4 text-charcoal flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-600" />
              {t('dashboard.upcomingShifts')}
            </h2>
            <button
              onClick={() => navigate(`/t/${slug}/roster`)}
              className="text-body-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
            >
              {t('dashboard.viewRoster')} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {data.upcomingShifts.slice(0, 3).map((shift) => (
              <div
                key={shift.id}
                className="rounded-2xl p-4 border border-kresna-border bg-white/90 backdrop-blur-sm shadow-card flex items-center justify-between hover:shadow-kresna transition-all duration-300 ease-kresna"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-charcoal">
                      {formatDay(shift.start_time)}
                    </p>
                    <p className="text-caption text-kresna-gray">
                      {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                    </p>
                  </div>
                </div>
                {shift.location_name && (
                  <span className="text-caption text-kresna-gray">
                    {shift.location_name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Overtime Warning */}
      {data.weeklyHours.overtimeHours > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8 flex items-start gap-4 shadow-card animate-stagger-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-heading-4 text-amber-700">
              {t('dashboard.overtimeAlert')}
            </p>
            <p className="text-body-sm text-amber-600 mt-1">
              {t('dashboard.overtimeMessage', {
                hours: data.weeklyHours.overtimeHours,
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

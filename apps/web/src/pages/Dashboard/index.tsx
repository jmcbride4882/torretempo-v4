/**
 * Dashboard Page
 *
 * Role-aware landing page per architecture doc:
 * - Employee: Today's shift, hours this week, upcoming schedule, quick clock-in
 * - Manager: Live attendance widget, pending approvals, compliance alerts
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
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-100 border border-slate-200" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-slate-100 border border-slate-200" />
    </div>
  );
}

// ============================================================================
// Stat Card
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
    primary: { bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-600', icon: 'bg-primary-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'bg-emerald-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: 'bg-amber-100' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: 'bg-red-100' },
  };
  const c = colorMap[color];

  return (
    <div
      className={cn(
        'rounded-2xl p-5 border shadow-card',
        c.bg,
        c.border,
        onClick && 'cursor-pointer hover:shadow-card-hover transition-all'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', c.icon)}>
          <Icon className={cn('h-5 w-5', c.text)} />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className={cn('text-3xl font-bold', c.text)}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      {onClick && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs', c.text)}>
          <span>{t('common.view')}</span>
          <ArrowRight className="h-3 w-3" />
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

  // Choose border/accent based on urgency
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
        'rounded-2xl p-5 border shadow-card',
        borderColor,
        gradientBg
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('dashboard.subscription.title')}</p>
            <p className="text-lg font-bold text-slate-900">{tierLabel}</p>
          </div>
        </div>
        {showUpgradeButton && (
          <button
            onClick={() => onNavigate(`/t/${slug}/billing`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('dashboard.subscription.upgrade')}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {/* Trial progress */}
        {subscription.isTrialing && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">
                {t('dashboard.subscription.trialRemaining')}
              </span>
              <span className={cn(
                'text-xs font-semibold',
                daysRemaining <= 3 ? 'text-red-600' : 'text-primary-600'
              )}>
                {daysRemaining} {t('dashboard.subscription.days')}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
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

        {/* Employee count vs limit */}
        {subscription.employeeLimit !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">
                {t('dashboard.subscription.employees')}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {subscription.employeeCount} / {subscription.employeeLimit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
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

        {/* Expired warning */}
        {subscription.isExpired && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-xs font-medium text-red-700">
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Subscription Status Card (owners/admins only) */}
      {isOwnerOrAdmin && !subscription.isLoading && (
        <SubscriptionStatusCard
          subscription={subscription}
          slug={slug || ''}
          onNavigate={navigate}
        />
      )}

      {/* Today's Shift Card */}
      {data.todayShifts.length > 0 ? (
        <div
          className="rounded-2xl p-5 border border-primary-200 bg-primary-50 shadow-card cursor-pointer hover:shadow-card-hover transition-all"
          onClick={() => navigate(`/t/${slug}/clock`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('dashboard.todayShift')}</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatTime(data.todayShifts[0]!.start_time)} — {formatTime(data.todayShifts[0]!.end_time)}
                </p>
                {data.todayShifts[0]!.location_name && (
                  <p className="text-xs text-slate-500">{data.todayShifts[0]!.location_name}</p>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.today')}</p>
              <p className="text-lg font-semibold text-slate-900">{t('dashboard.noShifts')}</p>
              <p className="text-xs text-slate-500">{t('dashboard.enjoyDayOff')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Week Hours Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">{t('dashboard.hoursThisWeek')}</span>
          <span className="text-sm text-slate-500">
            {data.weeklyHours.totalHours}h / {data.weeklyHours.scheduledHours}h
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              weekProgress > 100 ? 'bg-amber-500' : 'bg-primary-500'
            )}
            style={{ width: `${Math.min(weekProgress, 100)}%` }}
          />
        </div>
        {data.weeklyHours.overtimeHours > 0 && (
          <p className="text-xs text-amber-600 mt-1.5">
            {data.weeklyHours.overtimeHours}h {t('dashboard.overtime')}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Timer}
          label={t('dashboard.hoursThisWeek')}
          value={`${data.weeklyHours.totalHours}h`}
          sub={`${t('dashboard.of')} ${data.weeklyHours.scheduledHours}h ${t('dashboard.scheduled')}`}
          color={data.weeklyHours.overtimeHours > 0 ? 'amber' : 'emerald'}
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

      {/* Manager Section */}
      {isManager && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            {t('dashboard.teamOverview')}
          </h2>
          <LiveAttendanceWidget />
        </div>
      )}

      {/* Upcoming Shifts */}
      {data.upcomingShifts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-600" />
              {t('dashboard.upcomingShifts')}
            </h2>
            <button
              onClick={() => navigate(`/t/${slug}/roster`)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              {t('dashboard.viewRoster')} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {data.upcomingShifts.map((shift) => (
              <div
                key={shift.id}
                className="rounded-xl p-4 border border-slate-200 bg-white shadow-card flex items-center justify-between hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent-50 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatDay(shift.start_time)}</p>
                    <p className="text-xs text-slate-500">
                      {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                    </p>
                  </div>
                </div>
                {shift.location_name && (
                  <span className="text-xs text-slate-500">{shift.location_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Warning (if overtime) */}
      {data.weeklyHours.overtimeHours > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700">{t('dashboard.overtimeAlert')}</p>
            <p className="text-xs text-amber-600">
              {t('dashboard.overtimeMessage', { hours: data.weeklyHours.overtimeHours })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

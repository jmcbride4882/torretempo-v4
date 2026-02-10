/**
 * Dashboard Page
 *
 * Role-aware landing page per architecture doc:
 * - Employee: Today's shift, hours this week, upcoming schedule, quick clock-in
 * - Manager: Live attendance widget, pending approvals, compliance alerts
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useIsManager } from '@/hooks/useIsManager';
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
      <div className="h-8 w-48 rounded-lg bg-zinc-800/50" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-zinc-800/30 border border-zinc-800/50" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-zinc-800/30 border border-zinc-800/50" />
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
  const colorMap = {
    primary: { bg: 'bg-primary-500/10', border: 'border-primary-500/20', text: 'text-primary-400', icon: 'bg-primary-500/20' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'bg-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'bg-amber-500/20' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: 'bg-red-500/20' },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card rounded-2xl p-5 border',
        c.bg,
        c.border,
        onClick && 'cursor-pointer hover:brightness-110 transition-all'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', c.icon)}>
          <Icon className={cn('h-5 w-5', c.text)} />
        </div>
        <span className="text-sm text-neutral-400">{label}</span>
      </div>
      <p className={cn('text-3xl font-bold', c.text)}>{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
      {onClick && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs', c.text)}>
          <span>View</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = useIsManager();

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
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-neutral-400">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </motion.div>

      {/* Today's Shift Card */}
      {data.todayShifts.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 border border-primary-500/20 bg-primary-500/5 cursor-pointer hover:brightness-110 transition-all"
          onClick={() => navigate(`/t/${slug}/clock`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">Today's Shift</p>
                <p className="text-xl font-bold text-white">
                  {formatTime(data.todayShifts[0]!.start_time)} — {formatTime(data.todayShifts[0]!.end_time)}
                </p>
                {data.todayShifts[0]!.location_name && (
                  <p className="text-xs text-neutral-500">{data.todayShifts[0]!.location_name}</p>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-500" />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 border border-zinc-800/50"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-zinc-800/50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-400">Today</p>
              <p className="text-lg font-semibold text-white">No shifts scheduled</p>
              <p className="text-xs text-neutral-500">Enjoy your day off</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Timer}
          label="Hours This Week"
          value={`${data.weeklyHours.totalHours}h`}
          sub={`of ${data.weeklyHours.scheduledHours}h scheduled`}
          color={data.weeklyHours.overtimeHours > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          icon={Repeat2}
          label="Pending Swaps"
          value={data.pendingSwaps}
          sub="Awaiting response"
          color={data.pendingSwaps > 0 ? 'amber' : 'primary'}
          onClick={() => navigate(`/t/${slug}/swaps`)}
        />
        <StatCard
          icon={FileText}
          label="Notifications"
          value={data.unreadNotifications}
          sub="Unread"
          color={data.unreadNotifications > 0 ? 'red' : 'primary'}
          onClick={() => navigate(`/t/${slug}/notifications`)}
        />
      </div>

      {/* Manager Section */}
      {isManager && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            Team Overview
          </h2>
          <LiveAttendanceWidget />
        </motion.div>
      )}

      {/* Upcoming Shifts */}
      {data.upcomingShifts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-400" />
              Upcoming Shifts
            </h2>
            <button
              onClick={() => navigate(`/t/${slug}/roster`)}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View Roster <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {data.upcomingShifts.map((shift) => (
              <div
                key={shift.id}
                className="glass-card rounded-xl p-4 border border-zinc-800/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{formatDay(shift.start_time)}</p>
                    <p className="text-xs text-neutral-500">
                      {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                    </p>
                  </div>
                </div>
                {shift.location_name && (
                  <span className="text-xs text-neutral-500">{shift.location_name}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Compliance Warning (if overtime) */}
      {data.weeklyHours.overtimeHours > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">Overtime Alert</p>
            <p className="text-xs text-neutral-400">
              You have {data.weeklyHours.overtimeHours}h of overtime this week.
              Spanish law limits weekly hours to 40h regular time.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

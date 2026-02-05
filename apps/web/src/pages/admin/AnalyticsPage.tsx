/**
 * AnalyticsPage - Admin Platform Analytics
 * User growth chart, organization metrics, revenue placeholder
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart3,
  RefreshCw,
  Users,
  Building2,
  TrendingUp,
  Clock,
  ArrowLeftRight,
  Calendar,
  DollarSign,
  LineChart,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchAnalytics } from '@/lib/api/admin';
import type { AnalyticsData } from '@/lib/api/admin';

// Format number with commas
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function AnalyticsPage() {
  // State
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch analytics
  const loadAnalytics = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
      if (silent) toast.success('Analytics refreshed');
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handlers
  const handleRefresh = () => loadAnalytics(true);

  if (isLoading) {
    return <AnalyticsPageSkeleton />;
  }

  // Calculate growth rate from user growth data
  const userGrowthRate = analytics?.userGrowth && analytics.userGrowth.length >= 2
    ? (((analytics.userGrowth[analytics.userGrowth.length - 1]?.newUsers ?? 0) -
        (analytics.userGrowth[analytics.userGrowth.length - 2]?.newUsers ?? 0)) /
       Math.max(analytics.userGrowth[analytics.userGrowth.length - 2]?.newUsers ?? 1, 1)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600/20 to-rose-600/20 shadow-lg shadow-pink-500/10">
            <BarChart3 className="h-5 w-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Analytics</h1>
            <p className="text-sm text-neutral-400">Platform growth and usage metrics</p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Key metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          icon={Users}
          label="Total Users"
          value={formatNumber(analytics?.userGrowth?.[analytics.userGrowth.length - 1]?.users ?? 0)}
          trend={userGrowthRate}
          color="pink"
          delay={0}
        />
        <MetricCard
          icon={Building2}
          label="Organizations"
          value={formatNumber(analytics?.organizationMetrics?.totalOrganizations ?? 0)}
          subtitle={`${analytics?.organizationMetrics?.activeOrganizations ?? 0} active`}
          color="blue"
          delay={0.05}
        />
        <MetricCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(analytics?.revenueMetrics?.totalRevenue ?? 0)}
          color="emerald"
          delay={0.1}
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Members/Org"
          value={(analytics?.organizationMetrics?.avgMembersPerOrg ?? 0).toFixed(1)}
          color="amber"
          delay={0.15}
        />
      </motion.div>

      {/* User growth chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">User Growth</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-pink-500" />
              <span className="text-neutral-400">Total Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-neutral-400">New Users</span>
            </div>
          </div>
        </div>

        {analytics?.userGrowth && analytics.userGrowth.length > 0 ? (
          <div className="relative h-64">
            {/* Simple bar chart visualization */}
            <div className="flex h-full items-end gap-2">
              {analytics.userGrowth.slice(-12).map((point, index) => {
                const maxUsers = Math.max(...analytics.userGrowth.map((p) => p.users));
                const height = (point.users / maxUsers) * 100;
                const newHeight = (point.newUsers / maxUsers) * 100;

                return (
                  <motion.div
                    key={point.date}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                    className="relative flex-1"
                  >
                    <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-pink-500/30" style={{ height: `${height}%` }} />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${newHeight}%` }}
                      transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
                      className="absolute inset-x-0 bottom-0 rounded-t-lg bg-emerald-500/50"
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-neutral-500">
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <LineChart className="mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">No growth data available</p>
          </div>
        )}
      </motion.div>

      {/* Organization metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orgs by tier */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">Organizations by Tier</h2>
          {analytics?.organizationMetrics?.orgsByTier && analytics.organizationMetrics.orgsByTier.length > 0 ? (
            <div className="space-y-4">
              {analytics.organizationMetrics.orgsByTier.map((item, index) => {
                const total = analytics.organizationMetrics.totalOrganizations;
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                const colors: Record<string, string> = {
                  free: 'bg-neutral-500',
                  starter: 'bg-blue-500',
                  pro: 'bg-emerald-500',
                  enterprise: 'bg-amber-500',
                };

                return (
                  <motion.div
                    key={item.tier}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="capitalize text-neutral-300">{item.tier}</span>
                      <span className="text-neutral-400">
                        {item.count} <span className="text-neutral-500">({percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                        className={cn('h-full rounded-full', colors[item.tier] || 'bg-neutral-500')}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <PieChart className="mb-3 h-8 w-8 text-neutral-600" />
              <p className="text-sm text-neutral-400">No tier data available</p>
            </div>
          )}
        </motion.div>

        {/* Usage metrics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">Platform Usage</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageCard
              icon={Clock}
              label="Time Entries"
              value={formatNumber(analytics?.usageMetrics?.totalTimeEntries ?? 0)}
              color="violet"
              delay={0.35}
            />
            <UsageCard
              icon={Calendar}
              label="Shifts Created"
              value={formatNumber(analytics?.usageMetrics?.totalShifts ?? 0)}
              color="blue"
              delay={0.4}
            />
            <UsageCard
              icon={ArrowLeftRight}
              label="Swap Requests"
              value={formatNumber(analytics?.usageMetrics?.totalSwaps ?? 0)}
              color="amber"
              delay={0.45}
            />
            <UsageCard
              icon={TrendingUp}
              label="Avg Entries/Day"
              value={(analytics?.usageMetrics?.avgEntriesPerDay ?? 0).toFixed(0)}
              color="emerald"
              delay={0.5}
            />
          </div>
        </motion.div>
      </div>

      {/* Monthly revenue */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Monthly Revenue</h2>
        {analytics?.revenueMetrics?.monthlyRevenue && analytics.revenueMetrics.monthlyRevenue.length > 0 ? (
          <div className="relative h-48">
            <div className="flex h-full items-end gap-2">
              {analytics.revenueMetrics.monthlyRevenue.slice(-12).map((point, index) => {
                const maxRevenue = Math.max(...analytics.revenueMetrics.monthlyRevenue.map((p) => p.revenue));
                const height = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;

                return (
                  <motion.div
                    key={point.month}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
                    className="group relative flex-1"
                  >
                    <div className="h-full rounded-t-lg bg-gradient-to-t from-emerald-600/80 to-emerald-400/40 transition-all group-hover:from-emerald-500/80 group-hover:to-emerald-300/40" />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-neutral-500">
                      {point.month.slice(5)}
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {formatCurrency(point.revenue)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <DollarSign className="mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">No revenue data available</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  icon: typeof Users;
  label: string;
  value: string;
  trend?: number;
  subtitle?: string;
  color: 'pink' | 'blue' | 'emerald' | 'amber';
  delay: number;
}

function MetricCard({ icon: Icon, label, value, trend, subtitle, color, delay }: MetricCardProps) {
  const colorClasses = {
    pink: 'from-pink-600/20 to-rose-600/20 text-pink-400',
    blue: 'from-blue-600/20 to-indigo-600/20 text-blue-400',
    emerald: 'from-emerald-600/20 to-teal-600/20 text-emerald-400',
    amber: 'from-amber-600/20 to-orange-600/20 text-amber-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br',
            colorClasses[color]
          )}
        >
          <Icon className={cn('h-5 w-5', colorClasses[color].split(' ').pop())} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            )}
          >
            <TrendingUp className={cn('h-3 w-3', trend < 0 && 'rotate-180')} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-neutral-400">{label}</p>
      {subtitle && <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>}
    </motion.div>
  );
}

// Usage Card Component
interface UsageCardProps {
  icon: typeof Clock;
  label: string;
  value: string;
  color: 'violet' | 'blue' | 'amber' | 'emerald';
  delay: number;
}

function UsageCard({ icon: Icon, label, value, color, delay }: UsageCardProps) {
  const colorClasses = {
    violet: 'bg-violet-500/20 text-violet-400',
    blue: 'bg-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="rounded-xl border border-white/5 bg-white/5 p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-neutral-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </motion.div>
  );
}

// Skeleton
function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-6 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-white/10" />
      </div>

      {/* Metrics skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-white/10" />
              <div className="h-6 w-16 rounded-full bg-white/10" />
            </div>
            <div className="h-8 w-20 rounded bg-white/10" />
            <div className="mt-2 h-4 w-24 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 h-6 w-32 rounded bg-white/10" />
        <div className="h-64 rounded bg-white/5" />
      </div>
    </div>
  );
}

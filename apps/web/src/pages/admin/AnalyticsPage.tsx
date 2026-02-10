/**
 * AnalyticsPage - Admin Platform Analytics
 * User growth chart, organization metrics, revenue placeholder
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 shadow-sm">
            <BarChart3 className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('admin.analytics.title')}</h1>
            <p className="text-sm text-zinc-500">{t('admin.analytics.growthCharts')}</p>
          </div>
        </div>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('admin.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label={t('admin.analytics.totalUsers')}
          value={formatNumber(analytics?.userGrowth?.[analytics.userGrowth.length - 1]?.users ?? 0)}
          trend={userGrowthRate}
          color="pink"
        />
        <MetricCard
          icon={Building2}
          label={t('admin.analytics.totalTenants')}
          value={formatNumber(analytics?.organizationMetrics?.totalOrganizations ?? 0)}
          subtitle={`${analytics?.organizationMetrics?.activeOrganizations ?? 0} active`}
          color="blue"
        />
        <MetricCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(analytics?.revenueMetrics?.totalRevenue ?? 0)}
          color="emerald"
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Members/Org"
          value={(analytics?.organizationMetrics?.avgMembersPerOrg ?? 0).toFixed(1)}
          color="amber"
        />
      </div>

      {/* User growth chart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{t('admin.analytics.growthCharts')}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-pink-500" />
              <span className="text-zinc-500">{t('admin.analytics.totalUsers')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-zinc-500">New Users</span>
            </div>
          </div>
        </div>

        {analytics?.userGrowth && analytics.userGrowth.length > 0 ? (
          <div className="relative h-64">
            {/* Simple bar chart visualization */}
            <div className="flex h-full items-end gap-2">
              {analytics.userGrowth.slice(-12).map((point) => {
                const maxUsers = Math.max(...analytics.userGrowth.map((p) => p.users));
                const height = (point.users / maxUsers) * 100;
                const newHeight = (point.newUsers / maxUsers) * 100;

                return (
                  <div
                    key={point.date}
                    className="relative flex-1"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-pink-500/30" style={{ height: `${height}%` }} />
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-lg bg-emerald-500/50"
                      style={{ height: `${newHeight}%` }}
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500">
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <LineChart className="mb-3 h-8 w-8 text-zinc-400" />
            <p className="text-sm text-zinc-500">No growth data available</p>
          </div>
        )}
      </div>

      {/* Organization metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orgs by tier */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Organizations by Tier</h2>
          {analytics?.organizationMetrics?.orgsByTier && analytics.organizationMetrics.orgsByTier.length > 0 ? (
            <div className="space-y-4">
              {analytics.organizationMetrics.orgsByTier.map((item) => {
                const total = analytics.organizationMetrics.totalOrganizations;
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                const colors: Record<string, string> = {
                  free: 'bg-neutral-500',
                  starter: 'bg-blue-500',
                  pro: 'bg-emerald-500',
                  enterprise: 'bg-amber-500',
                };

                return (
                  <div key={item.tier}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="capitalize text-zinc-700">{item.tier}</span>
                      <span className="text-zinc-500">
                        {item.count} <span className="text-zinc-400">({percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={cn('h-full rounded-full', colors[item.tier] || 'bg-neutral-500')}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <PieChart className="mb-3 h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-500">No tier data available</p>
            </div>
          )}
        </div>

        {/* Usage metrics */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Platform Usage</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageCard
              icon={Clock}
              label={t('admin.analytics.totalTimeEntries')}
              value={formatNumber(analytics?.usageMetrics?.totalTimeEntries ?? 0)}
              color="violet"
            />
            <UsageCard
              icon={Calendar}
              label="Shifts Created"
              value={formatNumber(analytics?.usageMetrics?.totalShifts ?? 0)}
              color="blue"
            />
            <UsageCard
              icon={ArrowLeftRight}
              label="Swap Requests"
              value={formatNumber(analytics?.usageMetrics?.totalSwaps ?? 0)}
              color="amber"
            />
            <UsageCard
              icon={TrendingUp}
              label="Avg Entries/Day"
              value={(analytics?.usageMetrics?.avgEntriesPerDay ?? 0).toFixed(0)}
              color="emerald"
            />
          </div>
        </div>
      </div>

      {/* Monthly revenue */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Monthly Revenue</h2>
        {analytics?.revenueMetrics?.monthlyRevenue && analytics.revenueMetrics.monthlyRevenue.length > 0 ? (
          <div className="relative h-48">
            <div className="flex h-full items-end gap-2">
              {analytics.revenueMetrics.monthlyRevenue.slice(-12).map((point) => {
                const maxRevenue = Math.max(...analytics.revenueMetrics.monthlyRevenue.map((p) => p.revenue));
                const height = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;

                return (
                  <div
                    key={point.month}
                    className="group relative flex-1"
                    style={{ height: `${height}%` }}
                  >
                    <div className="h-full rounded-t-lg bg-emerald-500 transition-all group-hover:bg-emerald-400" />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500">
                      {point.month.slice(5)}
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {formatCurrency(point.revenue)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <DollarSign className="mb-3 h-8 w-8 text-zinc-400" />
            <p className="text-sm text-zinc-500">No revenue data available</p>
          </div>
        )}
      </div>
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
}

function MetricCard({ icon: Icon, label, value, trend, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    pink: 'bg-pink-50 text-pink-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  const iconColor = {
    pink: 'text-pink-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            colorClasses[color]
          )}
        >
          <Icon className={cn('h-5 w-5', iconColor[color])} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            )}
          >
            <TrendingUp className={cn('h-3 w-3', trend < 0 && 'rotate-180')} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
      {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
    </div>
  );
}

// Usage Card Component
interface UsageCardProps {
  icon: typeof Clock;
  label: string;
  value: string;
  color: 'violet' | 'blue' | 'amber' | 'emerald';
}

function UsageCard({ icon: Icon, label, value, color }: UsageCardProps) {
  const colorClasses = {
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

// Skeleton
function AnalyticsPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-100" />
          <div className="space-y-1.5">
            <div className="h-6 w-24 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100" />
      </div>

      <p className="text-center text-sm text-zinc-500">{t('common.loading')}</p>

      {/* Metrics skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-zinc-100" />
              <div className="h-6 w-16 rounded-full bg-zinc-100" />
            </div>
            <div className="h-8 w-20 rounded bg-zinc-100" />
            <div className="mt-2 h-4 w-24 rounded bg-zinc-100" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 p-6">
        <div className="mb-4 h-6 w-32 rounded bg-zinc-100" />
        <div className="h-64 rounded bg-zinc-50" />
      </div>
    </div>
  );
}

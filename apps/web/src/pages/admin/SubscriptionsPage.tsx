/**
 * SubscriptionsPage - Admin Subscriptions Overview
 * MRR/ARR metrics cards, tier breakdown, recent changes
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CreditCard,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchSubscriptionMetrics } from '@/lib/api/admin';
import type { SubscriptionMetrics } from '@/lib/api/admin';

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Tier colors
const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'bg-neutral-500/20', text: 'text-neutral-300', border: 'border-neutral-500/30' },
  starter: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  pro: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  enterprise: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
};

export default function SubscriptionsPage() {
  // State
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch metrics
  const loadMetrics = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const data = await fetchSubscriptionMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching subscription metrics:', error);
      toast.error('Failed to load subscription metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    // Auto-refresh every 10 seconds for live data
    const interval = setInterval(() => loadMetrics(true), 10000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  // Handlers
  const handleRefresh = () => loadMetrics(true);

  if (isLoading) {
    return <SubscriptionsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 shadow-lg shadow-emerald-500/10">
            <CreditCard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Subscriptions</h1>
            <p className="text-sm text-neutral-400">
              Live monitoring • Updates every 10 seconds
            </p>
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

      {/* Revenue metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* MRR */}
        <MetricCard
          icon={DollarSign}
          label="Monthly Recurring Revenue"
          value={formatCurrency(metrics?.mrr || 0)}
          trend={12.5}
          trendLabel="vs last month"
          color="emerald"
          delay={0}
        />

        {/* ARR */}
        <MetricCard
          icon={TrendingUp}
          label="Annual Recurring Revenue"
          value={formatCurrency(metrics?.arr || 0)}
          trend={8.3}
          trendLabel="vs last year"
          color="blue"
          delay={0.05}
        />

        {/* Paid Customers */}
        <MetricCard
          icon={Users}
          label="Paid Customers"
          value={metrics?.totalPaid?.toString() || '0'}
          subtitle={`${metrics?.totalActive || 0} total active`}
          color="amber"
          delay={0.1}
        />

        {/* Churn Rate */}
        <MetricCard
          icon={Percent}
          label="Churn Rate"
          value={`${(metrics?.churnRate || 0).toFixed(1)}%`}
          trend={-2.1}
          trendLabel="vs last month"
          color="red"
          inverted
          delay={0.15}
        />
      </motion.div>

      {/* Tier breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Subscription Tiers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metrics?.tierBreakdown || {}).map(([tier, count], index) => {
            const colors = tierColors[tier] ?? tierColors.free;
            const total = Object.values(metrics?.tierBreakdown || {}).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-4',
                  colors?.border ?? 'border-neutral-500/30',
                  colors?.bg ?? 'bg-neutral-500/20'
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn('text-sm font-medium capitalize', colors?.text ?? 'text-neutral-300')}>{tier}</span>
                  <Badge className={cn('border', colors?.bg ?? 'bg-neutral-500/20', colors?.text ?? 'text-neutral-300', colors?.border ?? 'border-neutral-500/30')}>
                    {percentage}%
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">{count}</p>
                <p className="mt-1 text-sm text-neutral-400">organizations</p>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className={cn('h-full rounded-full', (colors?.bg ?? 'bg-neutral-500/20').replace('/20', '/60'))}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Organizations</span>
          </div>
          <p className="text-3xl font-bold text-white">{metrics?.totalActive || 0}</p>
          <p className="mt-1 text-sm text-neutral-400">
            {metrics?.totalFree || 0} free, {metrics?.totalPaid || 0} paid
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Avg. Revenue/Org</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(metrics?.totalPaid ? (metrics.mrr / metrics.totalPaid) : 0)}
          </p>
          <p className="mt-1 text-sm text-neutral-400">per month</p>
        </div>

        <div className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Conversion Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {metrics?.totalActive
              ? (((metrics.totalPaid || 0) / metrics.totalActive) * 100).toFixed(1)
              : '0'}%
          </p>
          <p className="mt-1 text-sm text-neutral-400">free to paid</p>
        </div>
      </motion.div>

      {/* Recent changes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Subscription Changes</h2>
        {metrics?.recentChanges && metrics.recentChanges.length > 0 ? (
          <div className="space-y-3">
            {metrics.recentChanges.map((change, index) => {
              const isUpgrade =
                ['free', 'starter', 'pro'].indexOf(change.fromTier) <
                ['free', 'starter', 'pro', 'enterprise'].indexOf(change.toTier);

              return (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        isUpgrade ? 'bg-emerald-500/20' : 'bg-red-500/20'
                      )}
                    >
                      {isUpgrade ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{change.organizationName}</p>
                      <p className="text-sm text-neutral-400">
                        {change.fromTier} → {change.toTier}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-neutral-500">
                    {new Date(change.changedAt).toLocaleDateString()}
                  </span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <CreditCard className="mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">No recent subscription changes</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  icon: typeof DollarSign;
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  color: 'emerald' | 'blue' | 'amber' | 'red';
  inverted?: boolean;
  delay: number;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  subtitle,
  color,
  inverted,
  delay,
}: MetricCardProps) {
  const colorClasses = {
    emerald: 'from-emerald-600/20 to-teal-600/20 shadow-emerald-500/10 text-emerald-400',
    blue: 'from-blue-600/20 to-indigo-600/20 shadow-blue-500/10 text-blue-400',
    amber: 'from-amber-600/20 to-orange-600/20 shadow-amber-500/10 text-amber-400',
    red: 'from-red-600/20 to-rose-600/20 shadow-red-500/10 text-red-400',
  };

  const isPositive = inverted ? (trend || 0) < 0 : (trend || 0) > 0;

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
            'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
            colorClasses[color]
          )}
        >
          <Icon className={cn('h-5 w-5', colorClasses[color].split(' ').pop())} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              isPositive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-neutral-400">{label}</p>
      {(trendLabel || subtitle) && (
        <p className="mt-2 text-xs text-neutral-500">{trendLabel || subtitle}</p>
      )}
    </motion.div>
  );
}

// Skeleton
function SubscriptionsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
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
            <div className="h-8 w-24 rounded bg-white/10" />
            <div className="mt-2 h-4 w-32 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Tier breakdown skeleton */}
      <div className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 h-6 w-40 rounded bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 h-4 w-16 rounded bg-white/10" />
              <div className="h-8 w-12 rounded bg-white/10" />
              <div className="mt-3 h-1.5 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

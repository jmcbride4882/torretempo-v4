/**
 * SystemPage - Admin System Health
 * Redis status, queue metrics, failed jobs with retry
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Server,
  RefreshCw,
  CheckCircle2,
  Database,
  HardDrive,
  Clock,
  XCircle,
  RotateCcw,
  Trash2,
  Zap,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  fetchSystemHealth,
  retryFailedJob,
  deleteFailedJob,
} from '@/lib/api/admin';
import type { SystemHealth } from '@/lib/api/admin';

// Format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Format latency
function formatLatency(ms: number): string {
  if (ms < 1) return '<1ms';
  return `${ms.toFixed(0)}ms`;
}

// Format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 10) / 10} ${sizes[i]}`;
}

// Format percentage
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Status colors
const statusColors = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-primary-500',
  unhealthy: 'bg-red-500',
  down: 'bg-red-500',
  connected: 'bg-emerald-500',
  disconnected: 'bg-red-500',
};

export default function SystemPage() {
  const { t } = useTranslation();

  // State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingJobs, setRetryingJobs] = useState<Set<string>>(new Set());

  // Fetch health
  const loadHealth = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const data = await fetchSystemHealth();
      setHealth(data);
    } catch (error) {
      console.error('Error fetching system health:', error);
      toast.error(t('admin.system.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    // Auto-refresh every 5 seconds for live data
    const interval = setInterval(() => loadHealth(true), 5000);
    return () => clearInterval(interval);
  }, [loadHealth]);

  // Handlers
  const handleRefresh = () => loadHealth(true);

  const handleRetryJob = async (queueName: string, jobId: string) => {
    setRetryingJobs((prev) => new Set(prev).add(jobId));
    try {
      await retryFailedJob(queueName, jobId);
      toast.success(t('admin.system.jobQueuedForRetry'));
      loadHealth(true);
    } catch (error) {
      console.error('Error retrying job:', error);
      toast.error(t('admin.system.failedToRetryJob'));
    } finally {
      setRetryingJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleDeleteJob = async (queueName: string, jobId: string) => {
    try {
      await deleteFailedJob(queueName, jobId);
      toast.success(t('admin.system.failedJobDeleted'));
      loadHealth(true);
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error(t('admin.system.failedToDeleteJob'));
    }
  };

  if (isLoading) {
    return <SystemPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shadow-sm">
            <Server className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-charcoal sm:text-2xl">{t('admin.system.title')}</h1>
            <p className="text-sm text-kresna-gray">
              {t('admin.system.liveMonitoring')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Overall status badge */}
          <Badge
            className={cn(
              'gap-1.5 border',
              health?.status === 'healthy'
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700'
                : health?.status === 'degraded'
                ? 'border-primary-500/30 bg-primary-50 text-primary-700'
                : 'border-red-500/30 bg-red-50 text-red-700'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', statusColors[health?.status || 'down'])} />
            {health?.status === 'healthy' ? t('admin.system.healthy') : health?.status === 'degraded' ? t('admin.system.degraded') : t('admin.system.down')}
          </Badge>

          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-kresna-border bg-kresna-light text-kresna-gray-dark hover:bg-kresna-light"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">{t('admin.refresh')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* VPS System metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CPU Usage */}
        <ServiceCard
          icon={Zap}
          label={t('admin.system.cpuUsage')}
          status={health?.system ? 'connected' : 'disconnected'}
          metrics={[
            { label: t('admin.system.usage'), value: formatPercent(health?.system?.cpuUsage || 0), alert: (health?.system?.cpuUsage || 0) > 80 },
            { label: t('admin.system.load1m'), value: health?.system?.loadAverage['1min'].toFixed(2) || '0' },
          ]}
          color="violet"
        />

        {/* Memory Usage */}
        <ServiceCard
          icon={HardDrive}
          label={t('admin.system.memory')}
          status={health?.system ? 'connected' : 'disconnected'}
          metrics={[
            {
              label: t('admin.system.used'),
              value: health?.system ? `${formatBytes(health.system.memory.used)} / ${formatBytes(health.system.memory.total)}` : t('common.notAvailable'),
              alert: (health?.system?.memory.usagePercent || 0) > 85,
            },
            { label: t('admin.system.usage'), value: formatPercent(health?.system?.memory.usagePercent || 0) },
          ]}
          color="blue"
        />

        {/* Disk Usage */}
        <ServiceCard
          icon={Database}
          label={t('admin.system.disk')}
          status={health?.system ? 'connected' : 'disconnected'}
          metrics={[
            {
              label: t('admin.system.used'),
              value: health?.system ? `${formatBytes(health.system.disk.used)} / ${formatBytes(health.system.disk.total)}` : t('common.notAvailable'),
              alert: (health?.system?.disk.usagePercent || 0) > 85,
            },
            { label: t('admin.system.usage'), value: formatPercent(health?.system?.disk.usagePercent || 0) },
          ]}
          color="amber"
        />

        {/* System Info */}
        <ServiceCard
          icon={Server}
          label={t('admin.system.system')}
          status={health?.system ? 'connected' : 'disconnected'}
          metrics={[
            { label: t('admin.system.hostname'), value: health?.system?.hostname || t('admin.system.unknown') },
            { label: t('admin.system.apiUptime'), value: formatUptime(health?.system?.uptime || 0) },
          ]}
          color="red"
        />
      </div>

      {/* Service status cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* API Status */}
        <ServiceCard
          icon={Zap}
          label={t('admin.system.apiServer')}
          status="connected"
          metrics={[
            { label: t('admin.system.apiUptime'), value: formatUptime(health?.uptime || 0) },
            { label: t('admin.system.statusLabel'), value: health?.status || t('admin.system.unknown') },
          ]}
          color="violet"
        />

        {/* PostgreSQL Status */}
        <ServiceCard
          icon={Database}
          label={t('admin.system.dbConnections')}
          status={health?.database.status || 'disconnected'}
          metrics={[
            { label: t('admin.system.statusLabel'), value: health?.database.status === 'connected' ? t('admin.system.connected') : t('admin.system.disconnected') },
            { label: t('admin.system.responseTime'), value: formatLatency(health?.database.responseTime || 0) },
          ]}
          color="blue"
        />

        {/* Redis Status */}
        <ServiceCard
          icon={HardDrive}
          label={t('admin.system.redisStatus')}
          status={health?.redis.status || 'disconnected'}
          metrics={[
            {
              label: t('admin.system.memory'),
              value: health?.redis.memory
                ? `${formatBytes(health.redis.memory.used)} / ${formatBytes(health.redis.memory.peak)}`
                : t('common.notAvailable')
            },
            { label: t('admin.system.ping'), value: formatLatency(health?.redis.ping || 0) },
          ]}
          color="red"
        />

        {/* Queue Status */}
        <ServiceCard
          icon={Layers}
          label={t('admin.system.queueDepth')}
          status={health?.queues && health.queues.length > 0 ? 'connected' : 'disconnected'}
          metrics={[
            { label: t('admin.system.activeQueues'), value: health?.queues?.length?.toString() || '0' },
            {
              label: t('admin.system.failedJobs'),
              value: health?.failedJobs?.reduce((sum, queue) => sum + queue.failedCount, 0).toString() || '0',
              alert: (health?.failedJobs?.reduce((sum, queue) => sum + queue.failedCount, 0) || 0) > 0,
            },
          ]}
          color="amber"
        />
      </div>

      {/* Queue details */}
      <div className="rounded-xl border border-kresna-border bg-white shadow-sm p-6">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">{t('admin.system.queueMetrics')}</h2>
        {health?.queues && health.queues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-kresna-border">
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-kresna-gray">{t('admin.system.queue')}</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-kresna-gray">{t('admin.system.pending')}</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-kresna-gray">{t('admin.system.active')}</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-kresna-gray">{t('admin.system.completed')}</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-kresna-gray">{t('admin.system.delayed')}</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-kresna-gray">{t('admin.system.failed')}</th>
                </tr>
              </thead>
              <tbody>
                {health.queues.map((queue) => (
                  <tr
                    key={queue.name}
                    className="border-b border-kresna-border"
                  >
                    <td className="py-3 font-medium text-charcoal">{queue.name}</td>
                    <td className="py-3 text-right text-kresna-gray-dark">{queue.pending}</td>
                    <td className="py-3 text-right">
                      <span className={cn(queue.active > 0 ? 'text-primary-600' : 'text-kresna-gray')}>
                        {queue.active}
                      </span>
                    </td>
                    <td className="py-3 text-right text-emerald-600">{queue.completed}</td>
                    <td className="py-3 text-right text-primary-600">{queue.delayed}</td>
                    <td className="py-3 text-right">
                      <span className={cn(queue.failed > 0 ? 'text-red-600' : 'text-kresna-gray')}>
                        {queue.failed}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kresna-border bg-kresna-light py-12 text-center">
            <Layers className="mb-3 h-8 w-8 text-kresna-gray" />
            <p className="text-sm text-kresna-gray">{t('admin.system.noQueues')}</p>
          </div>
        )}
      </div>

      {/* Failed jobs */}
      <div className="rounded-xl border border-kresna-border bg-white shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">{t('admin.system.failedJobs')}</h2>
          {health?.failedJobs && health.failedJobs.length > 0 && (
            <Badge className="border border-red-500/30 bg-red-50 text-red-700">
              {t('admin.system.failedCount', { count: health.failedJobs.reduce((sum, queue) => sum + queue.failedCount, 0) })}
            </Badge>
          )}
        </div>

        {health?.failedJobs && health.failedJobs.some(q => q.recentErrors.length > 0) ? (
          <div className="space-y-4">
            {health.failedJobs.map((queueSummary) => (
              queueSummary.recentErrors.length > 0 && (
                <div key={queueSummary.queueName} className="space-y-3">
                  {/* Queue header */}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-kresna-border" />
                    <p className="text-xs font-medium uppercase tracking-wider text-kresna-gray">
                      {t('admin.system.queueHeader', { name: queueSummary.queueName, count: queueSummary.failedCount })}
                    </p>
                    <div className="h-px flex-1 bg-kresna-border" />
                  </div>

                  {/* Recent errors */}
                  {queueSummary.recentErrors.map((error) => (
                    <div
                      key={`${queueSummary.queueName}-${error.jobId}`}
                      className="rounded-xl border border-red-200 bg-red-50 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-charcoal">{t('admin.system.jobId')}: {error.jobId.slice(0, 16)}{error.jobId.length > 16 ? '...' : ''}</p>
                            <p className="text-sm text-kresna-gray">
                              {t('admin.system.queue')}: {queueSummary.queueName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetryJob(queueSummary.queueName, error.jobId)}
                            disabled={retryingJobs.has(error.jobId)}
                            className="gap-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <RotateCcw className={cn('h-3.5 w-3.5', retryingJobs.has(error.jobId) && 'animate-spin')} />
                            {t('admin.system.retry')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteJob(queueSummary.queueName, error.jobId)}
                            className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('admin.system.delete')}
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-lg bg-kresna-light p-3">
                        <p className="font-mono text-sm text-red-700">{error.error}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-kresna-gray">
                        <Clock className="h-3 w-3" />
                        {t('admin.system.failedAt', { date: new Date(error.failedAt).toLocaleString() })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kresna-border bg-kresna-light py-12 text-center">
            <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-500" />
            <p className="text-sm text-kresna-gray">{t('admin.system.noFailedJobs')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Service Card Component
interface ServiceCardProps {
  icon: typeof Server;
  label: string;
  status: 'connected' | 'disconnected';
  metrics: { label: string; value: string; alert?: boolean }[];
  color: 'violet' | 'blue' | 'red' | 'amber';
}

function ServiceCard({ icon: Icon, label, status, metrics, color }: ServiceCardProps) {
  const { t } = useTranslation();
  const colorClasses = {
    violet: 'bg-primary-50 text-primary-600',
    blue: 'bg-primary-50 text-primary-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-primary-50 text-primary-600',
  };

  return (
    <div className="rounded-xl border border-kresna-border bg-white shadow-sm p-5">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            colorClasses[color]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', statusColors[status])} />
          <span className={cn('text-xs font-medium', status === 'connected' ? 'text-emerald-600' : 'text-red-600')}>
            {status === 'connected' ? t('admin.system.online') : t('admin.system.offline')}
          </span>
        </div>
      </div>
      <h3 className="mb-3 font-semibold text-charcoal">{label}</h3>
      <div className="space-y-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between text-sm">
            <span className="text-kresna-gray">{metric.label}</span>
            <span className={cn('font-medium', metric.alert ? 'text-red-600' : 'text-kresna-gray-dark')}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton
function SystemPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-kresna-light" />
          <div className="space-y-1.5">
            <div className="h-6 w-32 animate-pulse rounded bg-kresna-light" />
            <div className="h-4 w-48 animate-pulse rounded bg-kresna-light" />
          </div>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-kresna-light" />
      </div>

      {/* Service cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-kresna-border bg-kresna-light p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-kresna-light" />
              <div className="h-4 w-12 rounded bg-kresna-light" />
            </div>
            <div className="mb-3 h-5 w-24 rounded bg-kresna-light" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-kresna-light" />
              <div className="h-4 w-full rounded bg-kresna-light" />
            </div>
          </div>
        ))}
      </div>

      {/* Queue table skeleton */}
      <div className="animate-pulse rounded-xl border border-kresna-border bg-kresna-light p-6">
        <div className="mb-4 h-6 w-32 rounded bg-kresna-light" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 w-full rounded bg-kresna-light" />
          ))}
        </div>
      </div>
    </div>
  );
}

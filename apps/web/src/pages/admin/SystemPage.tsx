/**
 * SystemPage - Admin System Health
 * Redis status, queue metrics, failed jobs with retry
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Status colors
const statusColors = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  connected: 'bg-emerald-500',
  disconnected: 'bg-red-500',
};

export default function SystemPage() {
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
      if (silent) toast.success('System health refreshed');
    } catch (error) {
      console.error('Error fetching system health:', error);
      toast.error('Failed to load system health');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadHealth(true), 30000);
    return () => clearInterval(interval);
  }, [loadHealth]);

  // Handlers
  const handleRefresh = () => loadHealth(true);

  const handleRetryJob = async (queueName: string, jobId: string) => {
    setRetryingJobs((prev) => new Set(prev).add(jobId));
    try {
      await retryFailedJob(queueName, jobId);
      toast.success('Job queued for retry');
      loadHealth(true);
    } catch (error) {
      console.error('Error retrying job:', error);
      toast.error('Failed to retry job');
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
      toast.success('Failed job deleted');
      loadHealth(true);
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    }
  };

  if (isLoading) {
    return <SystemPageSkeleton />;
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 shadow-lg shadow-violet-500/10">
            <Server className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">System Health</h1>
            <p className="text-sm text-neutral-400">Monitor services and queue status</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Overall status badge */}
          <Badge
            className={cn(
              'gap-1.5 border',
              health?.status === 'healthy'
                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                : health?.status === 'degraded'
                ? 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                : 'border-red-500/30 bg-red-500/20 text-red-300'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', statusColors[health?.status || 'down'])} />
            {health?.status === 'healthy' ? 'All Systems Operational' : health?.status === 'degraded' ? 'Degraded Performance' : 'System Down'}
          </Badge>

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
        </div>
      </motion.div>

      {/* Service status cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* API Status */}
        <ServiceCard
          icon={Zap}
          label="API Server"
          status="connected"
          metrics={[
            { label: 'Uptime', value: formatUptime(health?.uptime || 0) },
            { label: 'Status', value: health?.status || 'Unknown' },
          ]}
          color="violet"
          delay={0}
        />

        {/* Database Status */}
        <ServiceCard
          icon={Database}
          label="PostgreSQL"
          status={health?.database.status || 'disconnected'}
          metrics={[
            { label: 'Status', value: health?.database.status === 'connected' ? 'Connected' : 'Disconnected' },
            { label: 'Response Time', value: formatLatency(health?.database.responseTime || 0) },
          ]}
          color="blue"
          delay={0.05}
        />

        {/* Redis Status */}
        <ServiceCard
          icon={HardDrive}
          label="Redis"
          status={health?.redis.status || 'disconnected'}
          metrics={[
            { 
              label: 'Memory', 
              value: health?.redis.memory 
                ? `${Math.round(health.redis.memory.used / 1024 / 1024)}MB / ${Math.round(health.redis.memory.peak / 1024 / 1024)}MB`
                : 'N/A' 
            },
            { label: 'Ping', value: formatLatency(health?.redis.ping || 0) },
          ]}
          color="red"
          delay={0.1}
        />

        {/* Queue Status */}
        <ServiceCard
          icon={Layers}
          label="Job Queues"
          status={health?.queues && health.queues.length > 0 ? 'connected' : 'disconnected'}
          metrics={[
            { label: 'Active Queues', value: health?.queues?.length?.toString() || '0' },
            {
              label: 'Failed Jobs',
              value: health?.failedJobs?.length?.toString() || '0',
              alert: (health?.failedJobs?.length || 0) > 0,
            },
          ]}
          color="amber"
          delay={0.15}
        />
      </motion.div>

      {/* Queue details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Queue Metrics</h2>
        {health?.queues && health.queues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Queue</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Pending</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Active</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Completed</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Delayed</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Failed</th>
                </tr>
              </thead>
              <tbody>
                {health.queues.map((queue, index) => (
                  <motion.tr
                    key={queue.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                    className="border-b border-white/5"
                  >
                    <td className="py-3 font-medium text-white">{queue.name}</td>
                    <td className="py-3 text-right text-neutral-300">{queue.pending}</td>
                    <td className="py-3 text-right">
                      <span className={cn(queue.active > 0 ? 'text-blue-400' : 'text-neutral-400')}>
                        {queue.active}
                      </span>
                    </td>
                    <td className="py-3 text-right text-emerald-400">{queue.completed}</td>
                    <td className="py-3 text-right text-amber-400">{queue.delayed}</td>
                    <td className="py-3 text-right">
                      <span className={cn(queue.failed > 0 ? 'text-red-400' : 'text-neutral-400')}>
                        {queue.failed}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <Layers className="mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">No queues configured</p>
          </div>
        )}
      </motion.div>

      {/* Failed jobs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Failed Jobs</h2>
          {health?.failedJobs && health.failedJobs.length > 0 && (
            <Badge className="border border-red-500/30 bg-red-500/20 text-red-300">
              {health.failedJobs.length} failed
            </Badge>
          )}
        </div>

        {health?.failedJobs && health.failedJobs.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {health.failedJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20">
                        <XCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{job.name}</p>
                        <p className="text-sm text-neutral-500">
                          Queue: {job.queue} • ID: {job.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetryJob(job.queue, job.id)}
                        disabled={retryingJobs.has(job.id)}
                        className="gap-1.5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      >
                        <RotateCcw className={cn('h-3.5 w-3.5', retryingJobs.has(job.id) && 'animate-spin')} />
                        Retry
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteJob(job.queue, job.id)}
                        className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/30 p-3">
                    <p className="font-mono text-sm text-red-300">{job.failedReason}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500">
                    <Clock className="h-3 w-3" />
                    Failed {new Date(job.failedAt).toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-500" />
            <p className="text-sm text-neutral-400">No failed jobs</p>
          </div>
        )}
      </motion.div>
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
  delay: number;
}

function ServiceCard({ icon: Icon, label, status, metrics, color, delay }: ServiceCardProps) {
  const colorClasses = {
    violet: 'from-violet-600/20 to-purple-600/20 text-violet-400',
    blue: 'from-blue-600/20 to-indigo-600/20 text-blue-400',
    red: 'from-red-600/20 to-rose-600/20 text-red-400',
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
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', statusColors[status])} />
          <span className={cn('text-xs font-medium', status === 'connected' ? 'text-emerald-400' : 'text-red-400')}>
            {status === 'connected' ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <h3 className="mb-3 font-semibold text-white">{label}</h3>
      <div className="space-y-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{metric.label}</span>
            <span className={cn('font-medium', metric.alert ? 'text-red-400' : 'text-neutral-200')}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Skeleton
function SystemPageSkeleton() {
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

      {/* Service cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-white/10" />
              <div className="h-4 w-12 rounded bg-white/10" />
            </div>
            <div className="mb-3 h-5 w-24 rounded bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      {/* Queue table skeleton */}
      <div className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 h-6 w-32 rounded bg-white/10" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 w-full rounded bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

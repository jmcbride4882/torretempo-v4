/**
 * VarianceChart Component
 * Displays scheduled vs actual hours using recharts BarChart
 * Light theme styling to match Torre Tempo design
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VarianceDiscrepancy } from '@/types/reports';

interface VarianceChartProps {
  data: VarianceDiscrepancy[];
  className?: string;
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0] as { payload: { scheduledHours: number; actualHours: number; difference: number; reason?: string } };
  const item = data.payload;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="mb-2 font-medium text-zinc-900">{label}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">Scheduled:</span>
          <span className="font-medium text-emerald-600">{item.scheduledHours.toFixed(1)}h</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">Actual:</span>
          <span className="font-medium text-amber-600">{item.actualHours.toFixed(1)}h</span>
        </div>
        <div className="border-t border-zinc-200 pt-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500">Variance:</span>
            <span
              className={cn(
                'font-medium',
                item.difference > 0 ? 'text-amber-600' : item.difference < 0 ? 'text-red-600' : 'text-zinc-500'
              )}
            >
              {item.difference > 0 ? '+' : ''}
              {item.difference.toFixed(1)}h
            </span>
          </div>
        </div>
        {item.reason && (
          <p className="mt-2 text-xs italic text-zinc-500">{item.reason}</p>
        )}
      </div>
    </div>
  );
}

// Summary stat card
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-zinc-50 p-3', className)}>
      <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={cn(
          'text-lg font-bold',
          trend === 'up' ? 'text-amber-600' : trend === 'down' ? 'text-red-600' : 'text-zinc-900'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function VarianceChart({ data, className }: VarianceChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: formatDate(item.date),
      scheduledHours: item.scheduledHours,
      actualHours: item.actualHours,
      difference: item.difference,
      reason: item.reason,
    }));
  }, [data]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalScheduled = data.reduce((sum, d) => sum + d.scheduledHours, 0);
    const totalActual = data.reduce((sum, d) => sum + d.actualHours, 0);
    const totalVariance = totalActual - totalScheduled;
    const percentVariance = totalScheduled > 0 ? (totalVariance / totalScheduled) * 100 : 0;

    return {
      totalScheduled,
      totalActual,
      totalVariance,
      percentVariance,
      daysWithVariance: data.filter((d) => d.difference !== 0).length,
      totalDays: data.length,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center',
          className
        )}
      >
        <Calendar className="mb-4 h-12 w-12 text-zinc-400" />
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">No Variance Data</h3>
        <p className="text-sm text-zinc-500">
          No discrepancies found for this period.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Scheduled"
          value={`${stats.totalScheduled.toFixed(1)}h`}
          icon={Calendar}
        />
        <StatCard
          label="Actual"
          value={`${stats.totalActual.toFixed(1)}h`}
          icon={Calendar}
        />
        <StatCard
          label="Variance"
          value={`${stats.totalVariance > 0 ? '+' : ''}${stats.totalVariance.toFixed(1)}h`}
          icon={stats.totalVariance > 0 ? TrendingUp : stats.totalVariance < 0 ? TrendingDown : Minus}
          trend={stats.totalVariance > 0 ? 'up' : stats.totalVariance < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label="Variance %"
          value={`${stats.percentVariance > 0 ? '+' : ''}${stats.percentVariance.toFixed(1)}%`}
          icon={stats.percentVariance > 0 ? TrendingUp : stats.percentVariance < 0 ? TrendingDown : Minus}
          trend={stats.percentVariance > 2 ? 'up' : stats.percentVariance < -2 ? 'down' : 'neutral'}
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h4 className="mb-4 text-sm font-medium text-zinc-700">Daily Variance</h4>
        <div className="h-64 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend
                wrapperStyle={{ paddingTop: '16px' }}
                formatter={(value: string) => <span className="text-sm text-zinc-500">{value}</span>}
              />
              <Bar
                dataKey="scheduledHours"
                name="Scheduled"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="actualHours"
                name="Actual"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.difference > 0 ? '#f59e0b' : entry.difference < 0 ? '#ef4444' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Variance days note */}
      <p className="text-center text-xs text-zinc-500">
        {stats.daysWithVariance} of {stats.totalDays} days had variance between scheduled and actual hours
      </p>
    </motion.div>
  );
}

export default VarianceChart;

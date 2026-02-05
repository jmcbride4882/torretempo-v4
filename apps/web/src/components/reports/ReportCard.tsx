/**
 * ReportCard Component
 * Displays a monthly report summary card with glassmorphism styling
 */

import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  Calendar,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MonthlyReport, ReportStatus } from '@/types/reports';

interface ReportCardProps {
  report: MonthlyReport;
  onClick: (id: string) => void;
  onDownload?: (id: string) => Promise<void>;
  className?: string;
}

// Month names
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Format hours to display
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Status badge component
function StatusBadge({ status }: { status: ReportStatus }) {
  const configs: Record<ReportStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
    pending: {
      icon: Clock,
      label: 'Pending',
      className: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
    },
    generating: {
      icon: Loader2,
      label: 'Generating',
      className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    ready: {
      icon: CheckCircle2,
      label: 'Ready',
      className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    delivered: {
      icon: CheckCircle2,
      label: 'Delivered',
      className: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
    },
    failed: {
      icon: AlertCircle,
      label: 'Failed',
      className: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.className
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'generating' && 'animate-spin')} />
      {config.label}
    </span>
  );
}

export function ReportCard({ report, onClick, onDownload, className }: ReportCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      await onDownload(report.id);
    }
  };

  const monthName = MONTHS[report.month - 1] || 'Unknown';
  const hasOvertime = report.overtimeHours > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(report.id)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300',
        'hover:border-white/20 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-primary-500/5',
        className
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Decorative orb */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary-600/10 to-violet-600/10 blur-2xl transition-opacity group-hover:opacity-75" />

      <div className="relative p-5">
        {/* Header: Month/Year + Status */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/20 to-violet-600/20 shadow-lg shadow-primary-500/10">
              <FileText className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{monthName}</h3>
              <p className="text-sm text-neutral-400">{report.year}</p>
            </div>
          </div>
          <StatusBadge status={report.status} />
        </div>

        {/* Metrics */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {/* Total Hours */}
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-neutral-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Total Hours</span>
            </div>
            <p className="text-xl font-bold text-white">{formatHours(report.totalHours)}</p>
          </div>

          {/* Days Worked */}
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-neutral-500">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Days Worked</span>
            </div>
            <p className="text-xl font-bold text-white">{report.totalDays}</p>
          </div>
        </div>

        {/* Overtime badge */}
        {hasOvertime && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">
              {formatHours(report.overtimeHours)} overtime
            </span>
          </div>
        )}

        {/* User info (if available) */}
        {report.userName && (
          <div className="mb-4 flex items-center gap-2 text-sm text-neutral-400">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/80 to-emerald-700/80 text-[10px] font-medium text-white">
              {report.userName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{report.userName}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-white/5 pt-4">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 gap-1.5 rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white"
            onClick={() => onClick(report.id)}
          >
            View Details
          </Button>

          {report.status === 'ready' && report.pdfUrl && onDownload && (
            <Button
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 rounded-lg bg-primary-600/80 text-white hover:bg-primary-500"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Skeleton loader for report cards
 */
export function ReportCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-5 w-24 rounded bg-white/10" />
            <div className="h-4 w-16 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-6 w-20 rounded-full bg-white/10" />
      </div>

      {/* Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-6 w-20 rounded bg-white/10" />
        </div>
        <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-6 w-12 rounded bg-white/10" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-white/5 pt-4">
        <div className="h-8 flex-1 rounded-lg bg-white/10" />
        <div className="h-8 w-16 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

export default ReportCard;

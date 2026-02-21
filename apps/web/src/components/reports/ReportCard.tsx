/**
 * ReportCard Component
 * Displays a monthly report summary card with light theme styling
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
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MonthlyReport, ReportStatus } from '@/types/reports';

interface ReportCardProps {
  report: MonthlyReport;
  onClick: (id: string) => void;
  onDownload?: (id: string) => Promise<void>;
  className?: string;
}

// Month index to translation key mapping
const MONTH_KEYS = [
  'common.months.january',
  'common.months.february',
  'common.months.march',
  'common.months.april',
  'common.months.may',
  'common.months.june',
  'common.months.july',
  'common.months.august',
  'common.months.september',
  'common.months.october',
  'common.months.november',
  'common.months.december',
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
  const { t } = useTranslation();

  const configs: Record<ReportStatus, { icon: typeof CheckCircle2; labelKey: string; className: string }> = {
    pending: {
      icon: Clock,
      labelKey: 'reports.statuses.pending',
      className: 'bg-kresna-light text-kresna-gray-dark border-kresna-border',
    },
    generating: {
      icon: Loader2,
      labelKey: 'reports.statuses.generating',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    ready: {
      icon: CheckCircle2,
      labelKey: 'reports.statuses.ready',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    delivered: {
      icon: CheckCircle2,
      labelKey: 'reports.statuses.delivered',
      className: 'bg-primary-50 text-primary-700 border-primary-200',
    },
    failed: {
      icon: AlertCircle,
      labelKey: 'reports.statuses.failed',
      className: 'bg-red-50 text-red-700 border-red-200',
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
      {t(config.labelKey)}
    </span>
  );
}

export function ReportCard({ report, onClick, onDownload, className }: ReportCardProps) {
  const { t } = useTranslation();

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      await onDownload(report.id);
    }
  };

  const monthName = MONTH_KEYS[report.month - 1]
    ? t(MONTH_KEYS[report.month - 1]!)
    : t('common.unknown');
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
        'group relative cursor-pointer overflow-hidden rounded-2xl border border-kresna-border bg-white shadow-card transition-all duration-300',
        'hover:shadow-kresna',
        className
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Decorative orb */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 blur-2xl transition-opacity group-hover:opacity-75" />

      <div className="relative p-5">
        {/* Header: Month/Year + Status */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 ring-1 ring-primary-200">
              <FileText className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-charcoal">{monthName}</h3>
              <p className="text-sm text-kresna-gray">{report.year}</p>
            </div>
          </div>
          <StatusBadge status={report.status} />
        </div>

        {/* Metrics */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {/* Total Hours */}
          <div className="rounded-xl border border-kresna-border bg-kresna-light p-3">
            <div className="mb-1 flex items-center gap-1.5 text-kresna-gray">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{t('reports.totalHoursLabel')}</span>
            </div>
            <p className="text-xl font-bold text-charcoal">{formatHours(report.totalHours)}</p>
          </div>

          {/* Days Worked */}
          <div className="rounded-xl border border-kresna-border bg-kresna-light p-3">
            <div className="mb-1 flex items-center gap-1.5 text-kresna-gray">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{t('reports.daysWorkedLabel')}</span>
            </div>
            <p className="text-xl font-bold text-charcoal">{report.totalDays}</p>
          </div>
        </div>

        {/* Overtime badge */}
        {hasOvertime && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {t('reports.overtimeAmount', { hours: formatHours(report.overtimeHours) })}
            </span>
          </div>
        )}

        {/* User info (if available) */}
        {report.userName && (
          <div className="mb-4 flex items-center gap-2 text-sm text-kresna-gray">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/80 to-emerald-700/80 text-[10px] font-medium text-white">
              {report.userName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{report.userName}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-kresna-border pt-4">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 gap-1.5 rounded-xl text-kresna-gray-dark hover:bg-kresna-light hover:text-charcoal"
            onClick={() => onClick(report.id)}
          >
            {t('reports.viewDetails')}
          </Button>

          {report.status === 'ready' && report.pdfUrl && onDownload && (
            <Button
              size="sm"
              variant="gradient"
              onClick={handleDownload}
              className="gap-1.5 rounded-xl"
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
    <div className="animate-pulse rounded-2xl border border-kresna-border bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-kresna-light" />
          <div className="space-y-1.5">
            <div className="h-5 w-24 rounded bg-kresna-light" />
            <div className="h-4 w-16 rounded bg-kresna-light" />
          </div>
        </div>
        <div className="h-6 w-20 rounded-full bg-kresna-light" />
      </div>

      {/* Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-xl border border-kresna-border bg-kresna-light p-3">
          <div className="h-3 w-16 rounded bg-kresna-light" />
          <div className="h-6 w-20 rounded bg-kresna-light" />
        </div>
        <div className="space-y-2 rounded-xl border border-kresna-border bg-kresna-light p-3">
          <div className="h-3 w-16 rounded bg-kresna-light" />
          <div className="h-6 w-12 rounded bg-kresna-light" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-kresna-border pt-4">
        <div className="h-8 flex-1 rounded-lg bg-kresna-light" />
        <div className="h-8 w-16 rounded-lg bg-kresna-light" />
      </div>
    </div>
  );
}

export default ReportCard;

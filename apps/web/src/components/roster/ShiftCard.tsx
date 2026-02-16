import { motion } from 'framer-motion';
import { Clock, MapPin, User, AlertCircle, CheckCircle2, FileEdit, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Shift, ShiftStatus } from '@/types/roster';

interface ShiftCardProps {
  shift: Shift;
  style?: React.CSSProperties;
  onClick?: () => void;
  compact?: boolean;
}

// Status configuration with icons and colors (labels resolved via i18n)
const statusConfig: Record<ShiftStatus, {
  icon: typeof Clock;
  bg: string;
  text: string;
  border: string;
  glow: string;
  labelKey: string;
}> = {
  draft: {
    icon: FileEdit,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    glow: '',
    labelKey: 'roster.draft',
  },
  published: {
    icon: AlertCircle,
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    glow: '',
    labelKey: 'roster.published',
  },
  acknowledged: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    glow: '',
    labelKey: 'roster.acknowledged',
  },
  completed: {
    icon: CheckCircle2,
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    glow: '',
    labelKey: 'roster.completed',
  },
  cancelled: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    glow: '',
    labelKey: 'roster.cancelled',
  },
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function ShiftCard({ shift, style, onClick, compact = false }: ShiftCardProps) {
  const { t } = useTranslation();
  const config = statusConfig[shift.status];
  const StatusIcon = config.icon;

  // Use shift's custom color or fallback to status-based styling
  const hasCustomColor = shift.color && shift.color.startsWith('#');

  // Check for compliance violations
  const hasViolations = shift.compliance_warnings && shift.compliance_warnings.length > 0;
  const hasErrors = shift.compliance_warnings?.some((v) => v.severity === 'error');

  const cardContent = (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      transition={{ duration: 0.15 }}
      style={style}
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-lg border transition-all duration-200',
        'hover:shadow-md',
        hasErrors
          ? 'border-red-500 bg-red-500/10 shadow-red-500/20'
          : hasViolations
            ? 'border-amber-500/50 bg-amber-500/5 shadow-amber-500/10'
            : `${config.bg} ${config.border} ${config.glow}`,
        compact ? 'p-1.5' : 'p-2.5'
      )}
    >
      {/* Custom color accent bar */}
      {hasCustomColor && (
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
          style={{ backgroundColor: shift.color! }}
        />
      )}

      {/* Glow effect on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100',
          'bg-gradient-to-br from-white/5 to-transparent'
        )}
      />

      {/* Content */}
      <div className={cn('relative', hasCustomColor && 'pl-2')}>
        {/* Time */}
        <div className={cn('flex items-center gap-1.5', config.text)}>
          <Clock className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          <span className={cn('font-semibold tabular-nums', compact ? 'text-xs' : 'text-sm')}>
            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
          </span>
        </div>

        {!compact && (
          <>
            {/* Duration badge */}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                {calculateDuration(shift.start_time, shift.end_time)}
              </span>
              {shift.break_minutes && shift.break_minutes > 0 && (
                <span className="text-[10px] text-zinc-400">
                  +{shift.break_minutes}m {t('roster.breakLabel')}
                </span>
              )}
            </div>

            {/* Location */}
            {shift.location && (
              <div className="mt-2 flex items-center gap-1.5 text-zinc-500">
                <MapPin className="h-3 w-3" />
                <span className="truncate text-xs">{shift.location.name}</span>
              </div>
            )}

            {/* Assigned user or Open shift */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <User className="h-3 w-3 text-zinc-400" />
              {shift.user ? (
                <span className="truncate text-xs text-zinc-600">{shift.user.name}</span>
              ) : (
                <span className="text-xs italic text-zinc-400">{t('roster.openShift')}</span>
              )}
            </div>

            {/* Status badge and compliance warning */}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-0.5',
                config.bg
              )}>
                <StatusIcon className={cn('h-3 w-3', config.text)} />
                <span className={cn('text-[10px] font-medium', config.text)}>
                  {t(config.labelKey)}
                </span>
              </div>

              {/* Compliance warning indicator */}
              {hasViolations && (
                <div className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full',
                  hasErrors ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                )}>
                  <AlertTriangle className="h-3 w-3" />
                </div>
              )}
            </div>
          </>
        )}

        {compact && shift.user && (
          <div className="mt-0.5 truncate text-[10px] text-zinc-500">
            {shift.user.name}
          </div>
        )}
      </div>

      {/* Hover overlay with more details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileHover={{ opacity: 1, y: 0 }}
        className={cn(
          'pointer-events-none absolute -bottom-1 left-0 right-0 rounded-b-lg',
          'bg-gradient-to-t from-black/60 via-black/30 to-transparent p-2 pt-6',
          'opacity-0 transition-opacity group-hover:opacity-100',
          compact && 'hidden'
        )}
      >
        {shift.notes && (
          <p className="line-clamp-2 text-[10px] italic text-zinc-500">
            "{shift.notes}"
          </p>
        )}
      </motion.div>
    </motion.div>
  );

  // Wrap with tooltip if there are compliance violations
  if (hasViolations && !compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1.5">
              <p className="font-semibold text-zinc-900">{t('roster.complianceIssues')}</p>
              {shift.compliance_warnings!.map((violation, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertTriangle className={cn(
                    'h-3 w-3 shrink-0 mt-0.5',
                    violation.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                  )} />
                  <p className="text-xs text-zinc-600">{violation.message}</p>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}

// Compact version for tight spaces
export function ShiftChip({ shift, onClick }: { shift: Shift; onClick?: () => void }) {
  const config = statusConfig[shift.status];

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-all',
        config.bg,
        config.border,
        config.text
      )}
    >
      <Clock className="h-3 w-3" />
      <span className="font-medium tabular-nums">
        {formatTime(shift.start_time)}
      </span>
    </motion.button>
  );
}

export default ShiftCard;

/**
 * ComplianceStatus Component
 * Displays compliance score and violations list
 * Light theme styling with emerald/red severity colors
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ComplianceViolation, ViolationType } from '@/types/reports';

interface ComplianceStatusProps {
  violations: ComplianceViolation[];
  complianceScore: number;
  className?: string;
}

// Violation type icons
const VIOLATION_ICONS: Record<ViolationType, typeof Clock> = {
  rest_period: Clock,
  daily_limit: Calendar,
  weekly_limit: AlertTriangle,
  break_violation: AlertCircle,
};

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Circular progress component
function CircularProgress({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-emerald-400';
    if (s >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getStrokeColor = (s: number) => {
    if (s >= 90) return '#10b981';
    if (s >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg className="absolute -rotate-90 transform" width="120" height="120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={getStrokeColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className={cn('text-3xl font-bold', getScoreColor(score))}
        >
          {score}
        </motion.span>
        <p className="text-xs text-kresna-gray">/ 100</p>
      </div>
    </div>
  );
}

// Violation card component
function ViolationCard({ violation }: { violation: ComplianceViolation }) {
  const { t } = useTranslation();
  const Icon = VIOLATION_ICONS[violation.violationType];
  const isCritical = violation.severity === 'critical';

  const statusConfig = {
    pending: { icon: AlertCircle, labelKey: 'compliance.correctionStatuses.pending', className: 'text-amber-400' },
    corrected: { icon: CheckCircle2, labelKey: 'compliance.correctionStatuses.corrected', className: 'text-emerald-400' },
    acknowledged: { icon: Info, labelKey: 'compliance.correctionStatuses.acknowledged', className: 'text-primary-400' },
  };

  const status = statusConfig[violation.correctionStatus];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isCritical
          ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/30'
          : 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30'
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              isCritical ? 'bg-red-500/20' : 'bg-amber-500/20'
            )}
          >
            <Icon className={cn('h-4 w-4', isCritical ? 'text-red-400' : 'text-amber-400')} />
          </div>
          <div>
            <p className={cn('text-sm font-medium', isCritical ? 'text-red-300' : 'text-amber-300')}>
              {t(`compliance.violationTypes.${violation.violationType}`)}
            </p>
            <p className="text-[10px] text-kresna-gray">{formatDate(violation.affectedDate)}</p>
          </div>
        </div>

        {/* Severity badge */}
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
            isCritical
              ? 'bg-red-500/20 text-red-300'
              : 'bg-amber-500/20 text-amber-300'
          )}
        >
          {t(`compliance.severities.${violation.severity}`)}
        </span>
      </div>

      {/* Description */}
      <p className="mb-3 text-sm text-kresna-gray-dark">{violation.description}</p>

      {/* Details */}
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-kresna-border bg-kresna-light p-2 text-xs">
        <div className="text-center">
          <p className="text-kresna-gray">{t('compliance.actual')}</p>
          <p className="font-medium text-charcoal">{violation.details.actualValue}h</p>
        </div>
        <div className="text-center">
          <p className="text-kresna-gray">{t('compliance.limitValue')}</p>
          <p className="font-medium text-charcoal">{violation.details.limitValue}h</p>
        </div>
        <div className="text-center">
          <p className="text-kresna-gray">{t('compliance.excess')}</p>
          <p className={cn('font-medium', isCritical ? 'text-red-400' : 'text-amber-400')}>
            +{violation.details.excess}h
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between border-t border-kresna-border pt-3">
        <div className="flex items-center gap-1.5">
          <StatusIcon className={cn('h-3.5 w-3.5', status.className)} />
          <span className={cn('text-xs font-medium', status.className)}>{t(status.labelKey)}</span>
        </div>
        {violation.userName && (
          <span className="text-xs text-kresna-gray">{violation.userName}</span>
        )}
      </div>

      {/* Correction notes */}
      {violation.correctionNotes && (
        <div className="mt-2 rounded-lg bg-kresna-light p-2 text-xs italic text-kresna-gray">
          {violation.correctionNotes}
        </div>
      )}
    </motion.div>
  );
}

export function ComplianceStatus({ violations, complianceScore, className }: ComplianceStatusProps) {
  const { t } = useTranslation();

  // Group violations by type
  const groupedViolations = useMemo(() => {
    const groups: Record<ViolationType, ComplianceViolation[]> = {
      rest_period: [],
      daily_limit: [],
      weekly_limit: [],
      break_violation: [],
    };

    violations.forEach((v) => {
      groups[v.violationType].push(v);
    });

    return groups;
  }, [violations]);

  // Count by severity
  const criticalCount = violations.filter((v) => v.severity === 'critical').length;
  const warningCount = violations.filter((v) => v.severity === 'warning').length;

  // Perfect compliance
  if (violations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('text-center', className)}
      >
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-600/5">
          <ShieldCheck className="h-12 w-12 text-emerald-400" />
        </div>
        <h3 className="mb-1 text-xl font-bold text-charcoal">{t('compliance.perfectTitle')}</h3>
        <p className="text-sm text-kresna-gray">
          {t('compliance.perfectDesc')}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6', className)}
    >
      {/* Score and summary */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CircularProgress score={complianceScore} />

        <div className="flex flex-1 flex-col gap-3 sm:ml-6">
          <h3 className="text-lg font-semibold text-charcoal">
            {t('compliance.complianceScore')}{' '}
            <span
              className={cn(
                complianceScore >= 90
                  ? 'text-emerald-400'
                  : complianceScore >= 70
                  ? 'text-amber-400'
                  : 'text-red-400'
              )}
            >
              {complianceScore >= 90
                ? t('compliance.scoreGood')
                : complianceScore >= 70
                ? t('compliance.scoreNeedsAttention')
                : t('compliance.scoreCritical')}
            </span>
          </h3>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5">
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-kresna-gray">{t('compliance.criticalLabel')}</span>
              </div>
              <p className="mt-1 text-lg font-bold text-red-300">{criticalCount}</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-kresna-gray">{t('compliance.warningsLabel')}</span>
              </div>
              <p className="mt-1 text-lg font-bold text-amber-300">{warningCount}</p>
            </div>
          </div>

          {/* Type breakdown */}
          <div className="space-y-1.5 text-xs">
            {Object.entries(groupedViolations).map(([type, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={type} className="flex items-center justify-between text-kresna-gray">
                  <span>{t(`compliance.violationTypes.${type}`)}</span>
                  <span className="font-medium text-charcoal">{items.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Violations list */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-kresna-gray-dark">{t('compliance.violationsCount', { count: violations.length })}</h4>
        <AnimatePresence mode="popLayout">
          {violations.map((violation) => (
            <ViolationCard key={violation.id} violation={violation} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ComplianceStatus;

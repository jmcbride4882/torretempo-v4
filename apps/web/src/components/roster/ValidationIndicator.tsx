/**
 * ValidationIndicator Component
 * 
 * Displays real-time validation feedback for roster shift assignments.
 * Shows green checkmark, yellow warning, or red X based on validation result.
 */

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { ValidationResult, ValidationIssue } from '@/hooks/useRosterValidation';

interface ValidationIndicatorProps {
  result: ValidationResult | null;
  isValidating?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const containerSizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function ValidationIndicator({
  result,
  isValidating = false,
  size = 'md',
  showTooltip = true,
  className,
}: ValidationIndicatorProps) {
  const { t } = useTranslation();

  // Loading state
  if (isValidating) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-100',
          containerSizeClasses[size],
          className
        )}
      >
        <Loader2 className={cn('animate-spin text-zinc-400', sizeClasses[size])} />
      </motion.div>
    );
  }

  // No result yet
  if (!result) {
    return null;
  }

  const hasViolations = result.violations.length > 0;
  const hasWarnings = result.warnings.length > 0;

  // Determine status
  let status: 'valid' | 'warning' | 'error';
  let Icon: typeof Check;
  let bgColor: string;
  let iconColor: string;

  if (hasViolations) {
    status = 'error';
    Icon = X;
    bgColor = 'bg-red-500/20';
    iconColor = 'text-red-400';
  } else if (hasWarnings) {
    status = 'warning';
    Icon = AlertTriangle;
    bgColor = 'bg-amber-500/20';
    iconColor = 'text-amber-400';
  } else {
    status = 'valid';
    Icon = Check;
    bgColor = 'bg-emerald-500/20';
    iconColor = 'text-emerald-400';
  }

  const indicator = (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'flex items-center justify-center rounded-full',
        bgColor,
        containerSizeClasses[size],
        className
      )}
    >
      <Icon className={cn(iconColor, sizeClasses[size])} />
    </motion.div>
  );

  if (!showTooltip || status === 'valid') {
    return indicator;
  }

  // Show tooltip with issues
  const issues: ValidationIssue[] = [...result.violations, ...result.warnings];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-zinc-900">
              {hasViolations ? t('compliance.issues') : t('compliance.warnings')}
            </p>
            {issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {issue.severity === 'critical' || issue.severity === 'high' ? (
                  <X className="h-3 w-3 shrink-0 mt-0.5 text-red-400" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-400" />
                )}
                <div>
                  <p className="text-xs text-zinc-600">{issue.message}</p>
                  {issue.ruleReference && (
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {issue.ruleReference}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ValidationBadge - Inline badge showing validation status
 */
interface ValidationBadgeProps {
  result: ValidationResult | null;
  isValidating?: boolean;
  className?: string;
}

export function ValidationBadge({
  result,
  isValidating = false,
  className,
}: ValidationBadgeProps) {
  const { t } = useTranslation();

  if (isValidating) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        'bg-zinc-100 text-zinc-400',
        className
      )}>
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('compliance.validating')}
      </span>
    );
  }

  if (!result) {
    return null;
  }

  const hasViolations = result.violations.length > 0;
  const hasWarnings = result.warnings.length > 0;

  if (hasViolations) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        'bg-red-500/20 text-red-400',
        className
      )}>
        <X className="h-3 w-3" />
        {t('compliance.violationCount', { count: result.violations.length })}
      </span>
    );
  }

  if (hasWarnings) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        'bg-amber-500/20 text-amber-400',
        className
      )}>
        <AlertTriangle className="h-3 w-3" />
        {t('compliance.warningCount', { count: result.warnings.length })}
      </span>
    );
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
      'bg-emerald-500/20 text-emerald-400',
      className
    )}>
      <Check className="h-3 w-3" />
      {t('compliance.valid')}
    </span>
  );
}

/**
 * DropZoneValidation - Visual feedback for drag-and-drop zones
 */
interface DropZoneValidationProps {
  result: ValidationResult | null;
  isValidating?: boolean;
  isOver?: boolean;
}

export function getDropZoneClasses({
  result,
  isValidating = false,
  isOver = false,
}: DropZoneValidationProps): string {
  if (!isOver) {
    return '';
  }

  if (isValidating) {
    return 'ring-2 ring-zinc-400 ring-inset bg-zinc-100';
  }

  if (!result) {
    return 'ring-2 ring-primary-500 ring-inset bg-primary-500/5';
  }

  if (result.violations.length > 0) {
    return 'ring-2 ring-red-500 ring-inset bg-red-500/10 cursor-not-allowed';
  }

  if (result.warnings.length > 0) {
    return 'ring-2 ring-amber-500 ring-inset bg-amber-500/5';
  }

  return 'ring-2 ring-emerald-500 ring-inset bg-emerald-500/5';
}

export default ValidationIndicator;

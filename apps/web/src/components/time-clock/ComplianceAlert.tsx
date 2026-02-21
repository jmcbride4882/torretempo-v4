/**
 * ComplianceAlert Component
 * Displays compliance violations and warnings after clock-out
 * Shows modal dialog for critical violations, dismissible banner for warnings
 * Includes Spanish labor law references and recommended actions
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Info,
  X,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ComplianceViolation {
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ruleReference?: string;
  recommendedAction?: string;
}

export interface ComplianceSummary {
  checks: number;
  violations: number;
  warnings: number;
  override: boolean;
}

export interface ComplianceAlertProps {
  /** Whether the alert is visible */
  isOpen: boolean;
  /** Callback to close the alert */
  onClose: () => void;
  /** List of violations/warnings */
  violations: ComplianceViolation[];
  /** Summary of compliance checks */
  summary?: ComplianceSummary;
  /** Whether manager can override */
  canOverride?: boolean;
  /** Callback when manager overrides */
  onOverride?: (reason: string) => void;
  /** Whether this is a blocking violation (modal) or warning (banner) */
  isBlocking?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_CONFIG = {
  low: {
    icon: Info,
    color: 'text-primary-700',
    bg: 'bg-primary-50',
    border: 'border-primary-200',
    badge: 'bg-primary-50 text-primary-700',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-50 text-amber-700',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-50 text-red-700',
  },
  critical: {
    icon: XCircle,
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
  },
};

const SPRING_CONFIG = { type: 'spring', damping: 25, stiffness: 300 } as const;

// ============================================================================
// Sub-Components
// ============================================================================

function ViolationItem({ violation }: { violation: ComplianceViolation }) {
  const { t } = useTranslation();
  const config = SEVERITY_CONFIG[violation.severity];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-4 rounded-xl border",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.color)} />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-charcoal">{violation.message}</p>

          {violation.ruleReference && (
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", config.badge)}>
                {violation.ruleReference}
              </Badge>
            </div>
          )}

          {violation.recommendedAction && (
            <p className="text-xs text-kresna-gray">
              <span className="font-medium">{t('compliance.recommended')}:</span> {violation.recommendedAction}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ComplianceAlert({
  isOpen,
  onClose,
  violations,
  summary,
  canOverride = false,
  onOverride,
  isBlocking = false,
}: ComplianceAlertProps) {
  const { t } = useTranslation();
  const [overrideReason, setOverrideReason] = React.useState('');
  const [showOverrideForm, setShowOverrideForm] = React.useState(false);

  // Separate critical violations from warnings
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const warnings = violations.filter(v => v.severity !== 'critical');

  // Handle override submission
  const handleOverride = () => {
    if (overrideReason.trim() && onOverride) {
      onOverride(overrideReason.trim());
      setOverrideReason('');
      setShowOverrideForm(false);
      onClose();
    }
  };

  // Blocking violations - show as modal dialog
  if (isBlocking && criticalViolations.length > 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg rounded-2xl border border-kresna-border bg-white shadow-card">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-charcoal">
                  {t('compliance.violationTitle')}
                </DialogTitle>
                <DialogDescription className="text-kresna-gray">
                  {t('compliance.violationBlocked')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 my-4">
            {criticalViolations.map((violation, index) => (
              <ViolationItem key={index} violation={violation} />
            ))}
          </div>

          {summary && (
            <div className="flex items-center justify-between text-xs text-kresna-gray py-2 border-t border-kresna-border">
              <span>{t('compliance.checksPerformed', { count: summary.checks })}</span>
              <span className="text-red-600">{t('compliance.violationsFound', { count: summary.violations })}</span>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {canOverride && !showOverrideForm && (
              <Button
                variant="outline"
                onClick={() => setShowOverrideForm(true)}
                className="w-full border-kresna-border"
              >
                {t('compliance.managerOverride')}
              </Button>
            )}

            {showOverrideForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full space-y-3"
              >
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={t('compliance.overridePlaceholder')}
                  rows={2}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl resize-none",
                    "bg-kresna-light border border-kresna-border",
                    "text-charcoal placeholder:text-kresna-gray",
                    "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500",
                    "text-sm"
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowOverrideForm(false)}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleOverride}
                    disabled={!overrideReason.trim()}
                    variant="gradient"
                    className="flex-1"
                  >
                    {t('compliance.confirmOverride')}
                  </Button>
                </div>
              </motion.div>
            )}

            {!showOverrideForm && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full text-kresna-gray"
              >
                {t('common.close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Non-blocking warnings - show as dismissible banner
  if (!isBlocking && warnings.length > 0) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={SPRING_CONFIG}
            className={cn(
              "fixed top-4 left-4 right-4 z-50",
              "bg-amber-50 border border-amber-200",
              "rounded-2xl p-5 shadow-card"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">
                  {t('compliance.warningTitle')}
                </p>
                <p className="text-xs text-kresna-gray-dark mt-1">
                  {warnings[0]?.message}
                </p>
                {warnings.length > 1 && (
                  <p className="text-xs text-kresna-gray mt-1">
                    {t('compliance.moreWarnings', { count: warnings.length - 1 })}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-kresna-gray hover:text-charcoal transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Success state - all checks passed
  if (isOpen && violations.length === 0) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={SPRING_CONFIG}
          className={cn(
            "fixed top-4 left-4 right-4 z-50",
            "bg-emerald-50 border border-emerald-200",
            "rounded-2xl p-5 shadow-card"
          )}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-700">
                {t('compliance.allChecksPassed')}
              </p>
              {summary && (
                <p className="text-xs text-kresna-gray mt-0.5">
                  {t('compliance.checksCount', { count: summary.checks })}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-kresna-gray hover:text-charcoal transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}

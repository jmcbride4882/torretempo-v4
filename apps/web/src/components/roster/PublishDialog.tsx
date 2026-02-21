/**
 * PublishDialog Component
 *
 * Confirmation dialog for publishing a week's roster.
 * Shows shift count, employees to notify, and handles the publish API call.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Calendar, Check, Loader2, Send, Users, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Shift } from '@/types/roster';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationSlug: string;
  weekStart: Date;
  weekEnd: Date;
  shifts: Shift[];
}

interface PublishResult {
  success: boolean;
  message: string;
  publishedCount?: number;
  employeesNotified?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatDateRange(start: Date, end: Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString(locale, options);
  const endStr = end.toLocaleDateString(locale, { ...options, year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

export function PublishDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationSlug,
  weekStart,
  weekEnd,
  shifts,
}: PublishDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  // Calculate stats
  const draftShifts = shifts.filter((s) => s.status === 'draft');
  const assignedDraftShifts = draftShifts.filter((s) => s.user_id);
  const uniqueEmployeeIds = new Set(assignedDraftShifts.map((s) => s.user_id));
  const employeeCount = uniqueEmployeeIds.size;

  // Check for compliance warnings
  const shiftsWithWarnings = draftShifts.filter(
    (s) => s.compliance_warnings && s.compliance_warnings.length > 0
  );
  const hasComplianceWarnings = shiftsWithWarnings.length > 0;

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/org/${organizationSlug}/roster/publish`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('roster.failedToPublish'));
      }

      setPublishResult({
        success: true,
        message: data.message || t('roster.publishedSuccess'),
        publishedCount: data.publishedCount,
        employeesNotified: data.employeesNotified,
      });

      // Delay before closing to show success state
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setPublishResult(null);
      }, 2000);
    } catch (err) {
      setPublishResult({
        success: false,
        message: err instanceof Error ? err.message : t('roster.failedToPublish'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    if (!isPublishing) {
      onOpenChange(false);
      setPublishResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-charcoal">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50">
              <Send className="h-4 w-4 text-primary-600" />
            </div>
            {t('roster.publishTitle')}
          </DialogTitle>
          <DialogDescription className="text-kresna-gray">
            {t('roster.publishDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Week Range */}
          <div className="flex items-center gap-3 rounded-xl border border-kresna-border bg-kresna-light p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <Calendar className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">
                {formatDateRange(weekStart, weekEnd, locale)}
              </p>
              <p className="text-xs text-kresna-gray">{t('roster.weekToPublish')}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-kresna-border bg-kresna-light p-4 text-center">
              <p className="text-2xl font-bold text-charcoal">{draftShifts.length}</p>
              <p className="text-xs text-kresna-gray">
                {t('roster.draftShiftCount', { count: draftShifts.length })}
              </p>
            </div>
            <div className="rounded-xl border border-kresna-border bg-kresna-light p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-kresna-gray" />
                <p className="text-2xl font-bold text-charcoal">{employeeCount}</p>
              </div>
              <p className="text-xs text-kresna-gray">
                {t('roster.employeesToNotify', { count: employeeCount })}
              </p>
            </div>
          </div>

          {/* Compliance Warning */}
          {hasComplianceWarnings && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-700">{t('roster.complianceWarnings')}</p>
                <p className="text-xs text-amber-600">
                  {t('roster.complianceWarningsShiftCount', { count: shiftsWithWarnings.length })}
                </p>
              </div>
            </motion.div>
          )}

          {/* No Draft Shifts Warning */}
          {draftShifts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl border border-kresna-border bg-kresna-light p-3"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-kresna-gray" />
              <div>
                <p className="text-sm font-medium text-kresna-gray-dark">{t('roster.noDraftShifts')}</p>
                <p className="text-xs text-kresna-gray">
                  {t('roster.noDraftShiftsDesc')}
                </p>
              </div>
            </motion.div>
          )}

          {/* Result Message */}
          <AnimatePresence mode="wait">
            {publishResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'flex items-start gap-2 rounded-xl border p-3',
                  publishResult.success
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
                )}
              >
                {publishResult.success ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      publishResult.success ? 'text-emerald-700' : 'text-red-700'
                    )}
                  >
                    {publishResult.success ? t('roster.publishedResult') : t('roster.publishError')}
                  </p>
                  <p
                    className={cn(
                      'text-xs',
                      publishResult.success ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {publishResult.message}
                    {publishResult.success && publishResult.publishedCount !== undefined && (
                      <>
                        {' '}
                        {t('roster.publishResultDetail', {
                          count: publishResult.publishedCount,
                          shifts: publishResult.publishedCount,
                          employees: publishResult.employeesNotified,
                        })}
                      </>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPublishing}
            className="rounded-xl"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="gradient"
            onClick={handlePublish}
            disabled={isPublishing || draftShifts.length === 0 || publishResult?.success}
            className={cn(
              'gap-2 rounded-xl',
              (isPublishing || publishResult?.success) && 'cursor-not-allowed opacity-50'
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('roster.publishingButton')}
              </>
            ) : publishResult?.success ? (
              <>
                <Check className="h-4 w-4" />
                {t('roster.publishedButton')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t('roster.publishShiftsButton', { count: draftShifts.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PublishDialog;

/**
 * PublishDialog Component
 *
 * Confirmation dialog for publishing a week's roster.
 * Shows shift count, employees to notify, and handles the publish API call.
 */

import { useState } from 'react';
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

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', { ...options, year: 'numeric' });
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
        throw new Error(data.message || 'Failed to publish roster');
      }

      setPublishResult({
        success: true,
        message: data.message || 'Roster published successfully',
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
        message: err instanceof Error ? err.message : 'Failed to publish roster',
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
      <DialogContent className="glass-card max-w-md border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/20">
              <Send className="h-4 w-4 text-primary-400" />
            </div>
            Publish Roster
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Publish shifts and notify assigned employees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Week Range */}
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
              <Calendar className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {formatDateRange(weekStart, weekEnd)}
              </p>
              <p className="text-xs text-neutral-500">Week to publish</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
              <p className="text-2xl font-bold text-white">{draftShifts.length}</p>
              <p className="text-xs text-neutral-500">
                Draft shift{draftShifts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-neutral-400" />
                <p className="text-2xl font-bold text-white">{employeeCount}</p>
              </div>
              <p className="text-xs text-neutral-500">
                Employee{employeeCount !== 1 ? 's' : ''} to notify
              </p>
            </div>
          </div>

          {/* Compliance Warning */}
          {hasComplianceWarnings && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-300">Compliance Warnings</p>
                <p className="text-xs text-amber-400/80">
                  {shiftsWithWarnings.length} shift{shiftsWithWarnings.length !== 1 ? 's have' : ' has'}{' '}
                  compliance warnings. Review before publishing.
                </p>
              </div>
            </motion.div>
          )}

          {/* No Draft Shifts Warning */}
          {draftShifts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-lg border border-neutral-500/20 bg-neutral-500/10 p-3"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-neutral-400" />
              <div>
                <p className="text-sm font-medium text-neutral-300">No Draft Shifts</p>
                <p className="text-xs text-neutral-400">
                  There are no draft shifts to publish for this week.
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
                  'flex items-start gap-2 rounded-lg border p-3',
                  publishResult.success
                    ? 'border-emerald-500/20 bg-emerald-500/10'
                    : 'border-red-500/20 bg-red-500/10'
                )}
              >
                {publishResult.success ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      publishResult.success ? 'text-emerald-300' : 'text-red-300'
                    )}
                  >
                    {publishResult.success ? 'Published!' : 'Error'}
                  </p>
                  <p
                    className={cn(
                      'text-xs',
                      publishResult.success ? 'text-emerald-400/80' : 'text-red-400/80'
                    )}
                  >
                    {publishResult.message}
                    {publishResult.success && publishResult.publishedCount !== undefined && (
                      <>
                        {' '}
                        ({publishResult.publishedCount} shift
                        {publishResult.publishedCount !== 1 ? 's' : ''},{' '}
                        {publishResult.employeesNotified} notified)
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
            variant="ghost"
            onClick={handleClose}
            disabled={isPublishing}
            className="rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || draftShifts.length === 0 || publishResult?.success}
            className={cn(
              'gap-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500',
              (isPublishing || publishResult?.success) && 'cursor-not-allowed opacity-50'
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : publishResult?.success ? (
              <>
                <Check className="h-4 w-4" />
                Published
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Publish {draftShifts.length} Shift{draftShifts.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PublishDialog;

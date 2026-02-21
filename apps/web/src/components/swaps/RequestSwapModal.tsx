import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  MapPin,
  User,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Shift, TeamMember } from '@/types/roster';
import type { CreateSwapRequestData } from '@/types/swaps';

interface RequestSwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  myShifts: Shift[];
  availableShifts?: Shift[];
  teamMembers?: TeamMember[];
  organizationSlug: string;
  isLoadingShifts?: boolean;
  onSubmit: (data: CreateSwapRequestData) => Promise<void>;
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Format time for display
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Shift preview card
function ShiftPreview({ shift, label }: { shift: Shift | null; label: string }) {
  const { t } = useTranslation();

  if (!shift) {
    return (
      <div className="rounded-xl border border-dashed border-kresna-border bg-kresna-light p-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-kresna-gray">
          {label}
        </p>
        <p className="text-sm text-kresna-gray italic">{t('swaps.labels.noShiftSelected')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-kresna-border bg-kresna-light p-4"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-kresna-gray">
        {label}
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-charcoal">
          <Calendar className="h-4 w-4 text-primary-500" />
          <span className="font-medium">{formatDate(shift.start_time)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-kresna-gray-dark">
          <Clock className="h-4 w-4 text-kresna-gray" />
          <span className="text-sm tabular-nums">
            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
          </span>
        </div>
        
        {shift.location && (
          <div className="flex items-center gap-2 text-kresna-gray">
            <MapPin className="h-4 w-4 text-kresna-gray" />
            <span className="text-sm">{shift.location.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function RequestSwapModal({
  open,
  onOpenChange,
  onSuccess,
  myShifts,
  availableShifts = [],
  teamMembers = [],
  isLoadingShifts = false,
  onSubmit,
}: RequestSwapModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<{
    offered_shift_id: string;
    desired_shift_id: string;
    recipient_id: string;
    reason: string;
  }>({
    offered_shift_id: '',
    desired_shift_id: '',
    recipient_id: '',
    reason: '',
  });

  // Get selected shifts for preview
  const selectedOfferedShift = myShifts.find(s => s.id === formData.offered_shift_id) || null;
  const selectedDesiredShift = availableShifts.find(s => s.id === formData.desired_shift_id) || null;

  // Filter upcoming shifts only
  const upcomingMyShifts = myShifts.filter(s => {
    const shiftDate = new Date(s.start_time);
    return shiftDate > new Date() && s.status !== 'cancelled';
  });

  const upcomingAvailableShifts = availableShifts.filter(s => {
    const shiftDate = new Date(s.start_time);
    return shiftDate > new Date() && s.status !== 'cancelled' && s.id !== formData.offered_shift_id;
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        offered_shift_id: '',
        desired_shift_id: '',
        recipient_id: '',
        reason: '',
      });
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate
      if (!formData.offered_shift_id) {
        throw new Error(t('swaps.errors.selectShift'));
      }

      const data: CreateSwapRequestData = {
        offered_shift_id: formData.offered_shift_id,
        desired_shift_id: formData.desired_shift_id || null,
        recipient_id: formData.recipient_id || null,
        reason: formData.reason || undefined,
      };

      await onSubmit(data);
      
      setSuccess(true);
      
      // Close after showing success
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error('Error creating swap request:', err);
      setError(err instanceof Error ? err.message : t('swaps.errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-kresna-border bg-white rounded-xl shadow-sm sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl text-charcoal">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <ArrowLeftRight className="h-5 w-5 text-primary-500" />
            </div>
            {t('swaps.requestShiftSwap')}
          </DialogTitle>
          <DialogDescription className="text-kresna-gray">
            {t('swaps.requestShiftSwapDesc')}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200"
            >
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </motion.div>
            <h3 className="mb-2 text-lg font-semibold text-charcoal">{t('swaps.success.title')}</h3>
            <p className="text-sm text-kresna-gray">{t('swaps.success.message')}</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4">
              {/* My Shift to Offer */}
              <div className="space-y-2">
                <Label htmlFor="offered-shift" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                  <Calendar className="h-3.5 w-3.5 text-kresna-gray" />
                  {t('swaps.labels.shiftOffering')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.offered_shift_id}
                  onValueChange={(value) => setFormData({ ...formData, offered_shift_id: value })}
                  disabled={isLoadingShifts}
                >
                  <SelectTrigger
                    id="offered-shift"
                    className="border-kresna-border bg-white text-charcoal focus:border-primary-500"
                  >
                    <SelectValue placeholder={isLoadingShifts ? t('swaps.labels.loadingShifts') : t('swaps.labels.selectShiftToOffer')} />
                  </SelectTrigger>
                  <SelectContent className="border-kresna-border bg-white">
                    {upcomingMyShifts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-kresna-gray">
                        {t('swaps.labels.noUpcomingShifts')}
                      </div>
                    ) : (
                      upcomingMyShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id} className="text-charcoal">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatDate(shift.start_time)}</span>
                            <span className="text-kresna-gray">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </span>
                            {shift.location && (
                              <span className="text-kresna-gray">@ {shift.location.name}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Desired Shift (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="desired-shift" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                  <Sparkles className="h-3.5 w-3.5 text-kresna-gray" />
                  {t('swaps.labels.desiredShift')} <span className="text-kresna-gray">({t('common.optional')})</span>
                </Label>
                <Select
                  value={formData.desired_shift_id}
                  onValueChange={(value) => setFormData({ ...formData, desired_shift_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger
                    id="desired-shift"
                    className="border-kresna-border bg-white text-charcoal focus:border-primary-500"
                  >
                    <SelectValue placeholder={t('swaps.labels.leaveOpenOrSelect')} />
                  </SelectTrigger>
                  <SelectContent className="border-kresna-border bg-white">
                    <SelectItem value="none" className="text-kresna-gray italic">
                      {t('swaps.labels.openRequestAnyone')}
                    </SelectItem>
                    {upcomingAvailableShifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id} className="text-charcoal">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatDate(shift.start_time)}</span>
                          <span className="text-kresna-gray">
                            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                          </span>
                          {shift.user && (
                            <span className="text-kresna-gray">({shift.user.name})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specific Recipient (Optional) */}
              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                    <User className="h-3.5 w-3.5 text-kresna-gray" />
                    {t('swaps.labels.requestFromPerson')} <span className="text-kresna-gray">({t('common.optional')})</span>
                  </Label>
                  <Select
                    value={formData.recipient_id}
                    onValueChange={(value) => setFormData({ ...formData, recipient_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger
                      id="recipient"
                      className="border-kresna-border bg-white text-charcoal focus:border-primary-500"
                    >
                      <SelectValue placeholder={t('swaps.labels.anyoneOnTeam')} />
                    </SelectTrigger>
                    <SelectContent className="border-kresna-border bg-white">
                      <SelectItem value="none" className="text-kresna-gray italic">
                        {t('swaps.labels.anyoneOnTeam')}
                      </SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id} className="text-charcoal">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] text-primary-600">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                  <MessageSquare className="h-3.5 w-3.5 text-kresna-gray" />
                  {t('swaps.labels.reason')} <span className="text-kresna-gray">({t('common.optional')})</span>
                </Label>
                <textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full min-h-[80px] rounded-xl border border-kresna-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-kresna-gray focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                  placeholder={t('swaps.labels.reasonPlaceholder')}
                  maxLength={500}
                />
                {formData.reason && (
                  <p className="text-right text-[10px] text-kresna-gray">
                    {formData.reason.length}/500
                  </p>
                )}
              </div>

              {/* Preview */}
              {formData.offered_shift_id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-primary-200 bg-primary-50 p-4"
                >
                  <p className="mb-3 text-xs font-medium text-primary-600">{t('swaps.labels.preview')}</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <ShiftPreview shift={selectedOfferedShift} label={t('swaps.labels.offering')} />
                    <div className="flex items-center justify-center">
                      <ArrowLeftRight className="h-5 w-5 text-kresna-gray" />
                    </div>
                    {selectedDesiredShift ? (
                      <ShiftPreview shift={selectedDesiredShift} label={t('swaps.labels.requesting')} />
                    ) : (
                      <div className="flex-1 rounded-xl border border-dashed border-primary-200 bg-primary-50 p-4">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-kresna-gray">
                          {t('swaps.labels.requesting')}
                        </p>
                        <p className="text-sm text-primary-600 italic">{t('swaps.labels.openRequest')}</p>
                        <p className="mt-1 text-[10px] text-kresna-gray">
                          {t('swaps.labels.anyoneCanOffer')}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-kresna-border bg-kresna-light text-kresna-gray-dark hover:bg-kresna-light"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.offered_shift_id}
                className={cn(
                  'gap-2 rounded-xl bg-primary-600 text-white hover:bg-primary-500',
                  isSubmitting && 'cursor-not-allowed opacity-50'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('swaps.actions.submitting')}
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    {t('swaps.actions.requestSwapBtn')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RequestSwapModal;

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Calendar, Clock, Loader2, MapPin, Plus, User } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRosterValidation } from '@/hooks/useRosterValidation';
import { cn } from '@/lib/utils';
import { ValidationIndicator } from './ValidationIndicator';
import type { Location } from '@/types/roster';
import type { ValidationResult } from '@/hooks/useRosterValidation';

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  locations: Location[];
  organizationSlug: string;
  defaultDate?: Date;
}

interface ShiftFormData {
  location_id: string;
  user_id: string;
  start_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string;
}

interface MemberApiResponse {
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    } | null;
  }>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function CreateShiftModal({
  open,
  onOpenChange,
  onSuccess,
  locations,
  organizationSlug,
  defaultDate,
}: CreateShiftModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberApiResponse['members']>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [employeeValidationResult, setEmployeeValidationResult] = useState<ValidationResult | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>({
    location_id: '',
    user_id: '',
    start_date: defaultDate ? (defaultDate.toISOString().split('T')[0] ?? '') : (new Date().toISOString().split('T')[0] ?? ''),
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 30,
    notes: '',
  });

  const { validate, isValidating } = useRosterValidation({
    organizationSlug,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        location_id: locations[0]?.id || '',
        user_id: '',
        start_date: defaultDate ? (defaultDate.toISOString().split('T')[0] ?? '') : (new Date().toISOString().split('T')[0] ?? ''),
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 30,
        notes: '',
      });
      setError(null);
      setEmployeeValidationResult(null);
    }
  }, [open, defaultDate, locations]);

  // Fetch members when modal opens
  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    async function fetchMembers(): Promise<void> {
      setIsLoadingMembers(true);
      setMembersError(null);

      try {
        const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/members`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }

        const data: MemberApiResponse = await response.json();
        const normalized = (data.members || []).filter((m) => Boolean(m.userId));

        if (isMounted) {
          setMembers(normalized);
        }
      } catch (err) {
        if (isMounted) {
          setMembersError(err instanceof Error ? err.message : 'Failed to fetch members');
          setMembers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingMembers(false);
        }
      }
    }

    void fetchMembers();

    return () => {
      isMounted = false;
    };
  }, [open, organizationSlug]);

  // Real-time validation when an employee is selected
  useEffect(() => {
    if (!open) return;

    if (!formData.user_id) {
      setEmployeeValidationResult(null);
      return;
    }

    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
    const endDateTime = new Date(`${formData.start_date}T${formData.end_time}:00`);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime()) || endDateTime <= startDateTime) {
      setEmployeeValidationResult(null);
      return;
    }

    let isMounted = true;

    async function runValidation(): Promise<void> {
      const result = await validate(formData.user_id, {
        start: startDateTime,
        end: endDateTime,
        locationId: formData.location_id || undefined,
        breakMinutes: formData.break_minutes,
      });

      if (isMounted) {
        setEmployeeValidationResult(result);
      }
    }

    void runValidation();

    return () => {
      isMounted = false;
    };
  }, [open, formData.user_id, formData.start_date, formData.start_time, formData.end_time, formData.break_minutes, formData.location_id, validate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate form
      if (!formData.location_id) {
        throw new Error(t('roster.pleaseSelectLocation'));
      }

      // Combine date and time into ISO timestamps
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
      const endDateTime = new Date(`${formData.start_date}T${formData.end_time}:00`);

      if (endDateTime <= startDateTime) {
        throw new Error(t('roster.endAfterStart'));
      }

      // Create shift
      const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/shifts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: formData.location_id,
          user_id: formData.user_id || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_minutes: formData.break_minutes,
          notes: formData.notes || undefined,
          status: 'draft',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle compliance violations
        if (errorData.violations && Array.isArray(errorData.violations)) {
          const violationMessages = errorData.violations
            .map((v: any) => `• ${v.message}`)
            .join('\n');
          throw new Error(`${t('roster.complianceViolations')}\n${violationMessages}`);
        }

        throw new Error(errorData.message || t('roster.failedToCreateShift'));
      }

      // Success!
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating shift:', err);
      setError(err instanceof Error ? err.message : t('roster.failedToCreateShift'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDuration = () => {
    if (!formData.start_time || !formData.end_time) return null;

    const start = new Date(`2000-01-01T${formData.start_time}:00`);
    const end = new Date(`2000-01-01T${formData.end_time}:00`);

    if (end <= start) return null;

    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const duration = calculateDuration();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-charcoal">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50">
              <Plus className="h-4 w-4 text-primary-600" />
            </div>
            {t('roster.createNewShift')}
          </DialogTitle>
          <DialogDescription className="text-kresna-gray">
            {t('roster.createShiftDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                <MapPin className="h-3.5 w-3.5 text-kresna-gray" />
                {t('common.location')}
              </Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              >
                <SelectTrigger id="location" className="rounded-xl h-12">
                  <SelectValue placeholder={t('roster.selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id} className="text-charcoal">
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee (optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="employee" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                  <User className="h-3.5 w-3.5 text-kresna-gray" />
                  {t('common.employee')} <span className="text-kresna-gray">{t('common.optional')}</span>
                </Label>
                <ValidationIndicator
                  result={employeeValidationResult}
                  isValidating={isValidating}
                  size="sm"
                  showTooltip
                />
              </div>

              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                disabled={isLoadingMembers}
              >
                <SelectTrigger id="employee" className="rounded-xl h-12">
                  <SelectValue placeholder={isLoadingMembers ? t('roster.loadingEmployees') : t('roster.unassigned')} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="" className="text-charcoal">
                    {t('roster.unassigned')}
                  </SelectItem>
                  {members
                    .filter((m) => Boolean(m.userId))
                    .map((m) => {
                      const name = m.user?.name || m.user?.email || 'Unnamed';
                      const roleLabel = m.role;

                      return (
                        <SelectItem key={m.userId} value={m.userId} className="text-charcoal">
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="truncate">{name}</span>
                            <span className="shrink-0 rounded-full bg-kresna-light px-2 py-0.5 text-[10px] uppercase text-kresna-gray">
                              {roleLabel}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>

              {membersError && (
                <p className="text-xs text-red-600">{membersError}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                <Calendar className="h-3.5 w-3.5 text-kresna-gray" />
                {t('common.date')}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="rounded-xl h-12"
                required
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="flex items-center gap-2 text-sm text-kresna-gray-dark">
                  <Clock className="h-3.5 w-3.5 text-kresna-gray" />
                  {t('roster.startTime')}
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="rounded-xl h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-sm text-kresna-gray-dark">
                  {t('roster.endTime')}
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="rounded-xl h-12"
                  required
                />
              </div>
            </div>

            {/* Duration display */}
            {duration && (
              <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
                <p className="text-xs text-primary-700">
                  <span className="font-medium">{t('clock.duration')}</span> {duration}
                  {formData.break_minutes > 0 && (
                    <span className="text-kresna-gray"> (+ {formData.break_minutes}m break)</span>
                  )}
                </p>
              </div>
            )}

            {/* Break Minutes */}
            <div className="space-y-2">
              <Label htmlFor="break" className="text-sm text-kresna-gray-dark">
                {t('roster.breakDuration')}
              </Label>
              <Input
                id="break"
                type="number"
                min="0"
                step="5"
                value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
                className="rounded-xl h-12"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm text-kresna-gray-dark">
                {t('common.notes')} <span className="text-kresna-gray">{t('common.optional')}</span>
              </Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl border border-kresna-border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-kresna-gray focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
                placeholder={t('common.addDetails')}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isSubmitting || !formData.location_id}
              className={cn(
                'gap-2 rounded-xl',
                isSubmitting && 'cursor-not-allowed opacity-50'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.creating')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t('roster.createShift')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateShiftModal;

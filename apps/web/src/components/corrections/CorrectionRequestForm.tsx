import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out?: string | null;
  date: string;
}

interface CorrectionRequestFormProps {
  entries: TimeEntry[];
  organizationSlug: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function CorrectionRequestForm({ entries, organizationSlug, onSubmit, onCancel }: CorrectionRequestFormProps) {
  const { t } = useTranslation();
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [correctionType, setCorrectionType] = useState<'add_clock_out' | 'change_time' | 'add_break'>('change_time');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntryId || !reason.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/corrections`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_entry_id: selectedEntryId,
          correction_type: correctionType,
          requested_time: newTime || undefined,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('errors.unexpected'));
      }

      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unexpected'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatEntryDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Select time entry */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-kresna-gray" />
          {t('corrections.selectEntry')}
        </Label>
        <select
          value={selectedEntryId}
          onChange={e => setSelectedEntryId(e.target.value)}
          className="h-12 w-full rounded-xl border border-kresna-border bg-white px-3 text-sm text-charcoal transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          required
        >
          <option value="">{t('corrections.chooseEntry')}</option>
          {entries.map(entry => (
            <option key={entry.id} value={entry.id}>
              {formatEntryDate(entry.clock_in)} — {formatTime(entry.clock_in)}
              {entry.clock_out ? ` → ${formatTime(entry.clock_out)}` : ` (${t('corrections.noClockOut')})`}
            </option>
          ))}
        </select>
      </div>

      {/* Correction type */}
      <div className="space-y-2">
        <Label>{t('corrections.correctionType')}</Label>
        <div className="grid grid-cols-3 gap-2">
          {(['add_clock_out', 'change_time', 'add_break'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setCorrectionType(type)}
              className={cn(
                'min-h-touch rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                correctionType === type
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-kresna-light border-kresna-border text-kresna-gray-dark hover:bg-kresna-light'
              )}
            >
              {t(`corrections.type.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* New time */}
      {correctionType !== 'add_break' && (
        <div className="space-y-2">
          <Label>{t('corrections.requestedTime')}</Label>
          <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
        </div>
      )}

      {/* Reason */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-kresna-gray" />
          {t('corrections.reason')} *
        </Label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t('corrections.reasonPlaceholder')}
          rows={3}
          required
          className="w-full rounded-xl border border-kresna-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-kresna-gray focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-kresna-border">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">{t('common.cancel')}</Button>
        <Button type="submit" variant="gradient" disabled={isSubmitting || !selectedEntryId || !reason.trim()} className="rounded-xl">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isSubmitting ? t('common.submitting') : t('corrections.submitRequest')}
        </Button>
      </div>
    </form>
  );
}

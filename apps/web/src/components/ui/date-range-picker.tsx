/**
 * DateRangePicker
 * Reusable date range selection with start/end date inputs
 * Kresna design system color tokens
 */

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  className,
}: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const startRef = useRef<HTMLInputElement>(null);
  const hasRange = !!startDate || !!endDate;
  const locale = i18n.language;

  const PRESETS = React.useMemo(() => [
    { label: t('common.today', 'Today'), days: 0 },
    { label: t('common.last7Days', 'Last 7 days'), days: 7 },
    { label: t('common.last30Days', 'Last 30 days'), days: 30 },
    { label: t('common.last90Days', 'Last 90 days'), days: 90 },
  ], [t]);

  // Display text for the trigger button
  const displayText = React.useMemo(() => {
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate, locale)} - ${formatDisplayDate(endDate, locale)}`;
    }
    if (startDate) return `${t('common.from', 'From')} ${formatDisplayDate(startDate, locale)}`;
    if (endDate) return `${t('common.until', 'Until')} ${formatDisplayDate(endDate, locale)}`;
    return t('common.dateRange', 'Date range');
  }, [startDate, endDate, locale, t]);

  // Focus start input when opened
  useEffect(() => {
    if (open && startRef.current) {
      // Small delay to let the popover render
      const t = setTimeout(() => startRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) {
      start.setDate(start.getDate() - days);
    }
    onStartDateChange(formatDateForInput(start));
    onEndDateChange(formatDateForInput(end));
    setOpen(false);
  };

  const handleClear = () => {
    onStartDateChange('');
    onEndDateChange('');
    onClear?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-10 gap-2 rounded-lg border px-3 text-sm font-normal transition-all duration-200',
            hasRange
              ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50'
              : 'border-kresna-border bg-white text-kresna-gray-dark hover:bg-kresna-light hover:text-charcoal dark:border-kresna-border dark:bg-charcoal dark:text-kresna-gray dark:hover:bg-kresna-gray-dark dark:hover:text-kresna-border',
            className,
          )}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[200px]">{displayText}</span>
          {hasRange && (
            <span
              role="button"
              tabIndex={0}
              className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-200 hover:bg-primary-300 transition-colors dark:bg-primary-800 dark:hover:bg-primary-700"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleClear();
                }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[320px] border-kresna-border bg-white p-0 dark:border-kresna-border dark:bg-charcoal"
      >
        {/* Presets */}
        <div className="border-b border-kresna-border px-3 py-2.5 dark:border-kresna-border">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-kresna-gray dark:text-kresna-gray">
            {t('common.quickSelect', 'Quick select')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
                  'border border-kresna-border bg-kresna-light text-kresna-gray-dark',
                  'hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700',
                  'active:scale-[0.97]',
                  'dark:border-kresna-border dark:bg-kresna-gray-dark dark:text-kresna-gray',
                  'dark:hover:border-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom range inputs */}
        <div className="p-3">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-kresna-gray dark:text-kresna-gray">
            {t('common.customRange', 'Custom range')}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-kresna-gray dark:text-kresna-gray">{t('common.from', 'From')}</label>
              <input
                ref={startRef}
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => onStartDateChange(e.target.value)}
                className={cn(
                  'flex h-9 w-full rounded-lg border border-kresna-border bg-white px-2.5 text-xs text-charcoal',
                  'transition-all duration-200',
                  'focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-200',
                  'dark:border-kresna-border dark:bg-charcoal dark:text-kresna-light',
                  'dark:focus:border-primary-500 dark:focus:ring-primary-800',
                )}
              />
            </div>
            <ChevronRight className="mt-4 h-3.5 w-3.5 shrink-0 text-kresna-gray dark:text-kresna-gray" />
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-kresna-gray dark:text-kresna-gray">{t('common.to', 'To')}</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
                className={cn(
                  'flex h-9 w-full rounded-lg border border-kresna-border bg-white px-2.5 text-xs text-charcoal',
                  'transition-all duration-200',
                  'focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-200',
                  'dark:border-kresna-border dark:bg-charcoal dark:text-kresna-light',
                  'dark:focus:border-primary-500 dark:focus:ring-primary-800',
                )}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {hasRange && (
          <div className="border-t border-kresna-border px-3 py-2 flex justify-between items-center dark:border-kresna-border">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-kresna-gray hover:text-kresna-gray-dark transition-colors dark:text-kresna-gray dark:hover:text-kresna-gray"
            >
              {t('common.clearDates', 'Clear dates')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-all duration-150',
                'bg-primary-600 text-white hover:bg-primary-700',
                'active:scale-[0.97]',
              )}
            >
              Apply
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

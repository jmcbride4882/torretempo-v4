/**
 * DateRangePicker
 * Reusable date range selection with start/end date inputs
 * Matches the glass morphism design system (zinc/neutral colors, border-white/10)
 */

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Calendar, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Quick preset ranges
const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const;

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
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
  const [open, setOpen] = useState(false);
  const startRef = useRef<HTMLInputElement>(null);
  const hasRange = !!startDate || !!endDate;

  // Display text for the trigger button
  const displayText = React.useMemo(() => {
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }
    if (startDate) return `From ${formatDisplayDate(startDate)}`;
    if (endDate) return `Until ${formatDisplayDate(endDate)}`;
    return 'Date range';
  }, [startDate, endDate]);

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
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15'
              : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200',
            className,
          )}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[200px]">{displayText}</span>
          {hasRange && (
            <span
              role="button"
              tabIndex={0}
              className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
        className="w-[320px] glass-card border-white/10 p-0"
      >
        {/* Presets */}
        <div className="border-b border-white/5 px-3 py-2.5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            Quick select
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
                  'border border-white/5 bg-white/[0.03] text-neutral-400',
                  'hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300',
                  'active:scale-[0.97]',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom range inputs */}
        <div className="p-3">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            Custom range
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-neutral-500">From</label>
              <input
                ref={startRef}
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => onStartDateChange(e.target.value)}
                className={cn(
                  'flex h-9 w-full rounded-lg border border-white/10 bg-neutral-900 px-2.5 text-xs text-white',
                  'transition-all duration-200',
                  'focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30',
                  '[color-scheme:dark]',
                )}
              />
            </div>
            <ChevronRight className="mt-4 h-3.5 w-3.5 shrink-0 text-neutral-600" />
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-neutral-500">To</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
                className={cn(
                  'flex h-9 w-full rounded-lg border border-white/10 bg-neutral-900 px-2.5 text-xs text-white',
                  'transition-all duration-200',
                  'focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30',
                  '[color-scheme:dark]',
                )}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {hasRange && (
          <div className="border-t border-white/5 px-3 py-2 flex justify-between items-center">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Clear dates
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-all duration-150',
                'bg-indigo-600/80 text-white hover:bg-indigo-600',
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

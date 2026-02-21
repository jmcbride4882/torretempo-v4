import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WeekSelectorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onToday: () => void;
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('es-ES', { month: 'short' });
  const endMonth = end.toLocaleDateString('es-ES', { month: 'short' });
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${start.getDate()} - ${end.getDate()} ${startMonth} ${year}`;
  }
  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${year}`;
}

function isCurrentWeek(date: Date): boolean {
  const today = new Date();
  const { start, end } = getWeekRange(date);
  return today >= start && today <= end;
}

export function WeekSelector({ currentDate, onDateChange, onToday }: WeekSelectorProps) {
  const { t } = useTranslation();
  const { start, end } = getWeekRange(currentDate);
  const isCurrent = isCurrentWeek(currentDate);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousWeek}
          className="min-h-touch w-10 rounded-xl border border-kresna-border bg-white text-kresna-gray-dark hover:bg-kresna-light hover:text-charcoal"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          className="min-h-touch w-10 rounded-xl border border-kresna-border bg-white text-kresna-gray-dark hover:bg-kresna-light hover:text-charcoal"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Date display */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex min-h-touch items-center gap-2 rounded-xl border px-4',
          isCurrent
            ? 'border-primary-200 bg-primary-50'
            : 'border-kresna-border bg-white'
        )}>
          <Calendar className={cn(
            'h-4 w-4',
            isCurrent ? 'text-primary-600' : 'text-kresna-gray'
          )} />
          <span className={cn(
            'text-lg font-semibold tabular-nums tracking-tight',
            isCurrent ? 'text-primary-700' : 'text-charcoal'
          )}>
            {formatDateRange(start, end)}
          </span>
          {isCurrent && (
            <span className="ml-1 rounded-full bg-primary-50 border border-primary-200 px-2 py-0.5 text-[10px] font-semibold text-primary-600">
              {t('roster.currentWeek')}
            </span>
          )}
        </div>
      </div>

      {/* Today button */}
      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          className="gap-1.5 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('roster.today')}
        </Button>
      )}
    </div>
  );
}

export { getWeekRange };
export default WeekSelector;

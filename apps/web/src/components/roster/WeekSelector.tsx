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
        <div>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousWeek}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextWeek}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date display */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex h-9 items-center gap-2 rounded-lg border px-3',
          isCurrent
            ? 'border-primary-200 bg-primary-50'
            : 'border-slate-200 bg-white'
        )}>
          <Calendar className={cn(
            'h-4 w-4',
            isCurrent ? 'text-primary-600' : 'text-slate-500'
          )} />
          <span className={cn(
            'font-medium tabular-nums',
            isCurrent ? 'text-primary-700' : 'text-slate-900'
          )}>
            {formatDateRange(start, end)}
          </span>
          {isCurrent && (
            <span className="ml-1 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
              {t('roster.currentWeek')}
            </span>
          )}
        </div>
      </div>

      {/* Today button */}
      {!isCurrent && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="gap-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('roster.today')}
          </Button>
        </div>
      )}
    </div>
  );
}

export { getWeekRange };
export default WeekSelector;

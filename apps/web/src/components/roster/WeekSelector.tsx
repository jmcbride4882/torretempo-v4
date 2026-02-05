import { motion } from 'framer-motion';
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
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
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
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousWeek}
            className="h-9 w-9 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextWeek}
            className="h-9 w-9 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
      
      {/* Date display */}
      <motion.div
        key={start.toISOString()}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <div className={cn(
          'flex h-9 items-center gap-2 rounded-lg border px-3',
          isCurrent 
            ? 'border-primary-500/30 bg-primary-500/10' 
            : 'border-white/5 bg-white/5'
        )}>
          <Calendar className={cn(
            'h-4 w-4',
            isCurrent ? 'text-primary-400' : 'text-neutral-400'
          )} />
          <span className={cn(
            'font-medium tabular-nums',
            isCurrent ? 'text-primary-300' : 'text-neutral-200'
          )}>
            {formatDateRange(start, end)}
          </span>
          {isCurrent && (
            <span className="ml-1 rounded-full bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary-300">
              Current
            </span>
          )}
        </div>
      </motion.div>
      
      {/* Today button */}
      {!isCurrent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="gap-1.5 rounded-lg border border-primary-500/20 bg-primary-500/10 text-primary-300 hover:bg-primary-500/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Today
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export { getWeekRange };
export default WeekSelector;

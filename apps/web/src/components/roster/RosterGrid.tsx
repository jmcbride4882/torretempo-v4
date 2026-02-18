import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarOff, Loader2 } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ShiftCard } from './ShiftCard';
import type { Shift, WeekDay } from '@/types/roster';
import { getWeekRange } from './WeekSelector';

interface RosterGridProps {
  shifts: Shift[];
  currentDate: Date;
  isLoading?: boolean;
  onShiftClick?: (shift: Shift) => void;
  onShiftDrop?: (shiftId: string, targetDate: Date, targetTime?: number) => Promise<void>;
}

// Generate week days from a date
function generateWeekDays(date: Date, t: (key: string) => string): WeekDay[] {
  const { start } = getWeekRange(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: WeekDay[] = [];
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);

    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);

    days.push({
      date: day,
      dayName: t(`common.daysOfWeek.${dayKeys[i]}`),
      dayNumber: day.getDate(),
      isToday: dayDate.getTime() === today.getTime(),
      isWeekend: i >= 5, // Saturday and Sunday
    });
  }

  return days;
}

// Time slots for the grid (6 AM to 10 PM)
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6; // Start at 6 AM
  return {
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
  };
});

// Helper to get date key from Date object
function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// Group shifts by day
function groupShiftsByDay(shifts: Shift[], weekDays: WeekDay[]): Map<string, Shift[]> {
  const grouped = new Map<string, Shift[]>();
  
  weekDays.forEach((day) => {
    const dateKey = getDateKey(day.date);
    grouped.set(dateKey, []);
  });
  
  shifts.forEach((shift) => {
    const shiftDate = new Date(shift.start_time);
    const dateKey = getDateKey(shiftDate);
    
    const dayShifts = grouped.get(dateKey);
    if (dayShifts) {
      dayShifts.push(shift);
    }
  });
  
  return grouped;
}

// Calculate shift position and height for grid placement
function calculateShiftPosition(shift: Shift): { top: number; height: number } {
  const startDate = new Date(shift.start_time);
  const endDate = new Date(shift.end_time);
  
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
  
  // Grid starts at 6 AM
  const gridStartHour = 6;
  const pixelsPerHour = 60; // 60px per hour
  
  const top = Math.max(0, (startHour - gridStartHour) * pixelsPerHour);
  const height = Math.max(30, (endHour - startHour) * pixelsPerHour); // Minimum 30px height
  
  return { top, height };
}

// Mobile card view for smaller screens
function MobileShiftList({ shifts, weekDays, onShiftClick }: {
  shifts: Shift[];
  weekDays: WeekDay[];
  onShiftClick?: (shift: Shift) => void;
}) {
  const { t, i18n } = useTranslation();
  const shiftsByDay = groupShiftsByDay(shifts, weekDays);
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';

  return (
    <div className="space-y-4 lg:hidden">
      {weekDays.map((day, index) => {
        const dateKey = getDateKey(day.date);
        const dayShifts = shiftsByDay.get(dateKey) || [];

        return (
          <motion.div
            key={dateKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'rounded-xl border border-slate-100 bg-white p-4',
              day.isToday && 'border-primary-500/30 bg-primary-500/5'
            )}
          >
            {/* Day header */}
            <div className="mb-3 flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 flex-col items-center justify-center rounded-lg',
                day.isToday
                  ? 'bg-primary-500 text-white'
                  : day.isWeekend
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-slate-100/50 text-slate-700'
              )}>
                <span className="text-[10px] font-medium uppercase leading-none">{day.dayName}</span>
                <span className="text-lg font-bold leading-tight">{day.dayNumber}</span>
              </div>
              <div>
                <p className={cn(
                  'font-medium',
                  day.isToday ? 'text-primary-600' : 'text-slate-900'
                )}>
                  {day.date.toLocaleDateString(locale, { weekday: 'long' })}
                </p>
                <p className="text-xs text-slate-400">
                  {t('roster.shiftCount', { count: dayShifts.length })}
                </p>
              </div>
            </div>

            {/* Shifts */}
            {dayShifts.length > 0 ? (
              <div className="space-y-2">
                {dayShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onClick={() => onShiftClick?.(shift)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
                <p className="text-sm text-slate-400">{t('roster.noShiftsScheduled')}</p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// Draggable shift wrapper
function DraggableShift({ 
  shift, 
  children 
}: { 
  shift: Shift; 
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
    data: { shift },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('cursor-move', isDragging && 'opacity-50')}
    >
      {children}
    </div>
  );
}

// Droppable day column
function DroppableDay({
  day,
  children,
  className,
}: {
  day: WeekDay;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getDateKey(day.date),
    data: { date: day.date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && 'ring-2 ring-primary-500 ring-inset'
      )}
    >
      {children}
    </div>
  );
}

export function RosterGrid({ shifts, currentDate, isLoading, onShiftClick, onShiftDrop }: RosterGridProps) {
  const { t } = useTranslation();
  const weekDays = useMemo(() => generateWeekDays(currentDate, t), [currentDate, t]);
  const shiftsByDay = useMemo(() => groupShiftsByDay(shifts, weekDays), [shifts, weekDays]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  
  const handleDragStart = (event: DragStartEvent) => {
    const shiftData = event.active.data.current?.shift as Shift | undefined;
    if (shiftData) {
      setActiveShift(shiftData);
    }
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShift(null);
    
    if (!over || !onShiftDrop) return;
    
    const shiftId = active.id as string;
    const targetDateKey = over.id as string;
    
    // Find the target date from weekDays
    const targetDay = weekDays.find((d) => getDateKey(d.date) === targetDateKey);
    if (!targetDay) return;
    
    // Get the shift data
    const shiftData = active.data.current?.shift as Shift | undefined;
    if (!shiftData) return;
    
    // Call the drop handler
    await onShiftDrop(shiftId, targetDay.date);
  };
  
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-500">{t('roster.loadingRoster')}</p>
        </motion.div>
      </div>
    );
  }
  
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Mobile view */}
      <MobileShiftList
        shifts={shifts}
        weekDays={weekDays}
        onShiftClick={onShiftClick}
      />
      
      {/* Drag overlay */}
      <DragOverlay>
        {activeShift && (
          <div className="rotate-3 scale-105 opacity-90">
            <ShiftCard shift={activeShift} />
          </div>
        )}
      </DragOverlay>
      
      {/* Desktop grid view */}
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
          {/* Header row with day names */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100">
            {/* Empty corner cell */}
            <div className="border-r border-slate-100 bg-slate-50 p-3">
              <span className="text-xs font-medium uppercase text-slate-400">{t('roster.timeHeader')}</span>
            </div>
            
            {/* Day headers */}
            {weekDays.map((day, index) => (
              <motion.div
                key={day.date.toISOString()}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'flex flex-col items-center justify-center border-r border-slate-100 p-3 last:border-r-0',
                  day.isToday && 'bg-primary-500/5',
                  day.isWeekend && !day.isToday && 'bg-slate-50/50'
                )}
              >
                <span className={cn(
                  'text-xs font-medium uppercase',
                  day.isToday ? 'text-primary-500' : day.isWeekend ? 'text-slate-400' : 'text-slate-500'
                )}>
                  {day.dayName}
                </span>
                <span className={cn(
                  'mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold',
                  day.isToday 
                    ? 'bg-primary-500 text-white' 
                    : day.isWeekend 
                      ? 'text-slate-400' 
                      : 'text-slate-900'
                )}>
                  {day.dayNumber}
                </span>
              </motion.div>
            ))}
          </div>
          
          {/* Grid body */}
          <div className="relative grid grid-cols-[80px_repeat(7,1fr)]">
            {/* Time column */}
            <div className="border-r border-slate-100 bg-slate-50/50">
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot.hour}
                  className="flex h-[60px] items-start justify-end border-b border-slate-100 pr-3 pt-1 last:border-b-0"
                >
                  <span className="text-xs font-medium tabular-nums text-slate-400">
                    {slot.label}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Day columns with shifts */}
            {weekDays.map((day) => {
              const dateKey = getDateKey(day.date);
              const dayShifts = shiftsByDay.get(dateKey) || [];
              
              return (
                <DroppableDay
                  key={dateKey}
                  day={day}
                  className={cn(
                    'relative border-r border-slate-100 last:border-r-0',
                    day.isToday && 'bg-primary-500/[0.02]',
                    day.isWeekend && !day.isToday && 'bg-slate-50/30'
                  )}
                >
                  {/* Hour grid lines */}
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot.hour}
                      className="h-[60px] border-b border-slate-100 last:border-b-0"
                    />
                  ))}
                  
                  {/* Shifts overlay */}
                  <div className="absolute inset-0 p-1">
                    <AnimatePresence mode="popLayout">
                      {dayShifts.map((shift, shiftIndex) => {
                        const { top, height } = calculateShiftPosition(shift);
                        
                        return (
                          <DraggableShift key={shift.id} shift={shift}>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: shiftIndex * 0.02 }}
                              style={{
                                position: 'absolute',
                                top: `${top}px`,
                                left: '4px',
                                right: '4px',
                                height: `${height}px`,
                                zIndex: shiftIndex + 1,
                              }}
                            >
                              <ShiftCard
                                shift={shift}
                                onClick={() => onShiftClick?.(shift)}
                                compact={height < 80}
                                style={{ height: '100%' }}
                              />
                            </motion.div>
                          </DraggableShift>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                  
                  {/* Today indicator line */}
                  {day.isToday && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute left-0 right-0 h-0.5 bg-primary-500 shadow-lg shadow-primary-500/50"
                      style={{
                        top: `${Math.max(0, (new Date().getHours() + new Date().getMinutes() / 60 - 6) * 60)}px`,
                      }}
                    >
                      <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
                    </motion.div>
                  )}
                </DroppableDay>
              );
            })}
          </div>
        </div>
        
        {/* Empty state */}
        {shifts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <CalendarOff className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{t('roster.noShifts')}</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {t('roster.noShiftsDesc')}
            </p>
          </motion.div>
        )}
      </div>
    </DndContext>
  );
}

export default RosterGrid;

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Loader2, UserPlus } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ShiftCard } from './ShiftCard';
import type { Shift, WeekDay } from '@/types/roster';
import { getWeekRange } from './WeekSelector';

interface StaffMember {
  id: string;
  name: string;
  email: string;
}

interface StaffRosterGridProps {
  shifts: Shift[];
  staff: StaffMember[];
  currentDate: Date;
  isLoading?: boolean;
  onShiftClick?: (shift: Shift) => void;
  onShiftDrop?: (shiftId: string, newUserId: string, targetDate: Date) => Promise<void>;
}

// Generate week days from a date
function generateWeekDays(date: Date): WeekDay[] {
  const { start } = getWeekRange(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: WeekDay[] = [];
  const dayNames = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);

    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);

    days.push({
      date: day,
      dayName: dayNames[i] ?? 'Day',
      dayNumber: day.getDate(),
      isToday: dayDate.getTime() === today.getTime(),
      isWeekend: i >= 5,
    });
  }

  return days;
}

// Helper to get date key from Date object
function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// Group shifts by staff member and day
function groupShiftsByStaffAndDay(shifts: Shift[], staff: StaffMember[], weekDays: WeekDay[]): Map<string, Map<string, Shift[]>> {
  const grouped = new Map<string, Map<string, Shift[]>>();

  // Initialize structure for all staff
  staff.forEach((member) => {
    const dayMap = new Map<string, Shift[]>();
    weekDays.forEach((day) => {
      dayMap.set(getDateKey(day.date), []);
    });
    grouped.set(member.id, dayMap);
  });

  // Also add unassigned shifts
  const unassignedDayMap = new Map<string, Shift[]>();
  weekDays.forEach((day) => {
    unassignedDayMap.set(getDateKey(day.date), []);
  });
  grouped.set('unassigned', unassignedDayMap);

  // Distribute shifts
  shifts.forEach((shift) => {
    const userId = shift.user_id || 'unassigned';
    const shiftDate = new Date(shift.start_time);
    const dateKey = getDateKey(shiftDate);

    const userMap = grouped.get(userId);
    if (userMap) {
      const dayShifts = userMap.get(dateKey);
      if (dayShifts) {
        dayShifts.push(shift);
      }
    }
  });

  return grouped;
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

// Droppable cell (staff + day)
function DroppableCell({
  staffId,
  day,
  children,
  className,
}: {
  staffId: string;
  day: WeekDay;
  children: React.ReactNode;
  className?: string;
}) {
  const cellId = `${staffId}-${getDateKey(day.date)}`;
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { staffId, date: day.date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative min-h-[80px] border-r border-b border-slate-200 p-2 last:border-r-0',
        className,
        isOver && 'bg-primary-500/10 ring-2 ring-primary-500 ring-inset'
      )}
    >
      {children}
    </div>
  );
}

export function StaffRosterGrid({ shifts, staff, currentDate, isLoading, onShiftClick, onShiftDrop }: StaffRosterGridProps) {
  const { t } = useTranslation();
  const weekDays = useMemo(() => generateWeekDays(currentDate), [currentDate]);
  const shiftsByStaffAndDay = useMemo(() => groupShiftsByStaffAndDay(shifts, staff, weekDays), [shifts, staff, weekDays]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  // Include unassigned shifts in the display
  const displayStaff = useMemo(() => {
    const unassignedShifts = shiftsByStaffAndDay.get('unassigned');
    const hasUnassigned = unassignedShifts && Array.from(unassignedShifts.values()).some(shifts => shifts.length > 0);

    const staffList = [...staff];
    if (hasUnassigned) {
      staffList.push({ id: 'unassigned', name: t('roster.unassignedShifts'), email: '' });
    }
    return staffList;
  }, [staff, shiftsByStaffAndDay, t]);

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
    const overId = over.id as string;

    // Parse cell ID: "staffId-dateKey"
    const [newUserId, dateKey] = overId.split('-');
    if (!newUserId || !dateKey) return;

    // Find the target date
    const targetDay = weekDays.find((d) => getDateKey(d.date) === dateKey);
    if (!targetDay) return;

    // Get shift data
    const shiftData = active.data.current?.shift as Shift | undefined;
    if (!shiftData) return;

    // Call the drop handler
    await onShiftDrop(shiftId, newUserId, targetDay.date);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-500">{t('roster.loading')}</p>
        </div>
      </div>
    );
  }

  if (displayStaff.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <UserPlus className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{t('roster.noTeamMembers')}</h3>
          <p className="max-w-sm text-sm text-slate-500">
            {t('roster.addTeamMembersDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Drag overlay */}
      <DragOverlay>
        {activeShift && (
          <div className="rotate-3 scale-105 opacity-90">
            <ShiftCard shift={activeShift} compact />
          </div>
        )}
      </DragOverlay>

      {/* Desktop grid view */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Header row with day names */}
          <div className="grid grid-cols-[200px_repeat(7,minmax(120px,1fr))] border-b border-slate-200">
            {/* Staff column header */}
            <div className="border-r border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium uppercase text-slate-500">{t('roster.staffMember')}</span>
              </div>
            </div>

            {/* Day headers */}
            {weekDays.map((day) => (
              <div
                key={day.date.toISOString()}
                className={cn(
                  'flex flex-col items-center justify-center border-r border-slate-200 p-3 last:border-r-0',
                  day.isToday && 'bg-primary-50/50',
                  day.isWeekend && !day.isToday && 'bg-slate-50'
                )}
              >
                <span className={cn(
                  'text-xs font-medium uppercase',
                  day.isToday ? 'text-primary-600' : day.isWeekend ? 'text-slate-400' : 'text-slate-500'
                )}>
                  {day.dayName}
                </span>
                <span className={cn(
                  'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                  day.isToday
                    ? 'bg-primary-500 text-white'
                    : day.isWeekend
                      ? 'text-slate-400'
                      : 'text-slate-900'
                )}>
                  {day.dayNumber}
                </span>
              </div>
            ))}
          </div>

          {/* Grid body - staff rows */}
          {displayStaff.map((member) => {
            const staffShifts = shiftsByStaffAndDay.get(member.id);

            return (
              <div
                key={member.id}
                className="grid grid-cols-[200px_repeat(7,minmax(120px,1fr))]"
              >
                {/* Staff name cell */}
                <div className={cn(
                  'flex items-center gap-3 border-r border-b border-slate-200 bg-slate-50 p-3',
                  member.id === 'unassigned' && 'bg-amber-50'
                )}>
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    member.id === 'unassigned'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary-100 text-primary-700'
                  )}>
                    {member.id === 'unassigned' ? '?' : member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'truncate text-sm font-medium',
                      member.id === 'unassigned' ? 'text-amber-700' : 'text-slate-900'
                    )}>
                      {member.name}
                    </p>
                    {member.email && (
                      <p className="truncate text-xs text-slate-400">{member.email}</p>
                    )}
                  </div>
                </div>

                {/* Day cells for this staff member */}
                {weekDays.map((day) => {
                  const dateKey = getDateKey(day.date);
                  const dayShifts = staffShifts?.get(dateKey) || [];

                  return (
                    <DroppableCell
                      key={`${member.id}-${dateKey}`}
                      staffId={member.id}
                      day={day}
                      className={cn(
                        day.isToday && 'bg-primary-50/30',
                        day.isWeekend && !day.isToday && 'bg-slate-50/50'
                      )}
                    >
                      {dayShifts.length > 0 ? (
                        <div className="space-y-1">
                          {dayShifts.map((shift) => (
                            <DraggableShift key={shift.id} shift={shift}>
                              <div>
                                <ShiftCard
                                  shift={shift}
                                  onClick={() => onShiftClick?.(shift)}
                                  compact
                                />
                              </div>
                            </DraggableShift>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[60px] items-center justify-center">
                          <span className="text-xs text-slate-300">&mdash;</span>
                        </div>
                      )}
                    </DroppableCell>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}

export default StaffRosterGrid;

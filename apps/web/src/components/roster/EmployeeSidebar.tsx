/**
 * EmployeeSidebar Component
 *
 * Displays organization members with weekly hours and drag-to-assign functionality.
 * Employee cards can be dragged onto existing shifts in the roster grid.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Users } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EmployeeSidebarProps {
  organizationSlug: string;
  weekStart: Date;
  className?: string;
}

interface MemberData {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface UserHoursData {
  userId: string;
  totalHours: number;
  shiftCount: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MAX_WEEKLY_HOURS = 40;

function getHoursColor(hours: number): string {
  if (hours < 32) return 'bg-emerald-500';
  if (hours < 38) return 'bg-amber-500';
  return 'bg-red-500';
}

function getHoursTextColor(hours: number): string {
  if (hours < 32) return 'text-emerald-400';
  if (hours < 38) return 'text-amber-400';
  return 'text-red-400';
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

interface DraggableEmployeeCardProps {
  member: MemberData;
  hours: number;
}

function DraggableEmployeeCard({ member, hours }: DraggableEmployeeCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `employee-${member.userId}`,
    data: { employee: member, type: 'employee' },
  });

  const name = member.user?.name || member.user?.email || 'Unnamed';
  const initials = getInitials(member.user?.name, member.user?.email);
  const hoursPercent = Math.min(100, (hours / MAX_WEEKLY_HOURS) * 100);

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'cursor-grab rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all',
        'hover:border-white/10 hover:bg-white/[0.04]',
        isDragging && 'cursor-grabbing opacity-50 scale-105 shadow-lg shadow-primary-500/10'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {member.user?.image ? (
          <img
            src={member.user.image}
            alt={name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-sm font-medium text-primary-300">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <span className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-neutral-400">
              {member.role}
            </span>
          </div>

          {/* Hours Progress */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-neutral-800">
              <div
                className={cn('h-full rounded-full transition-all', getHoursColor(hours))}
                style={{ width: `${hoursPercent}%` }}
              />
            </div>
            <span className={cn('text-xs tabular-nums', getHoursTextColor(hours))}>
              {hours.toFixed(1)}h
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmployeeCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-neutral-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-neutral-800" />
          <div className="h-1.5 w-full rounded-full bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}

export function EmployeeSidebar({ organizationSlug, weekStart, className }: EmployeeSidebarProps) {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [hoursMap, setHoursMap] = useState<Map<string, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch members and hours
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch members
        const membersRes = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/members`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!membersRes.ok) {
          throw new Error('Failed to fetch members');
        }

        const membersData = await membersRes.json();
        const membersList: MemberData[] = (membersData.members || []).filter(
          (m: MemberData) => Boolean(m.userId)
        );

        if (!isMounted) return;
        setMembers(membersList);

        // Fetch hours for each member
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const hoursPromises = membersList.map(async (m: MemberData) => {
          try {
            const hoursRes = await fetch(
              `${API_URL}/api/v1/org/${organizationSlug}/roster/user-hours?weekStart=${weekStartStr}&userId=${m.userId}`,
              {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
              }
            );

            if (hoursRes.ok) {
              const hoursData: UserHoursData = await hoursRes.json();
              return { userId: m.userId, hours: hoursData.totalHours || 0 };
            }
            return { userId: m.userId, hours: 0 };
          } catch {
            return { userId: m.userId, hours: 0 };
          }
        });

        const hoursResults = await Promise.all(hoursPromises);
        const newHoursMap = new Map<string, number>();
        hoursResults.forEach(({ userId, hours }) => {
          newHoursMap.set(userId, hours);
        });

        if (isMounted) {
          setHoursMap(newHoursMap);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load employees');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug, weekStart]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter((m) => {
      const name = m.user?.name?.toLowerCase() || '';
      const email = m.user?.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }, [members, searchQuery]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-neutral-500" />
        <h3 className="text-sm font-medium text-neutral-300">Employees</h3>
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-xs text-neutral-500">
          {members.length}
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="glass-card border-white/10 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-primary-500"
        />
      </div>

      {/* Employee List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoading ? (
          <>
            <EmployeeCardSkeleton />
            <EmployeeCardSkeleton />
            <EmployeeCardSkeleton />
          </>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center">
            <User className="mx-auto h-8 w-8 text-neutral-600" />
            <p className="mt-2 text-sm text-neutral-500">
              {searchQuery ? 'No employees match your search' : 'No employees found'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <DraggableEmployeeCard
              key={member.userId}
              member={member}
              hours={hoursMap.get(member.userId) || 0}
            />
          ))
        )}
      </div>

      {/* Footer - Hours Legend */}
      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="mb-2 text-xs font-medium text-neutral-500">Weekly Hours</p>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-neutral-500">&lt;32h</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-neutral-500">32-38h</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-neutral-500">&gt;38h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeSidebar;

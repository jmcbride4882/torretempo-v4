/**
 * Auto-Scheduler Service
 *
 * Generates shift assignments for a week based on:
 * - Shift templates (what shifts need filling)
 * - Employee availability (when people can work)
 * - Skills matching (required skills for shifts)
 * - Compliance rules (Spanish labor law limits)
 * - Fairness (distribute hours evenly)
 *
 * Algorithm: Greedy assignment with constraint satisfaction
 * 1. For each shift slot, find eligible employees
 * 2. Score candidates by: availability preference, skill match, hours fairness
 * 3. Assign best candidate, update running totals
 * 4. Validate against compliance rules
 */

import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  shifts,
  shift_templates,
  availability,
  member,
  member_skills,
  leave_requests,
} from '../db/schema.js';
import { rosterValidator } from './roster-validator.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AutoScheduleParams {
  organizationId: string;
  weekStart: Date; // Monday
  locationIds?: string[]; // Filter by location (optional)
  respectAvailability: boolean; // If true, only assign when available
  maxHoursPerEmployee?: number; // Cap weekly hours (default: 40)
}

export interface AutoScheduleResult {
  created: number;
  skipped: number;
  unfilledSlots: UnfilledSlot[];
  assignments: AssignmentSummary[];
  warnings: string[];
}

interface UnfilledSlot {
  templateName: string;
  date: string;
  reason: string;
}

interface AssignmentSummary {
  userId: string;
  shiftCount: number;
  totalHours: number;
}

interface CandidateScore {
  userId: string;
  score: number;
  reasons: string[];
}

interface TemplateSlot {
  template: typeof shift_templates.$inferSelect;
  date: Date;
  dayOfWeek: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h ?? 0, minutes: m ?? 0 };
}

function calculateShiftHours(startTime: string, endTime: string, breakMinutes: number): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  let hours = end.hours + end.minutes / 60 - (start.hours + start.minutes / 60);
  if (hours <= 0) hours += 24; // Overnight shift
  return Math.max(0, hours - breakMinutes / 60);
}

function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

// ============================================================================
// AUTO-SCHEDULER
// ============================================================================

export async function autoSchedule(params: AutoScheduleParams): Promise<AutoScheduleResult> {
  const {
    organizationId,
    weekStart,
    locationIds,
    respectAvailability,
    maxHoursPerEmployee = 40,
  } = params;

  const weekDates = getWeekDates(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // 1. Get active shift templates for this org
  const templateConditions = [
    eq(shift_templates.organization_id, organizationId),
    eq(shift_templates.is_active, true),
  ];
  if (locationIds && locationIds.length > 0) {
    templateConditions.push(inArray(shift_templates.location_id, locationIds));
  }

  const templates = await db
    .select()
    .from(shift_templates)
    .where(and(...templateConditions));

  if (templates.length === 0) {
    return { created: 0, skipped: 0, unfilledSlots: [], assignments: [], warnings: ['No active shift templates found'] };
  }

  // 2. Get org members
  const members = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  const employeeIds = members
    .filter(m => ['employee', 'manager'].includes(m.role))
    .map(m => m.userId);

  if (employeeIds.length === 0) {
    return { created: 0, skipped: 0, unfilledSlots: [], assignments: [], warnings: ['No employees found'] };
  }

  // 3. Get employee availability
  const availabilityRecords = await db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.organization_id, organizationId),
        inArray(availability.user_id, employeeIds)
      )
    );

  // Index availability by userId + dayOfWeek
  const availabilityMap = new Map<string, typeof availabilityRecords>();
  for (const record of availabilityRecords) {
    const key = `${record.user_id}_${record.day_of_week}`;
    const existing = availabilityMap.get(key) || [];
    existing.push(record);
    availabilityMap.set(key, existing);
  }

  // 4. Get employee skills
  const skillRecords = await db
    .select()
    .from(member_skills)
    .where(inArray(member_skills.member_id, employeeIds));

  const skillMap = new Map<string, Set<string>>();
  for (const record of skillRecords) {
    const skills = skillMap.get(record.member_id) || new Set();
    skills.add(record.skill_id);
    skillMap.set(record.member_id, skills);
  }

  // 5. Get existing shifts for the week (to avoid double-booking)
  const existingShifts = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.organization_id, organizationId),
        gte(shifts.start_time, weekStart),
        lte(shifts.start_time, weekEnd)
      )
    );

  // Track hours per employee
  const hoursTracker = new Map<string, number>();
  for (const shift of existingShifts) {
    if (!shift.user_id) continue;
    const hours = (shift.end_time.getTime() - shift.start_time.getTime()) / (1000 * 60 * 60)
      - (shift.break_minutes || 0) / 60;
    hoursTracker.set(shift.user_id, (hoursTracker.get(shift.user_id) || 0) + hours);
  }

  // 6. Get approved leave requests for the week
  const leaveRecords = await db
    .select()
    .from(leave_requests)
    .where(
      and(
        eq(leave_requests.organization_id, organizationId),
        eq(leave_requests.status, 'approved'),
        lte(leave_requests.start_date, weekEnd),
        gte(leave_requests.end_date, weekStart)
      )
    );

  const employeesOnLeave = new Map<string, Set<string>>(); // userId -> set of date strings
  for (const leave of leaveRecords) {
    const dates = employeesOnLeave.get(leave.user_id) || new Set();
    let d = new Date(Math.max(leave.start_date.getTime(), weekStart.getTime()));
    const end = new Date(Math.min(leave.end_date.getTime(), weekEnd.getTime()));
    while (d <= end) {
      dates.add(d.toISOString().slice(0, 10));
      d = new Date(d);
      d.setDate(d.getDate() + 1);
    }
    employeesOnLeave.set(leave.user_id, dates);
  }

  // 7. Generate slot list: one slot per template per day
  const slots: TemplateSlot[] = [];
  for (const template of templates) {
    for (const date of weekDates) {
      slots.push({
        template,
        date,
        dayOfWeek: date.getDay(), // 0=Sun, 6=Sat
      });
    }
  }

  // Sort slots by shift start time for natural ordering
  slots.sort((a, b) => {
    const dateComp = a.date.getTime() - b.date.getTime();
    if (dateComp !== 0) return dateComp;
    return a.template.start_time.localeCompare(b.template.start_time);
  });

  // 8. Greedy assignment
  const created: string[] = [];
  const unfilledSlots: UnfilledSlot[] = [];
  const warnings: string[] = [];
  const assignedShiftsPerDay = new Map<string, Set<string>>(); // "userId_dateStr" -> assigned

  for (const slot of slots) {
    const dateStr = slot.date.toISOString().slice(0, 10);
    const shiftHours = calculateShiftHours(
      slot.template.start_time,
      slot.template.end_time,
      slot.template.break_minutes
    );

    // Check if this slot already has an existing shift
    const alreadyAssigned = existingShifts.some(s =>
      s.template_id === slot.template.id &&
      s.start_time.toISOString().slice(0, 10) === dateStr
    );
    if (alreadyAssigned) continue;

    // Score all candidates
    const candidates: CandidateScore[] = [];

    for (const userId of employeeIds) {
      const reasons: string[] = [];
      let score = 0;

      // Check leave
      const leaveDates = employeesOnLeave.get(userId);
      if (leaveDates?.has(dateStr)) continue;

      // Check already assigned this day+time
      const dayKey = `${userId}_${dateStr}`;
      if (assignedShiftsPerDay.get(dayKey)?.has(slot.template.start_time)) continue;

      // Check availability
      const userAvail = availabilityMap.get(`${userId}_${slot.dayOfWeek}`) || [];
      const isAvailable = userAvail.some(a => a.type === 'available' || a.type === 'preferred');
      const isPreferred = userAvail.some(a => a.type === 'preferred');
      const isUnavailable = userAvail.some(a => a.type === 'unavailable');

      if (respectAvailability && isUnavailable) continue;
      if (respectAvailability && userAvail.length > 0 && !isAvailable) continue;

      if (isPreferred) { score += 20; reasons.push('preferred'); }
      else if (isAvailable) { score += 10; reasons.push('available'); }
      else { score += 5; reasons.push('no_preference'); }

      // Check skills
      if (slot.template.required_skill_id) {
        const userSkills = skillMap.get(userId);
        if (userSkills?.has(slot.template.required_skill_id)) {
          score += 15;
          reasons.push('skill_match');
        } else {
          score -= 10;
          reasons.push('no_skill');
        }
      }

      // Hours fairness: prefer employees with fewer hours
      const currentHours = hoursTracker.get(userId) || 0;
      if (currentHours + shiftHours > maxHoursPerEmployee) continue; // Would exceed cap

      // Fairness bonus: lower hours = higher score (up to 20 points)
      const fairnessScore = Math.max(0, 20 - (currentHours / maxHoursPerEmployee) * 20);
      score += fairnessScore;
      reasons.push(`hours:${currentHours.toFixed(1)}`);

      candidates.push({ userId, score, reasons });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Try to assign best candidate
    let assigned = false;
    for (const candidate of candidates) {
      // Build shift dates from template times
      const startParts = parseTime(slot.template.start_time);
      const endParts = parseTime(slot.template.end_time);

      const shiftStart = new Date(slot.date);
      shiftStart.setHours(startParts.hours, startParts.minutes, 0, 0);

      const shiftEnd = new Date(slot.date);
      shiftEnd.setHours(endParts.hours, endParts.minutes, 0, 0);
      if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1); // Overnight

      // Validate against compliance rules
      const validation = await rosterValidator.validateShiftAssignment(
        organizationId,
        candidate.userId,
        { start: shiftStart, end: shiftEnd, breakMinutes: slot.template.break_minutes }
      );

      if (!validation.valid) continue;

      // Create the shift
      const [newShift] = await db
        .insert(shifts)
        .values({
          organization_id: organizationId,
          user_id: candidate.userId,
          location_id: slot.template.location_id || organizationId, // Fallback
          template_id: slot.template.id,
          start_time: shiftStart,
          end_time: shiftEnd,
          break_minutes: slot.template.break_minutes,
          status: 'draft',
          is_published: false,
          color: slot.template.color,
          required_skill_id: slot.template.required_skill_id,
          created_by: 'auto-scheduler',
        })
        .returning({ id: shifts.id });

      if (newShift) {
        created.push(newShift.id);
        hoursTracker.set(candidate.userId, (hoursTracker.get(candidate.userId) || 0) + shiftHours);
        const dayKey = `${candidate.userId}_${dateStr}`;
        const dayShifts = assignedShiftsPerDay.get(dayKey) || new Set();
        dayShifts.add(slot.template.start_time);
        assignedShiftsPerDay.set(dayKey, dayShifts);
        assigned = true;
        break;
      }
    }

    if (!assigned && candidates.length === 0) {
      unfilledSlots.push({
        templateName: slot.template.name,
        date: dateStr,
        reason: 'No eligible employees available',
      });
    } else if (!assigned) {
      unfilledSlots.push({
        templateName: slot.template.name,
        date: dateStr,
        reason: 'All candidates failed compliance validation',
      });
    }
  }

  // Build assignment summary
  const summaryMap = new Map<string, { shiftCount: number; totalHours: number }>();
  for (const userId of employeeIds) {
    const hours = hoursTracker.get(userId) || 0;
    if (hours > 0) {
      summaryMap.set(userId, { shiftCount: 0, totalHours: hours });
    }
  }

  const assignments: AssignmentSummary[] = Array.from(summaryMap.entries()).map(
    ([userId, data]) => ({ userId, ...data })
  );

  if (unfilledSlots.length > 0) {
    warnings.push(`${unfilledSlots.length} shift slots could not be filled`);
  }

  return {
    created: created.length,
    skipped: unfilledSlots.length,
    unfilledSlots,
    assignments,
    warnings,
  };
}

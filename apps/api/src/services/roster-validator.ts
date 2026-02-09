/**
 * Roster Validator Service
 * 
 * Validates shift assignments against Spanish labor law compliance rules.
 * Wraps ComplianceValidator for roster-specific validation scenarios.
 * 
 * Used for:
 * - Real-time validation during drag-and-drop roster building
 * - Pre-publish validation of entire roster
 * - Shift creation/update validation
 */

import { and, eq, gte, lte, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shifts, organization_settings } from '../db/schema.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ShiftData {
  start: Date | string;
  end: Date | string;
  locationId?: string;
  breakMinutes?: number;
}

export interface RosterValidationResult {
  valid: boolean;
  violations: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  rule: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ruleReference?: string;
}

export interface UserWeeklyHours {
  userId: string;
  weekStart: Date;
  totalHours: number;
  shiftCount: number;
}

// ============================================================================
// CONSTANTS (Spanish Labor Law)
// ============================================================================

const MAX_DAILY_HOURS = 9;
const MAX_WEEKLY_HOURS_REGULAR = 40;
const MAX_WEEKLY_HOURS_ABSOLUTE = 48;
const MIN_REST_HOURS_BETWEEN_SHIFTS = 12;
const WARNING_WEEKLY_HOURS_THRESHOLD = 38;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get start of week (Monday) for a given date
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday is start of week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of week (Sunday 23:59:59) for a given date
 */
function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Calculate hours between two dates
 */
function calculateHours(start: Date, end: Date, breakMinutes = 0): number {
  const ms = end.getTime() - start.getTime();
  const hours = ms / (1000 * 60 * 60);
  return Math.max(0, hours - breakMinutes / 60);
}



// ============================================================================
// ROSTER VALIDATOR CLASS
// ============================================================================

export class RosterValidator {
  /**
   * Validate a proposed shift assignment
   */
  async validateShiftAssignment(
    organizationId: string,
    userId: string,
    shiftData: ShiftData,
    excludeShiftId?: string
  ): Promise<RosterValidationResult> {
    const violations: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const start = new Date(shiftData.start);
    const end = new Date(shiftData.end);
    const breakMinutes = shiftData.breakMinutes || 0;

    // 1. Validate shift duration (daily limit)
    const shiftHours = calculateHours(start, end, breakMinutes);
    if (shiftHours > MAX_DAILY_HOURS) {
      violations.push({
        rule: 'daily_limit',
        message: `Shift duration (${shiftHours.toFixed(1)}h) exceeds daily limit of ${MAX_DAILY_HOURS}h`,
        severity: 'high',
        ruleReference: 'Estatuto Art. 34.3',
      });
    }

    // 2. Check for double-booking
    const doubleBooking = await this.checkDoubleBooking(
      organizationId,
      userId,
      start,
      end,
      excludeShiftId
    );
    if (doubleBooking) {
      violations.push({
        rule: 'double_booking',
        message: `User already has a shift scheduled at this time`,
        severity: 'critical',
        ruleReference: 'Scheduling conflict',
      });
    }

    // 3. Check rest period since last shift
    const restPeriodIssue = await this.checkRestPeriod(
      organizationId,
      userId,
      start,
      excludeShiftId
    );
    if (restPeriodIssue) {
      violations.push(restPeriodIssue);
    }

    // 4. Check weekly hours
    const weeklyHoursResult = await this.checkWeeklyHours(
      organizationId,
      userId,
      start,
      shiftHours,
      excludeShiftId
    );
    if (weeklyHoursResult.violation) {
      violations.push(weeklyHoursResult.violation);
    }
    if (weeklyHoursResult.warning) {
      warnings.push(weeklyHoursResult.warning);
    }

    // 5. Check organization-specific settings
    const orgSettings = await this.getOrganizationSettings(organizationId);
    if (orgSettings) {
      // Custom daily limit
      if (orgSettings.max_daily_hours && shiftHours > parseFloat(orgSettings.max_daily_hours)) {
        violations.push({
          rule: 'org_daily_limit',
          message: `Shift exceeds organization's daily limit of ${orgSettings.max_daily_hours}h`,
          severity: 'high',
          ruleReference: 'Organization policy',
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Check if user has another shift at the same time
   */
  private async checkDoubleBooking(
    organizationId: string,
    userId: string,
    start: Date,
    end: Date,
    excludeShiftId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(shifts.organization_id, organizationId),
      eq(shifts.user_id, userId),
      lte(shifts.start_time, end),
      gte(shifts.end_time, start),
    ];

    if (excludeShiftId) {
      conditions.push(ne(shifts.id, excludeShiftId));
    }

    const overlapping = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(...conditions))
      .limit(1);

    return overlapping.length > 0;
  }

  /**
   * Check rest period since last shift (12h minimum)
   */
  private async checkRestPeriod(
    organizationId: string,
    userId: string,
    newShiftStart: Date,
    excludeShiftId?: string
  ): Promise<ValidationIssue | null> {
    // Find the most recent shift ending before this one starts
    const lookbackStart = new Date(newShiftStart);
    lookbackStart.setHours(lookbackStart.getHours() - 24); // Look back 24 hours

    const conditions = [
      eq(shifts.organization_id, organizationId),
      eq(shifts.user_id, userId),
      lte(shifts.end_time, newShiftStart),
      gte(shifts.end_time, lookbackStart),
    ];

    if (excludeShiftId) {
      conditions.push(ne(shifts.id, excludeShiftId));
    }

    const recentShifts = await db
      .select({ end_time: shifts.end_time })
      .from(shifts)
      .where(and(...conditions))
      .orderBy(shifts.end_time)
      .limit(1);

    if (recentShifts.length === 0) {
      return null; // No recent shifts
    }

    const lastShiftEnd = recentShifts[0]!.end_time;
    const restHours = calculateHours(lastShiftEnd, newShiftStart);

    if (restHours < MIN_REST_HOURS_BETWEEN_SHIFTS) {
      return {
        rule: 'rest_period',
        message: `Only ${restHours.toFixed(1)}h rest since last shift (${MIN_REST_HOURS_BETWEEN_SHIFTS}h required)`,
        severity: 'critical',
        ruleReference: 'Estatuto Art. 34.3',
      };
    }

    return null;
  }

  /**
   * Check weekly hours limit
   */
  private async checkWeeklyHours(
    organizationId: string,
    userId: string,
    shiftDate: Date,
    newShiftHours: number,
    excludeShiftId?: string
  ): Promise<{ violation?: ValidationIssue; warning?: ValidationIssue }> {
    const weekStart = getStartOfWeek(shiftDate);
    const weekEnd = getEndOfWeek(shiftDate);

    const conditions = [
      eq(shifts.organization_id, organizationId),
      eq(shifts.user_id, userId),
      gte(shifts.start_time, weekStart),
      lte(shifts.start_time, weekEnd),
    ];

    if (excludeShiftId) {
      conditions.push(ne(shifts.id, excludeShiftId));
    }

    const weekShifts = await db
      .select({
        start_time: shifts.start_time,
        end_time: shifts.end_time,
        break_minutes: shifts.break_minutes,
      })
      .from(shifts)
      .where(and(...conditions));

    // Calculate current weekly hours
    let currentWeeklyHours = 0;
    for (const shift of weekShifts) {
      currentWeeklyHours += calculateHours(
        shift.start_time,
        shift.end_time,
        shift.break_minutes || 0
      );
    }

    const projectedTotal = currentWeeklyHours + newShiftHours;

    // Check absolute maximum
    if (projectedTotal > MAX_WEEKLY_HOURS_ABSOLUTE) {
      return {
        violation: {
          rule: 'weekly_absolute_max',
          message: `This shift would bring weekly total to ${projectedTotal.toFixed(1)}h (${MAX_WEEKLY_HOURS_ABSOLUTE}h absolute max)`,
          severity: 'critical',
          ruleReference: 'Estatuto Art. 34.1',
        },
      };
    }

    // Check regular limit (40h)
    if (projectedTotal > MAX_WEEKLY_HOURS_REGULAR) {
      return {
        violation: {
          rule: 'weekly_limit',
          message: `This shift would bring weekly total to ${projectedTotal.toFixed(1)}h (${MAX_WEEKLY_HOURS_REGULAR}h regular max)`,
          severity: 'high',
          ruleReference: 'Estatuto Art. 34.1',
        },
      };
    }

    // Warning if approaching limit
    if (projectedTotal >= WARNING_WEEKLY_HOURS_THRESHOLD) {
      return {
        warning: {
          rule: 'approaching_overtime',
          message: `User will have ${projectedTotal.toFixed(1)}h after this shift (approaching ${MAX_WEEKLY_HOURS_REGULAR}h limit)`,
          severity: 'low',
        },
      };
    }

    return {};
  }

  /**
   * Get organization-specific compliance settings
   */
  private async getOrganizationSettings(organizationId: string) {
    const [settings] = await db
      .select()
      .from(organization_settings)
      .where(eq(organization_settings.organization_id, organizationId))
      .limit(1);

    return settings;
  }

  /**
   * Get user's weekly hours summary
   */
  async getUserWeeklyHours(
    organizationId: string,
    userId: string,
    weekDate: Date
  ): Promise<UserWeeklyHours> {
    const weekStart = getStartOfWeek(weekDate);
    const weekEnd = getEndOfWeek(weekDate);

    const weekShifts = await db
      .select({
        start_time: shifts.start_time,
        end_time: shifts.end_time,
        break_minutes: shifts.break_minutes,
      })
      .from(shifts)
      .where(
        and(
          eq(shifts.organization_id, organizationId),
          eq(shifts.user_id, userId),
          gte(shifts.start_time, weekStart),
          lte(shifts.start_time, weekEnd)
        )
      );

    let totalHours = 0;
    for (const shift of weekShifts) {
      totalHours += calculateHours(
        shift.start_time,
        shift.end_time,
        shift.break_minutes || 0
      );
    }

    return {
      userId,
      weekStart,
      totalHours,
      shiftCount: weekShifts.length,
    };
  }

  /**
   * Validate entire roster for a week before publishing
   */
  async validateRosterForPublish(
    organizationId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<RosterValidationResult> {
    const violations: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Get all draft shifts for the week
    const draftShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.organization_id, organizationId),
          eq(shifts.status, 'draft'),
          gte(shifts.start_time, weekStart),
          lte(shifts.start_time, weekEnd)
        )
      );

    // Group shifts by user
    const shiftsByUser = new Map<string, typeof draftShifts>();
    for (const shift of draftShifts) {
      if (!shift.user_id) continue;
      
      const userShifts = shiftsByUser.get(shift.user_id) || [];
      userShifts.push(shift);
      shiftsByUser.set(shift.user_id, userShifts);
    }

    // Validate each user's shifts
    for (const [userId, userShifts] of shiftsByUser) {
      // Calculate total hours
      let totalHours = 0;
      for (const shift of userShifts) {
        totalHours += calculateHours(
          shift.start_time,
          shift.end_time,
          shift.break_minutes || 0
        );
      }

      // Check weekly limit
      if (totalHours > MAX_WEEKLY_HOURS_ABSOLUTE) {
        violations.push({
          rule: 'weekly_absolute_max',
          message: `User ${userId} has ${totalHours.toFixed(1)}h scheduled (${MAX_WEEKLY_HOURS_ABSOLUTE}h max)`,
          severity: 'critical',
          ruleReference: 'Estatuto Art. 34.1',
        });
      } else if (totalHours > MAX_WEEKLY_HOURS_REGULAR) {
        warnings.push({
          rule: 'weekly_overtime',
          message: `User ${userId} has ${totalHours.toFixed(1)}h scheduled (overtime)`,
          severity: 'medium',
          ruleReference: 'Estatuto Art. 34.1',
        });
      }

      // Check rest periods between shifts
      const sortedShifts = [...userShifts].sort(
        (a, b) => a.start_time.getTime() - b.start_time.getTime()
      );

      for (let i = 0; i < sortedShifts.length - 1; i++) {
        const current = sortedShifts[i]!;
        const next = sortedShifts[i + 1]!;
        const restHours = calculateHours(current.end_time, next.start_time);

        if (restHours < MIN_REST_HOURS_BETWEEN_SHIFTS) {
          violations.push({
            rule: 'rest_period',
            message: `User ${userId} has only ${restHours.toFixed(1)}h rest between shifts`,
            severity: 'critical',
            ruleReference: 'Estatuto Art. 34.3',
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
    };
  }
}

// Export singleton instance
export const rosterValidator = new RosterValidator();

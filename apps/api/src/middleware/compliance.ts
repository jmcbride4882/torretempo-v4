import { Request, Response, NextFunction } from 'express';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shifts } from '../db/schema.js';
import logger from '../lib/logger.js';

interface ComplianceViolation {
  type: '12h_rest' | 'weekly_limit' | 'daily_limit';
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Spanish labor law compliance constants
 */
const COMPLIANCE_RULES = {
  MIN_REST_HOURS: 12, // Minimum 12 hours rest between shifts
  MAX_DAILY_HOURS: 9, // Maximum 9 hours per day (standard)
  MAX_WEEKLY_HOURS: 40, // Maximum 40 hours per week (standard)
  MAX_WEEKLY_HOURS_AVERAGED: 48, // Max 48 hours averaged over 4 weeks
};

/**
 * Calculate hours between two timestamps
 */
function getHoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Check if new shift violates 12-hour rest rule
 */
async function check12HourRest(
  userId: string,
  organizationId: string,
  newShiftStart: Date,
  newShiftEnd: Date,
  excludeShiftId?: string
): Promise<ComplianceViolation | null> {
  // Find shifts within 12 hours before and after the new shift
  const twelveHoursBefore = new Date(newShiftStart.getTime() - 12 * 60 * 60 * 1000);
  const twelveHoursAfter = new Date(newShiftEnd.getTime() + 12 * 60 * 60 * 1000);

  const conditions: any[] = [
    eq(shifts.user_id, userId),
    eq(shifts.organization_id, organizationId),
    gte(shifts.start_time, twelveHoursBefore),
    lte(shifts.start_time, twelveHoursAfter),
  ];

  if (excludeShiftId) {
    conditions.push(sql`${shifts.id} != ${excludeShiftId}`);
  }

  const nearbyShifts = await db
    .select()
    .from(shifts)
    .where(and(...conditions))
    .orderBy(shifts.start_time);

  for (const existingShift of nearbyShifts) {
    // Check rest time before new shift
    const restBefore = getHoursBetween(existingShift.end_time, newShiftStart);
    if (restBefore >= 0 && restBefore < COMPLIANCE_RULES.MIN_REST_HOURS) {
      return {
        type: '12h_rest',
        message: `Insufficient rest period: Only ${restBefore.toFixed(1)} hours between shifts (minimum 12 hours required)`,
        severity: 'error',
      };
    }

    // Check rest time after new shift
    const restAfter = getHoursBetween(newShiftEnd, existingShift.start_time);
    if (restAfter >= 0 && restAfter < COMPLIANCE_RULES.MIN_REST_HOURS) {
      return {
        type: '12h_rest',
        message: `Insufficient rest period: Only ${restAfter.toFixed(1)} hours between shifts (minimum 12 hours required)`,
        severity: 'error',
      };
    }
  }

  return null;
}

/**
 * Check if new shift exceeds daily hour limits
 */
async function checkDailyHours(
  userId: string,
  organizationId: string,
  newShiftStart: Date,
  newShiftEnd: Date,
  breakMinutes: number,
  excludeShiftId?: string
): Promise<ComplianceViolation | null> {
  // Get start and end of the day for the new shift
  const dayStart = new Date(newShiftStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(newShiftStart);
  dayEnd.setHours(23, 59, 59, 999);

  const conditions: any[] = [
    eq(shifts.user_id, userId),
    eq(shifts.organization_id, organizationId),
    gte(shifts.start_time, dayStart),
    lte(shifts.start_time, dayEnd),
  ];

  if (excludeShiftId) {
    conditions.push(sql`${shifts.id} != ${excludeShiftId}`);
  }

  const dayShifts = await db
    .select()
    .from(shifts)
    .where(and(...conditions));

  // Calculate total hours for the day
  let totalHours = 0;
  for (const shift of dayShifts) {
    const shiftHours = getHoursBetween(shift.start_time, shift.end_time);
    const shiftBreakHours = (shift.break_minutes || 0) / 60;
    totalHours += shiftHours - shiftBreakHours;
  }

  // Add new shift hours
  const newShiftHours = getHoursBetween(newShiftStart, newShiftEnd);
  const newShiftBreakHours = breakMinutes / 60;
  totalHours += newShiftHours - newShiftBreakHours;

  if (totalHours > COMPLIANCE_RULES.MAX_DAILY_HOURS) {
    return {
      type: 'daily_limit',
      message: `Daily hour limit exceeded: ${totalHours.toFixed(1)} hours (maximum 9 hours per day)`,
      severity: 'warning',
    };
  }

  return null;
}

/**
 * Check if new shift exceeds weekly hour limits
 */
async function checkWeeklyHours(
  userId: string,
  organizationId: string,
  newShiftStart: Date,
  newShiftEnd: Date,
  breakMinutes: number,
  excludeShiftId?: string
): Promise<ComplianceViolation | null> {
  // Get start and end of the week (Monday to Sunday)
  const weekStart = new Date(newShiftStart);
  const dayOfWeek = weekStart.getDay();
  const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const conditions: any[] = [
    eq(shifts.user_id, userId),
    eq(shifts.organization_id, organizationId),
    gte(shifts.start_time, weekStart),
    lte(shifts.start_time, weekEnd),
  ];

  if (excludeShiftId) {
    conditions.push(sql`${shifts.id} != ${excludeShiftId}`);
  }

  const weekShifts = await db
    .select()
    .from(shifts)
    .where(and(...conditions));

  // Calculate total hours for the week
  let totalHours = 0;
  for (const shift of weekShifts) {
    const shiftHours = getHoursBetween(shift.start_time, shift.end_time);
    const shiftBreakHours = (shift.break_minutes || 0) / 60;
    totalHours += shiftHours - shiftBreakHours;
  }

  // Add new shift hours
  const newShiftHours = getHoursBetween(newShiftStart, newShiftEnd);
  const newShiftBreakHours = breakMinutes / 60;
  totalHours += newShiftHours - newShiftBreakHours;

  if (totalHours > COMPLIANCE_RULES.MAX_WEEKLY_HOURS) {
    return {
      type: 'weekly_limit',
      message: `Weekly hour limit exceeded: ${totalHours.toFixed(1)} hours (maximum 40 hours per week)`,
      severity: 'warning',
    };
  }

  return null;
}

/**
 * Validate shift compliance
 * Returns array of violations (empty if compliant)
 */
export async function validateShiftCompliance(
  userId: string,
  organizationId: string,
  startTime: Date,
  endTime: Date,
  breakMinutes: number = 0,
  excludeShiftId?: string
): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = [];

  // Check 12-hour rest
  const restViolation = await check12HourRest(
    userId,
    organizationId,
    startTime,
    endTime,
    excludeShiftId
  );
  if (restViolation) violations.push(restViolation);

  // Check daily hours
  const dailyViolation = await checkDailyHours(
    userId,
    organizationId,
    startTime,
    endTime,
    breakMinutes,
    excludeShiftId
  );
  if (dailyViolation) violations.push(dailyViolation);

  // Check weekly hours
  const weeklyViolation = await checkWeeklyHours(
    userId,
    organizationId,
    startTime,
    endTime,
    breakMinutes,
    excludeShiftId
  );
  if (weeklyViolation) violations.push(weeklyViolation);

  return violations;
}

/**
 * Middleware to check compliance before creating/updating shifts
 */
export async function checkComplianceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_id, start_time, end_time, break_minutes } = req.body;
    const organizationId = req.organizationId!;
    const shiftId = req.params.id as string | undefined; // Will be undefined for POST (create)

    // Only check compliance if user is assigned
    if (!user_id) {
      return next();
    }

    const violations = await validateShiftCompliance(
      user_id,
      organizationId,
      new Date(start_time),
      new Date(end_time),
      break_minutes || 0,
      shiftId
    );

    // Check for error-level violations
    const errors = violations.filter((v) => v.severity === 'error');
    if (errors.length > 0) {
      res.status(400).json({
        error: 'Compliance violation',
        violations: errors,
      });
      return;
    }

    // Attach warnings to request for logging
    if (violations.length > 0) {
      (req as any).complianceWarnings = violations;
    }

    next();
  } catch (error) {
    logger.error('Error checking compliance:', error);
    res.status(500).json({ error: 'Failed to validate compliance' });
  }
}

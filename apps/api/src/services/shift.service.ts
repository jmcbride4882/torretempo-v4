import { eq, ne, and, gte, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shifts } from '../db/schema.js';
import logger from '../lib/logger.js';

interface ShiftConflict {
  conflictType: 'overlap' | 'double_booking';
  conflictingShift: any;
  message: string;
}

/**
 * Check if a user has conflicting shifts when assigning to a new shift
 */
export async function checkShiftConflicts(
  userId: string,
  organizationId: string,
  startTime: Date,
  endTime: Date,
  excludeShiftId?: string
): Promise<ShiftConflict | null> {
  // Find overlapping shifts for this user
  const conditions = [
    eq(shifts.user_id, userId),
    eq(shifts.organization_id, organizationId),
    or(
      // New shift starts during existing shift
      and(gte(shifts.start_time, startTime), lte(shifts.start_time, endTime)),
      // New shift ends during existing shift
      and(gte(shifts.end_time, startTime), lte(shifts.end_time, endTime)),
      // New shift completely contains existing shift
      and(lte(shifts.start_time, startTime), gte(shifts.end_time, endTime))
    ),
  ];

  // Exclude the shift being updated
  if (excludeShiftId) {
    conditions.push(ne(shifts.id, excludeShiftId));
  }

  const conflicting = await db
    .select()
    .from(shifts)
    .where(and(...conditions))
    .limit(1);

  if (conflicting.length > 0) {
    return {
      conflictType: 'overlap',
      conflictingShift: conflicting[0],
      message: `User already has a shift from ${conflicting[0]!.start_time.toISOString()} to ${conflicting[0]!.end_time.toISOString()}`,
    };
  }

  return null;
}

/**
 * Assign a user to a shift with conflict validation
 */
export async function assignUserToShift(
  shiftId: string,
  userId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string; conflict?: ShiftConflict }> {
  try {
    // Fetch the shift
    const shiftResult = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.organization_id, organizationId)))
      .limit(1);

    if (shiftResult.length === 0) {
      return { success: false, error: 'Shift not found' };
    }

    const shift = shiftResult[0]!;

    // Check for conflicts
    const conflict = await checkShiftConflicts(
      userId,
      organizationId,
      shift.start_time,
      shift.end_time,
      shiftId
    );

    if (conflict) {
      return { success: false, error: conflict.message, conflict };
    }

    // Assign user to shift
    await db
      .update(shifts)
      .set({ user_id: userId, updated_at: new Date() })
      .where(and(eq(shifts.id, shiftId), eq(shifts.organization_id, organizationId)));

    return { success: true };
  } catch (error) {
    logger.error('Error assigning user to shift:', error);
    return { success: false, error: 'Failed to assign user to shift' };
  }
}

/**
 * Unassign a user from a shift
 */
export async function unassignUserFromShift(
  shiftId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db
      .update(shifts)
      .set({ user_id: null, updated_at: new Date() })
      .where(and(eq(shifts.id, shiftId), eq(shifts.organization_id, organizationId)))
      .returning();

    if (result.length === 0) {
      return { success: false, error: 'Shift not found' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error unassigning user from shift:', error);
    return { success: false, error: 'Failed to unassign user from shift' };
  }
}

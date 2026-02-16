/**
 * Roster Management Routes
 * 
 * Handles roster validation, publishing, and duplication.
 * All routes require manager+ role.
 */

import { Router, Request, Response } from 'express';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { shifts, notifications } from '../../db/schema.js';
import { rosterValidator } from '../../services/roster-validator.js';
import { autoSchedule } from '../../services/auto-scheduler.js';
import { logAudit } from '../../services/audit.service.js';
import logger from '../../lib/logger.js';

const router = Router();

/**
 * Helper: Get authenticated user from request
 */
function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ message: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}

/**
 * Helper: Check if user has manager+ role
 */
function requireManager(actor: { role: string }, res: Response): boolean {
  if (!['manager', 'tenantAdmin', 'owner'].includes(actor.role)) {
    res.status(403).json({ message: 'Forbidden: Manager role required' });
    return false;
  }
  return true;
}

// ============================================================================
// POST /api/v1/org/:slug/roster/validate
// Validate a proposed shift assignment
// ============================================================================
async function handleValidateShift(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) return;
    if (!requireManager(actor, res)) return;

    const organizationId = req.organizationId!;
    const { userId, shiftData, excludeShiftId } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    if (!shiftData || !shiftData.start || !shiftData.end) {
      return res.status(400).json({ message: 'shiftData with start and end is required' });
    }

    // Run validation
    const result = await rosterValidator.validateShiftAssignment(
      organizationId,
      userId,
      {
        start: new Date(shiftData.start),
        end: new Date(shiftData.end),
        locationId: shiftData.locationId,
        breakMinutes: shiftData.breakMinutes || 0,
      },
      excludeShiftId
    );

    res.json(result);
  } catch (error) {
    logger.error('Error validating shift:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ============================================================================
// POST /api/v1/org/:slug/roster/publish
// Publish all draft shifts for a week
// ============================================================================
async function handlePublishRoster(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) return;
    if (!requireManager(actor, res)) return;

    const organizationId = req.organizationId!;
    const { weekStart, weekEnd } = req.body;

    // Validate required fields
    if (!weekStart || !weekEnd) {
      return res.status(400).json({ message: 'weekStart and weekEnd are required' });
    }

    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);

    // 1. Validate entire roster before publishing
    const validation = await rosterValidator.validateRosterForPublish(
      organizationId,
      startDate,
      endDate
    );

    if (!validation.valid) {
      return res.status(400).json({
        message: 'Roster has compliance violations that must be resolved before publishing',
        violations: validation.violations,
        warnings: validation.warnings,
      });
    }

    // 2. Get all draft shifts for the week
    const draftShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.organization_id, organizationId),
          eq(shifts.status, 'draft'),
          gte(shifts.start_time, startDate),
          lte(shifts.start_time, endDate)
        )
      );

    if (draftShifts.length === 0) {
      return res.status(400).json({ message: 'No draft shifts found for the specified week' });
    }

    // 3. Publish shifts and create notifications (transaction)
    const now = new Date();
    const notifiedUsers = new Set<string>();

    await db.transaction(async (tx) => {
      // Update all draft shifts to published
      for (const shift of draftShifts) {
        await tx
          .update(shifts)
          .set({
            status: 'published',
            is_published: true,
            published_at: now,
            updated_at: now,
          })
          .where(eq(shifts.id, shift.id));

        // Track users to notify
        if (shift.user_id) {
          notifiedUsers.add(shift.user_id);
        }
      }

      // Create notifications for each scheduled employee
      for (const userId of notifiedUsers) {
        await tx.insert(notifications).values({
          organization_id: organizationId,
          user_id: userId,
          type: 'roster_published',
          title: 'New Schedule Available',
          message: `Your schedule for the week of ${startDate.toLocaleDateString('es-ES')} has been published.`,
          link: `/roster?week=${weekStart}`,
        });
      }

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'publish',
        entityType: 'roster',
        newData: {
          weekStart,
          weekEnd,
          shiftsPublished: draftShifts.length,
          employeesNotified: notifiedUsers.size,
        },
      });
    });

    res.json({
      message: 'Roster published successfully',
      shiftsPublished: draftShifts.length,
      employeesNotified: notifiedUsers.size,
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    });
  } catch (error) {
    logger.error('Error publishing roster:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ============================================================================
// POST /api/v1/org/:slug/roster/duplicate
// Duplicate shifts from one week to another
// ============================================================================
async function handleDuplicateRoster(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) return;
    if (!requireManager(actor, res)) return;

    const organizationId = req.organizationId!;
    const { sourceWeekStart, targetWeekStart } = req.body;

    // Validate required fields
    if (!sourceWeekStart || !targetWeekStart) {
      return res.status(400).json({ message: 'sourceWeekStart and targetWeekStart are required' });
    }

    const sourceStart = new Date(sourceWeekStart);
    const sourceEnd = new Date(sourceStart);
    sourceEnd.setDate(sourceEnd.getDate() + 6);
    sourceEnd.setHours(23, 59, 59, 999);

    const targetStart = new Date(targetWeekStart);
    const daysDiff = Math.round((targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Get all shifts from source week
    const sourceShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.organization_id, organizationId),
          gte(shifts.start_time, sourceStart),
          lte(shifts.start_time, sourceEnd)
        )
      );

    if (sourceShifts.length === 0) {
      return res.status(400).json({ message: 'No shifts found in source week' });
    }

    // 2. Create new shifts for target week
    const created: string[] = [];
    const skipped: Array<{ shiftId: string; reason: string }> = [];
    const warnings: Array<{ shiftId: string; message: string }> = [];

    await db.transaction(async (tx) => {
      for (const sourceShift of sourceShifts) {
        // Calculate new dates
        const newStartTime = new Date(sourceShift.start_time);
        newStartTime.setDate(newStartTime.getDate() + daysDiff);

        const newEndTime = new Date(sourceShift.end_time);
        newEndTime.setDate(newEndTime.getDate() + daysDiff);

        // Validate the new shift if it has a user assigned
        if (sourceShift.user_id) {
          const validation = await rosterValidator.validateShiftAssignment(
            organizationId,
            sourceShift.user_id,
            {
              start: newStartTime,
              end: newEndTime,
              locationId: sourceShift.location_id,
              breakMinutes: sourceShift.break_minutes || 0,
            }
          );

          if (!validation.valid) {
            skipped.push({
              shiftId: sourceShift.id,
              reason: validation.violations[0]?.message || 'Validation failed',
            });
            continue;
          }

          if (validation.warnings.length > 0) {
            warnings.push({
              shiftId: sourceShift.id,
              message: validation.warnings[0]?.message || 'Warning',
            });
          }
        }

        // Create the new shift
        const [newShift] = await tx
          .insert(shifts)
          .values({
            organization_id: organizationId,
            user_id: sourceShift.user_id,
            location_id: sourceShift.location_id,
            template_id: sourceShift.template_id,
            start_time: newStartTime,
            end_time: newEndTime,
            break_minutes: sourceShift.break_minutes,
            status: 'draft',
            is_published: false,
            notes: sourceShift.notes,
            color: sourceShift.color,
            required_skill_id: sourceShift.required_skill_id,
            created_by: actor.id,
          })
          .returning({ id: shifts.id });

        if (newShift) {
          created.push(newShift.id);
        }
      }

      // Log audit
      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'duplicate',
        entityType: 'roster',
        newData: {
          sourceWeekStart,
          targetWeekStart,
          created: created.length,
          skipped: skipped.length,
        },
      });
    });

    res.json({
      message: 'Roster duplicated successfully',
      created: created.length,
      skipped: skipped.length,
      warnings: warnings.length,
      details: {
        skipped: skipped.length > 0 ? skipped : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    logger.error('Error duplicating roster:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ============================================================================
// GET /api/v1/org/:slug/roster/user-hours
// Get user's weekly hours summary
// ============================================================================
async function handleGetUserHours(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) return;
    if (!requireManager(actor, res)) return;

    const organizationId = req.organizationId!;
    const { userId, weekDate } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId query parameter is required' });
    }

    const date = weekDate ? new Date(weekDate as string) : new Date();

    const hours = await rosterValidator.getUserWeeklyHours(
      organizationId,
      userId as string,
      date
    );

    res.json(hours);
  } catch (error) {
    logger.error('Error getting user hours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ============================================================================
// POST /api/v1/org/:slug/roster/auto-schedule
// Auto-generate shift assignments for a week
// ============================================================================
async function handleAutoSchedule(req: Request, res: Response) {
  try {
    const actor = getActor(req, res);
    if (!actor) return;
    if (!requireManager(actor, res)) return;

    const organizationId = req.organizationId!;
    const { weekStart, locationIds, respectAvailability = true, maxHoursPerEmployee } = req.body;

    if (!weekStart) {
      return res.status(400).json({ message: 'weekStart is required (ISO date string for Monday)' });
    }

    const result = await autoSchedule({
      organizationId,
      weekStart: new Date(weekStart),
      locationIds,
      respectAvailability,
      maxHoursPerEmployee,
    });

    await logAudit({
      orgId: organizationId,
      actorId: actor.id,
      action: 'auto_schedule',
      entityType: 'roster',
      newData: {
        weekStart,
        created: result.created,
        skipped: result.skipped,
        unfilled: result.unfilledSlots.length,
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error auto-scheduling:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Register routes
router.post('/validate', handleValidateShift);
router.post('/publish', handlePublishRoster);
router.post('/duplicate', handleDuplicateRoster);
router.post('/auto-schedule', handleAutoSchedule);
router.get('/user-hours', handleGetUserHours);

export default router;

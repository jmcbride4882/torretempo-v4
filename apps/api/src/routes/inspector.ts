/**
 * Inspector API Routes (T13)
 * Read-only GET endpoints for Spanish ITSS labor inspectors
 * 
 * All routes protected by inspectorAuth middleware
 * RLS automatically filters by organization_id
 * All access logged to admin_audit_log
 */

import { Router, Request, Response } from 'express';
import { and, eq, gte, lte, desc, asc, SQL } from 'drizzle-orm';

import { db } from '../db/index.js';
import {
  time_entries,
  shifts,
  audit_log,
  monthly_summaries,
  break_entries,
  correction_requests,
  member,
  user,
  locations,
} from '../db/schema.js';
import logger from '../lib/logger.js';
import { inspectorAuth } from '../middleware/inspectorAuth.js';

const router = Router();

// Apply inspector authentication to all routes
router.use(inspectorAuth);

/**
 * GET /api/inspector/v1/time-entries
 * List time entries with optional filters
 * 
 * Query params:
 * - user_id: Filter by user ID
 * - date_from: Filter by entry_date >= date_from (ISO 8601)
 * - date_to: Filter by entry_date <= date_to (ISO 8601)
 * - status: Filter by status (active, completed, disputed)
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/time-entries', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const userId = req.query.user_id as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Build conditions
    const conditions: SQL[] = [eq(time_entries.organization_id, organizationId)];

    if (userId) {
      conditions.push(eq(time_entries.user_id, userId));
    }
    if (dateFrom) {
      conditions.push(gte(time_entries.entry_date, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(time_entries.entry_date, new Date(dateTo)));
    }
    if (status) {
      conditions.push(eq(time_entries.status, status));
    }

    // Execute query with joins to get user name and location name
    const result = await db
      .select({
        id: time_entries.id,
        organization_id: time_entries.organization_id,
        user_id: time_entries.user_id,
        user_name: user.name,
        linked_shift_id: time_entries.linked_shift_id,
        entry_date: time_entries.entry_date,
        clock_in: time_entries.clock_in,
        clock_in_location: time_entries.clock_in_location,
        clock_in_method: time_entries.clock_in_method,
        clock_out: time_entries.clock_out,
        clock_out_location: time_entries.clock_out_location,
        clock_out_method: time_entries.clock_out_method,
        break_minutes: time_entries.break_minutes,
        total_minutes: time_entries.total_minutes,
        is_verified: time_entries.is_verified,
        status: time_entries.status,
        notes: time_entries.notes,
        created_at: time_entries.created_at,
        updated_at: time_entries.updated_at,
      })
      .from(time_entries)
      .leftJoin(user, eq(time_entries.user_id, user.id))
      .where(and(...conditions))
      .orderBy(desc(time_entries.entry_date), desc(time_entries.clock_in))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

/**
 * GET /api/inspector/v1/shifts
 * List shifts with optional filters
 * 
 * Query params:
 * - user_id: Filter by assigned user ID
 * - start_from: Filter by start_time >= start_from (ISO 8601)
 * - start_to: Filter by start_time <= start_to (ISO 8601)
 * - status: Filter by status (draft, published, completed, cancelled)
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/shifts', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const userId = req.query.user_id as string | undefined;
    const startFrom = req.query.start_from as string | undefined;
    const startTo = req.query.start_to as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Build conditions
    const conditions: SQL[] = [eq(shifts.organization_id, organizationId)];

    if (userId) {
      conditions.push(eq(shifts.user_id, userId));
    }
    if (startFrom) {
      conditions.push(gte(shifts.start_time, new Date(startFrom)));
    }
    if (startTo) {
      conditions.push(lte(shifts.start_time, new Date(startTo)));
    }
    if (status) {
      conditions.push(eq(shifts.status, status));
    }

    // Execute query with joins to get user name and location name
    const result = await db
      .select({
        id: shifts.id,
        organization_id: shifts.organization_id,
        user_id: shifts.user_id,
        user_name: user.name,
        location_id: shifts.location_id,
        location_name: locations.name,
        start_time: shifts.start_time,
        end_time: shifts.end_time,
        break_minutes: shifts.break_minutes,
        status: shifts.status,
        notes: shifts.notes,
        color: shifts.color,
        required_skill_id: shifts.required_skill_id,
        created_by: shifts.created_by,
        published_at: shifts.published_at,
        acknowledged_at: shifts.acknowledged_at,
        created_at: shifts.created_at,
        updated_at: shifts.updated_at,
      })
      .from(shifts)
      .leftJoin(user, eq(shifts.user_id, user.id))
      .leftJoin(locations, eq(shifts.location_id, locations.id))
      .where(and(...conditions))
      .orderBy(desc(shifts.start_time))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

/**
 * GET /api/inspector/v1/audit-log
 * List audit log entries with optional filters
 * 
 * Query params:
 * - entity_type: Filter by entity type (shifts, time_entries, etc.)
 * - entity_id: Filter by specific entity ID
 * - actor_id: Filter by actor (user who performed action)
 * - action: Filter by action type
 * - created_from: Filter by created_at >= created_from (ISO 8601)
 * - created_to: Filter by created_at <= created_to (ISO 8601)
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const entityType = req.query.entity_type as string | undefined;
    const entityId = req.query.entity_id as string | undefined;
    const actorId = req.query.actor_id as string | undefined;
    const action = req.query.action as string | undefined;
    const createdFrom = req.query.created_from as string | undefined;
    const createdTo = req.query.created_to as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Build conditions
    const conditions: SQL[] = [eq(audit_log.organization_id, organizationId)];

    if (entityType) {
      conditions.push(eq(audit_log.entity_type, entityType));
    }
    if (entityId) {
      conditions.push(eq(audit_log.entity_id, entityId));
    }
    if (actorId) {
      conditions.push(eq(audit_log.actor_id, actorId));
    }
    if (action) {
      conditions.push(eq(audit_log.action, action));
    }
    if (createdFrom) {
      conditions.push(gte(audit_log.created_at, new Date(createdFrom)));
    }
    if (createdTo) {
      conditions.push(lte(audit_log.created_at, new Date(createdTo)));
    }

    // Execute query
    const result = await db
      .select({
        id: audit_log.id,
        organization_id: audit_log.organization_id,
        actor_id: audit_log.actor_id,
        action: audit_log.action,
        entity_type: audit_log.entity_type,
        entity_id: audit_log.entity_id,
        old_data: audit_log.old_data,
        new_data: audit_log.new_data,
        ip_address: audit_log.ip_address,
        user_agent: audit_log.user_agent,
        prev_hash: audit_log.prev_hash,
        entry_hash: audit_log.entry_hash,
        created_at: audit_log.created_at,
      })
      .from(audit_log)
      .where(and(...conditions))
      .orderBy(desc(audit_log.created_at))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/inspector/v1/monthly-summaries
 * List monthly summaries with optional filters
 * 
 * Query params:
 * - user_id: Filter by user ID
 * - year: Filter by year (e.g., 2024)
 * - month: Filter by month (1-12)
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/monthly-summaries', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const userId = req.query.user_id as string | undefined;
    const year = req.query.year as string | undefined;
    const month = req.query.month as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Build conditions
    const conditions: SQL[] = [eq(monthly_summaries.organization_id, organizationId)];

    if (userId) {
      conditions.push(eq(monthly_summaries.user_id, userId));
    }
    if (year) {
      conditions.push(eq(monthly_summaries.year, parseInt(year, 10)));
    }
    if (month) {
      conditions.push(eq(monthly_summaries.month, parseInt(month, 10)));
    }

    // Execute query with join to get user name
    const result = await db
      .select({
        id: monthly_summaries.id,
        organization_id: monthly_summaries.organization_id,
        user_id: monthly_summaries.user_id,
        user_name: user.name,
        year: monthly_summaries.year,
        month: monthly_summaries.month,
        total_hours: monthly_summaries.total_hours,
        total_days: monthly_summaries.total_days,
        overtime_hours: monthly_summaries.overtime_hours,
        pdf_url: monthly_summaries.pdf_url,
        generated_at: monthly_summaries.generated_at,
        delivered_at: monthly_summaries.delivered_at,
        delivery_method: monthly_summaries.delivery_method,
        created_at: monthly_summaries.created_at,
      })
      .from(monthly_summaries)
      .leftJoin(user, eq(monthly_summaries.user_id, user.id))
      .where(and(...conditions))
      .orderBy(desc(monthly_summaries.year), desc(monthly_summaries.month))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching monthly summaries:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summaries' });
  }
});

/**
 * GET /api/inspector/v1/break-entries
 * List break entries with optional filters
 * 
 * Query params:
 * - time_entry_id: Filter by time entry ID
 * - break_start_from: Filter by break_start >= break_start_from (ISO 8601)
 * - break_start_to: Filter by break_start <= break_start_to (ISO 8601)
 * - break_type: Filter by break type (paid, unpaid)
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/break-entries', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const timeEntryId = req.query.time_entry_id as string | undefined;
    const breakStartFrom = req.query.break_start_from as string | undefined;
    const breakStartTo = req.query.break_start_to as string | undefined;
    const breakType = req.query.break_type as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Build conditions
    const conditions: SQL[] = [eq(break_entries.organization_id, organizationId)];

    if (timeEntryId) {
      conditions.push(eq(break_entries.time_entry_id, timeEntryId));
    }
    if (breakStartFrom) {
      conditions.push(gte(break_entries.break_start, new Date(breakStartFrom)));
    }
    if (breakStartTo) {
      conditions.push(lte(break_entries.break_start, new Date(breakStartTo)));
    }
    if (breakType) {
      conditions.push(eq(break_entries.break_type, breakType));
    }

    // Execute query with join to get associated time entry info
    const result = await db
      .select({
        id: break_entries.id,
        organization_id: break_entries.organization_id,
        time_entry_id: break_entries.time_entry_id,
        time_entry_date: time_entries.entry_date,
        time_entry_user_id: time_entries.user_id,
        break_start: break_entries.break_start,
        break_end: break_entries.break_end,
        break_type: break_entries.break_type,
        created_at: break_entries.created_at,
      })
      .from(break_entries)
      .leftJoin(time_entries, eq(break_entries.time_entry_id, time_entries.id))
      .where(and(...conditions))
      .orderBy(desc(break_entries.break_start))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching break entries:', error);
    res.status(500).json({ error: 'Failed to fetch break entries' });
  }
});

/**
 * GET /api/inspector/v1/correction-requests
 * List correction requests with optional filters
 * 
 * Query params:
 * - time_entry_id: Filter by time entry ID
 * - requester_id: Filter by requester (requested_by)
 * - status: Filter by status (pending, approved, rejected)
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/correction-requests', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const timeEntryId = req.query.time_entry_id as string | undefined;
    const requesterId = req.query.requester_id as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Build conditions
    const conditions: SQL[] = [eq(correction_requests.organization_id, organizationId)];

    if (timeEntryId) {
      conditions.push(eq(correction_requests.time_entry_id, timeEntryId));
    }
    if (requesterId) {
      conditions.push(eq(correction_requests.requested_by, requesterId));
    }
    if (status) {
      conditions.push(eq(correction_requests.status, status));
    }

    // Execute query with joins to get requester and reviewer names
    const result = await db
      .select({
        id: correction_requests.id,
        organization_id: correction_requests.organization_id,
        time_entry_id: correction_requests.time_entry_id,
        requested_by: correction_requests.requested_by,
        requester_name: user.name,
        reviewed_by: correction_requests.reviewed_by,
        original_data: correction_requests.original_data,
        requested_data: correction_requests.requested_data,
        reason: correction_requests.reason,
        status: correction_requests.status,
        reviewed_at: correction_requests.reviewed_at,
        created_at: correction_requests.created_at,
      })
      .from(correction_requests)
      .leftJoin(user, eq(correction_requests.requested_by, user.id))
      .where(and(...conditions))
      .orderBy(desc(correction_requests.created_at))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching correction requests:', error);
    res.status(500).json({ error: 'Failed to fetch correction requests' });
  }
});

/**
 * GET /api/inspector/v1/members
 * List organization members with optional filters
 * 
 * Query params:
 * - role: Filter by role (employee, manager, tenantAdmin, owner)
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/members', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const role = req.query.role as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Build conditions
    const conditions: SQL[] = [eq(member.organizationId, organizationId)];

    if (role) {
      conditions.push(eq(member.role, role));
    }

    // Execute query with join to get user details (exclude sensitive fields)
    const result = await db
      .select({
        member_id: member.id,
        user_id: member.userId,
        user_name: user.name,
        user_email: user.email,
        role: member.role,
        created_at: member.createdAt,
      })
      .from(member)
      .leftJoin(user, eq(member.userId, user.id))
      .where(and(...conditions))
      .orderBy(asc(user.name))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * GET /api/inspector/v1/locations
 * List organization locations
 * 
 * Query params:
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/locations', async (req: Request, res: Response) => {
  try {
    const organizationId = req.inspectorToken!.organization_id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Execute query
    const result = await db
      .select({
        id: locations.id,
        organization_id: locations.organization_id,
        name: locations.name,
        address: locations.address,
        latitude: locations.lat,
        longitude: locations.lng,
        geofence_radius: locations.geofence_radius,
        created_at: locations.created_at,
      })
      .from(locations)
      .where(eq(locations.organization_id, organizationId))
      .orderBy(asc(locations.name))
      .limit(limit)
      .offset(offset);

    res.json({
      data: result,
      total: result.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Inspector API - Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

export default router;

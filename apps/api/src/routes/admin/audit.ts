import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, desc, count, sql, like } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { admin_audit_log, user } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import type { AdminAuditLogEntry, AdminAuditLogQueryResult } from '../../types/admin-types.js';
import logger from '../../lib/logger.js';

/**
 * Admin Audit Log Routes
 * Platform admins can query and search admin_audit_log for compliance and monitoring
 * 
 * Security:
 * - Requires admin role
 * - Read-only operations (audit log is immutable)
 * - Supports filtering by date range, admin, action
 * - Pagination required (logs can be massive)
 */

const router = Router();

/**
 * GET /api/admin/audit
 * Query admin audit log with filters and pagination
 * 
 * Query params:
 * - limit: number (default 50, max 100) - Number of entries to return
 * - offset: number (default 0) - Pagination offset
 * - date_from: ISO date string (optional) - Filter entries from this date
 * - date_to: ISO date string (optional) - Filter entries to this date
 * - admin_id: string (optional) - Filter by admin user ID
 * - action: string (optional) - Filter by action (exact match or starts with)
 * - target_type: string (optional) - Filter by target type
 * - target_id: string (optional) - Filter by target ID
 * 
 * Returns:
 * - data: Array of audit log entries with admin details
 * - total: Total count matching filters
 * - limit: Requested limit
 * - offset: Requested offset
 * - pages: Total number of pages
 */
router.get(
  '/',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(
        parseInt(req.query.limit as string) || 50,
        100
      );
      const offset = parseInt(req.query.offset as string) || 0;
      const dateFrom = req.query.date_from as string | undefined;
      const dateTo = req.query.date_to as string | undefined;
      const adminId = req.query.admin_id as string | undefined;
      const actionFilter = req.query.action as string | undefined;
      const targetType = req.query.target_type as string | undefined;
      const targetId = req.query.target_id as string | undefined;

      // Build where conditions
      const conditions: any[] = [];

      // Date range filters
      if (dateFrom) {
        try {
          const fromDate = new Date(dateFrom);
          conditions.push(gte(admin_audit_log.created_at, fromDate));
        } catch (error) {
          return res.status(400).json({ 
            error: 'Invalid date_from format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
          });
        }
      }

      if (dateTo) {
        try {
          const toDate = new Date(dateTo);
          conditions.push(lte(admin_audit_log.created_at, toDate));
        } catch (error) {
          return res.status(400).json({ 
            error: 'Invalid date_to format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
          });
        }
      }

      // Admin filter
      if (adminId) {
        conditions.push(eq(admin_audit_log.admin_id, adminId));
      }

      // Action filter (supports exact match or starts-with pattern)
      if (actionFilter) {
        // If action contains wildcard (*), use LIKE
        if (actionFilter.includes('*')) {
          const likePattern = actionFilter.replace(/\*/g, '%');
          conditions.push(like(admin_audit_log.action, likePattern));
        } else {
          // Exact match
          conditions.push(eq(admin_audit_log.action, actionFilter));
        }
      }

      // Target type filter
      if (targetType) {
        conditions.push(eq(admin_audit_log.target_type, targetType));
      }

      // Target ID filter
      if (targetId) {
        conditions.push(eq(admin_audit_log.target_id, targetId));
      }

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(admin_audit_log)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count || 0;

      // Get audit entries with admin details (LEFT JOIN to user table)
      const entries = await db
        .select({
          id: admin_audit_log.id,
          adminId: admin_audit_log.admin_id,
          adminName: user.name,
          adminEmail: user.email,
          action: admin_audit_log.action,
          targetType: admin_audit_log.target_type,
          targetId: admin_audit_log.target_id,
          details: admin_audit_log.details,
          ipAddress: admin_audit_log.ip_address,
          createdAt: admin_audit_log.created_at,
        })
        .from(admin_audit_log)
        .leftJoin(user, eq(admin_audit_log.admin_id, user.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(admin_audit_log.created_at))
        .limit(limit)
        .offset(offset);

      // Map to AdminAuditLogEntry type
      const mappedEntries: AdminAuditLogEntry[] = entries.map(entry => ({
        id: entry.id,
        adminId: entry.adminId,
        adminName: entry.adminName || 'Unknown Admin',
        adminEmail: entry.adminEmail || 'unknown@unknown.com',
        action: entry.action,
        targetType: entry.targetType || null,
        targetId: entry.targetId || null,
        details: (entry.details as Record<string, unknown>) || null,
        ipAddress: entry.ipAddress?.toString() || null,
        createdAt: entry.createdAt,
      }));

      // Build response
      const response: AdminAuditLogQueryResult = {
        data: mappedEntries,
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      };

      res.json(response);
    } catch (error) {
      logger.error('Error querying audit log:', error);
      res.status(500).json({ 
        error: 'Failed to query audit log',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/audit/export
 * Export audit log entries matching filters as CSV
 * 
 * Query params:
 * - date_from: ISO date string (optional) - Filter entries from this date
 * - date_to: ISO date string (optional) - Filter entries to this date
 * - admin_id: string (optional) - Filter by admin user ID
 * - action: string (optional) - Filter by action
 * - target_type: string (optional) - Filter by target type
 * - target_id: string (optional) - Filter by target ID
 * 
 * Returns:
 * - CSV file with columns: id,action,actorEmail,targetType,targetId,createdAt
 */
router.get(
  '/export',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const dateFrom = req.query.date_from as string | undefined;
      const dateTo = req.query.date_to as string | undefined;
      const adminId = req.query.admin_id as string | undefined;
      const actionFilter = req.query.action as string | undefined;
      const targetType = req.query.target_type as string | undefined;
      const targetId = req.query.target_id as string | undefined;

      // Build where conditions
      const conditions: any[] = [];

      // Date range filters
      if (dateFrom) {
        try {
          const fromDate = new Date(dateFrom);
          conditions.push(gte(admin_audit_log.created_at, fromDate));
        } catch (error) {
          return res.status(400).json({ 
            error: 'Invalid date_from format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
          });
        }
      }

      if (dateTo) {
        try {
          const toDate = new Date(dateTo);
          conditions.push(lte(admin_audit_log.created_at, toDate));
        } catch (error) {
          return res.status(400).json({ 
            error: 'Invalid date_to format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
          });
        }
      }

      // Admin filter
      if (adminId) {
        conditions.push(eq(admin_audit_log.admin_id, adminId));
      }

      // Action filter (supports exact match or starts-with pattern)
      if (actionFilter) {
        // If action contains wildcard (*), use LIKE
        if (actionFilter.includes('*')) {
          const likePattern = actionFilter.replace(/\*/g, '%');
          conditions.push(like(admin_audit_log.action, likePattern));
        } else {
          // Exact match
          conditions.push(eq(admin_audit_log.action, actionFilter));
        }
      }

      // Target type filter
      if (targetType) {
        conditions.push(eq(admin_audit_log.target_type, targetType));
      }

      // Target ID filter
      if (targetId) {
        conditions.push(eq(admin_audit_log.target_id, targetId));
      }

      // Get audit entries with admin details (no pagination)
      const entries = await db
        .select({
          id: admin_audit_log.id,
          adminId: admin_audit_log.admin_id,
          adminEmail: user.email,
          action: admin_audit_log.action,
          targetType: admin_audit_log.target_type,
          targetId: admin_audit_log.target_id,
          createdAt: admin_audit_log.created_at,
        })
        .from(admin_audit_log)
        .leftJoin(user, eq(admin_audit_log.admin_id, user.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(admin_audit_log.created_at));

      // Build CSV string manually
      const csvLines: string[] = [];
      csvLines.push('id,action,actorEmail,targetType,targetId,createdAt');

      for (const entry of entries) {
        const escapedAction = `"${(entry.action || '').replace(/"/g, '""')}"`;
        const escapedEmail = `"${(entry.adminEmail || 'unknown@unknown.com').replace(/"/g, '""')}"`;
        const targetType = entry.targetType || '';
        const targetId = entry.targetId || '';
        const createdAt = entry.createdAt.toISOString();

        csvLines.push(
          `${entry.id},${escapedAction},${escapedEmail},${targetType},${targetId},${createdAt}`
        );
      }

      const csvContent = csvLines.join('\n');

      // Set response headers
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=audit-export.csv'
      );

      res.send(csvContent);
    } catch (error) {
      logger.error('Error exporting audit log:', error);
      res.status(500).json({
        error: 'Failed to export audit log',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/audit/actions
 * Get list of unique actions from audit log
 * Used to populate action filter dropdown in admin UI
 * 
 * Returns:
 * - actions: Array of unique action strings
 * - count: Number of unique actions
 */
router.get(
  '/actions',
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      // Get distinct actions
      const actionsResult = await db
        .selectDistinct({ action: admin_audit_log.action })
        .from(admin_audit_log)
        .orderBy(admin_audit_log.action);

      const actions = actionsResult.map(row => row.action);

      res.json({
        actions,
        count: actions.length,
      });
    } catch (error) {
      logger.error('Error fetching unique actions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch unique actions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/audit/target-types
 * Get list of unique target types from audit log
 * Used to populate target type filter dropdown in admin UI
 * 
 * Returns:
 * - targetTypes: Array of unique target type strings
 * - count: Number of unique target types
 */
router.get(
  '/target-types',
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      // Get distinct target types (excluding nulls)
      const targetTypesResult = await db
        .selectDistinct({ targetType: admin_audit_log.target_type })
        .from(admin_audit_log)
        .where(sql`${admin_audit_log.target_type} IS NOT NULL`)
        .orderBy(admin_audit_log.target_type);

      const targetTypes = targetTypesResult
        .map(row => row.targetType)
        .filter((type): type is string => type !== null);

      res.json({
        targetTypes,
        count: targetTypes.length,
      });
    } catch (error) {
      logger.error('Error fetching unique target types:', error);
      res.status(500).json({ 
        error: 'Failed to fetch unique target types',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/audit/stats
 * Get audit log statistics for dashboard
 * 
 * Returns:
 * - totalEntries: Total number of audit log entries
 * - uniqueAdmins: Number of unique admin users
 * - entriesLast24h: Entries in the last 24 hours
 * - entriesLast7d: Entries in the last 7 days
 * - entriesLast30d: Entries in the last 30 days
 * - topActions: Most common actions (top 10)
 */
router.get(
  '/stats',
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get total entries
      const totalResult = await db
        .select({ count: count() })
        .from(admin_audit_log);
      const totalEntries = totalResult[0]?.count || 0;

      // Get unique admins
      const uniqueAdminsResult = await db
        .selectDistinct({ adminId: admin_audit_log.admin_id })
        .from(admin_audit_log);
      const uniqueAdmins = uniqueAdminsResult.length;

      // Get entries in last 24h
      const last24hResult = await db
        .select({ count: count() })
        .from(admin_audit_log)
        .where(gte(admin_audit_log.created_at, last24h));
      const entriesLast24h = last24hResult[0]?.count || 0;

      // Get entries in last 7d
      const last7dResult = await db
        .select({ count: count() })
        .from(admin_audit_log)
        .where(gte(admin_audit_log.created_at, last7d));
      const entriesLast7d = last7dResult[0]?.count || 0;

      // Get entries in last 30d
      const last30dResult = await db
        .select({ count: count() })
        .from(admin_audit_log)
        .where(gte(admin_audit_log.created_at, last30d));
      const entriesLast30d = last30dResult[0]?.count || 0;

      // Get top actions
      const topActionsResult = await db
        .select({
          action: admin_audit_log.action,
          count: count(),
        })
        .from(admin_audit_log)
        .groupBy(admin_audit_log.action)
        .orderBy(desc(count()))
        .limit(10);

      const topActions = topActionsResult.map(row => ({
        action: row.action,
        count: row.count,
      }));

      res.json({
        totalEntries,
        uniqueAdmins,
        entriesLast24h,
        entriesLast7d,
        entriesLast30d,
        topActions,
      });
    } catch (error) {
      logger.error('Error fetching audit log stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch audit log stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

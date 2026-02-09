import { Router, Request, Response } from 'express';
import { and, eq, desc, like, sql, or, gte, lte } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { error_logs } from '../../db/schema.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

/**
 * Admin Error Logs Routes
 * Platform admins can view application error logs with filtering
 * 
 * Security:
 * - Requires admin role (bypasses RLS)
 * - Read-only access to error logs
 */

const router = Router();

/**
 * GET /api/admin/errors
 * List error logs with filtering and pagination
 * 
 * Query params:
 * - limit: number (1-100, default 20) - Results per page
 * - offset: number (default 0) - Pagination offset
 * - level: 'error' | 'warning' | 'info' (optional) - Filter by severity
 * - source: 'api' | 'web' | 'system' | 'queue' | 'database' (optional) - Filter by source
 * - search: string (optional) - Search in message
 * - startDate: ISO string (optional) - Filter from date
 * - endDate: ISO string (optional) - Filter to date
 * 
 * Returns:
 * - PaginatedResponse<ErrorLog> - List of error logs
 */
router.get(
  '/',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Parse pagination params
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      // Parse filter params
      const levelFilter = req.query.level as string | undefined;
      const sourceFilter = req.query.source as string | undefined;
      const searchQuery = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      // Build WHERE conditions
      const conditions: any[] = [];

      // Level filter
      if (levelFilter && ['error', 'warning', 'info'].includes(levelFilter)) {
        conditions.push(eq(error_logs.level, levelFilter));
      }

      // Source filter
      if (sourceFilter && ['api', 'web', 'system', 'queue', 'database'].includes(sourceFilter)) {
        conditions.push(eq(error_logs.source, sourceFilter));
      }

      // Search filter (message or stack)
      if (searchQuery) {
        conditions.push(
          or(
            like(error_logs.message, `%${searchQuery}%`),
            like(error_logs.stack, `%${searchQuery}%`)
          )
        );
      }

      // Date range filters
      if (startDate) {
        conditions.push(gte(error_logs.created_at, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(error_logs.created_at, new Date(endDate)));
      }

      // Get total count
      const totalQuery = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(error_logs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalQuery[0]?.count || 0;

      // Get error logs
      const logs = await db
        .select({
          id: error_logs.id,
          timestamp: error_logs.created_at,
          level: error_logs.level,
          message: error_logs.message,
          source: error_logs.source,
          stack: error_logs.stack,
          userId: error_logs.user_id,
          organizationId: error_logs.organization_id,
          requestId: error_logs.request_id,
          httpMethod: error_logs.http_method,
          httpPath: error_logs.http_path,
          httpStatus: error_logs.http_status,
          metadata: error_logs.metadata,
        })
        .from(error_logs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(error_logs.created_at))
        .limit(limit)
        .offset(offset);

      // Format response with proper typing
      const formattedLogs = logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        level: log.level as 'error' | 'warning' | 'info',
        message: log.message,
        source: log.source,
        stack: log.stack || undefined,
        userId: log.userId || undefined,
        organizationId: log.organizationId || undefined,
        requestId: log.requestId || undefined,
        httpMethod: log.httpMethod || undefined,
        httpPath: log.httpPath || undefined,
        httpStatus: log.httpStatus || undefined,
        metadata: log.metadata ? JSON.parse(JSON.stringify(log.metadata)) : undefined,
      }));

      // Calculate page number
      const page = Math.floor(offset / limit) + 1;

      res.json({
        logs: formattedLogs,
        total,
        limit,
        page,
      });
    } catch (error) {
      console.error('Error fetching error logs:', error);
      res.status(500).json({
        error: 'Failed to fetch error logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/errors/stats
 * Get error statistics (count by level, source, recent trends)
 * 
 * Query params:
 * - hours: number (default 24) - Time window for stats
 * 
 * Returns:
 * - ErrorStats - Aggregated statistics
 */
router.get(
  '/stats',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const hours = Number(req.query.hours) || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Count by level
      const levelStats = await db
        .select({
          level: error_logs.level,
          count: sql<number>`count(*)::int`,
        })
        .from(error_logs)
        .where(gte(error_logs.created_at, since))
        .groupBy(error_logs.level);

      // Count by source
      const sourceStats = await db
        .select({
          source: error_logs.source,
          count: sql<number>`count(*)::int`,
        })
        .from(error_logs)
        .where(gte(error_logs.created_at, since))
        .groupBy(error_logs.source);

      // Total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(error_logs)
        .where(gte(error_logs.created_at, since));

      const total = totalResult[0]?.count || 0;

      // Recent errors (last 10)
      const recentErrors = await db
        .select({
          id: error_logs.id,
          timestamp: error_logs.created_at,
          level: error_logs.level,
          message: error_logs.message,
          source: error_logs.source,
        })
        .from(error_logs)
        .where(eq(error_logs.level, 'error'))
        .orderBy(desc(error_logs.created_at))
        .limit(10);

      res.json({
        total,
        hours,
        byLevel: levelStats.reduce((acc, item) => {
          acc[item.level] = item.count;
          return acc;
        }, {} as Record<string, number>),
        bySource: sourceStats.reduce((acc, item) => {
          acc[item.source] = item.count;
          return acc;
        }, {} as Record<string, number>),
        recentErrors: recentErrors.map((err) => ({
          id: err.id,
          timestamp: err.timestamp.toISOString(),
          level: err.level,
          message: err.message,
          source: err.source,
        })),
      });
    } catch (error) {
      console.error('Error fetching error stats:', error);
      res.status(500).json({
        error: 'Failed to fetch error stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/errors/export
 * Export error logs matching filters as CSV
 *
 * Query params:
 * - level: 'error' | 'warning' | 'info' (optional)
 * - source: string (optional)
 * - search: string (optional)
 * - startDate: ISO string (optional)
 * - endDate: ISO string (optional)
 *
 * Returns:
 * - CSV file with columns: id,timestamp,level,source,message,httpMethod,httpPath,httpStatus
 */
router.get(
  '/export',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const levelFilter = req.query.level as string | undefined;
      const sourceFilter = req.query.source as string | undefined;
      const searchQuery = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const conditions: any[] = [];

      if (levelFilter && ['error', 'warning', 'info'].includes(levelFilter)) {
        conditions.push(eq(error_logs.level, levelFilter));
      }
      if (sourceFilter) {
        conditions.push(eq(error_logs.source, sourceFilter));
      }
      if (searchQuery) {
        conditions.push(
          or(
            like(error_logs.message, `%${searchQuery}%`),
            like(error_logs.stack, `%${searchQuery}%`)
          )
        );
      }
      if (startDate) {
        conditions.push(gte(error_logs.created_at, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(error_logs.created_at, new Date(endDate)));
      }

      const logs = await db
        .select({
          id: error_logs.id,
          timestamp: error_logs.created_at,
          level: error_logs.level,
          source: error_logs.source,
          message: error_logs.message,
          httpMethod: error_logs.http_method,
          httpPath: error_logs.http_path,
          httpStatus: error_logs.http_status,
        })
        .from(error_logs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(error_logs.created_at));

      const csvLines: string[] = [];
      csvLines.push('id,timestamp,level,source,message,httpMethod,httpPath,httpStatus');

      for (const log of logs) {
        const escapedMessage = `"${(log.message || '').replace(/"/g, '""')}"`;
        csvLines.push(
          `${log.id},${log.timestamp.toISOString()},${log.level},${log.source || ''},${escapedMessage},${log.httpMethod || ''},${log.httpPath || ''},${log.httpStatus || ''}`
        );
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=error-logs-export.csv');
      res.send(csvLines.join('\n'));
    } catch (error) {
      console.error('Error exporting error logs:', error);
      res.status(500).json({
        error: 'Failed to export error logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;

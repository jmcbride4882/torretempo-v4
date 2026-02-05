import { Router, Request, Response } from 'express';
import { and, eq, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { monthly_summaries, time_entries } from '../db/schema.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../services/audit.service.js';
import { pdfQueue } from '../lib/queue.js';

const router = Router();

const MANAGER_ROLES = ['manager', 'tenantAdmin', 'owner'];

/**
 * Helper function to get actor from request
 */
function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ error: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}

/**
 * Helper function to check if actor can access user's reports
 */
function canAccessUserReports(actorRole: string, actorId: string, requestedUserId?: string): boolean {
  // Managers and above can access any user's reports
  if (MANAGER_ROLES.includes(actorRole)) {
    return true;
  }
  
  // Employees can only access their own reports
  if (!requestedUserId || requestedUserId === actorId) {
    return true;
  }
  
  return false;
}

/**
 * Placeholder report generation function
 * TODO: Move to apps/api/src/services/report.service.ts
 */
async function generateMonthlyReportData(
  organizationId: string,
  userId: string,
  year: number,
  month: number
): Promise<{ totalHours: number; totalDays: number; overtimeHours: number }> {
  // Calculate start and end dates for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Query time entries for the user in the given month
  const entries = await db
    .select({
      total_minutes: time_entries.total_minutes,
      entry_date: time_entries.entry_date,
    })
    .from(time_entries)
    .where(
      and(
        eq(time_entries.organization_id, organizationId),
        eq(time_entries.user_id, userId),
        eq(time_entries.status, 'completed'),
        gte(time_entries.entry_date, startDate),
        lte(time_entries.entry_date, endDate)
      )
    );

  // Calculate total hours and days
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.total_minutes || 0), 0);
  const totalHours = totalMinutes / 60;
  
  // Count unique days worked
  const uniqueDates = new Set(entries.map(e => e.entry_date.toISOString().split('T')[0]));
  const totalDays = uniqueDates.size;

  // Calculate overtime (hours exceeding 40h/week - simplified)
  const MAX_WEEKLY_HOURS = 40;
  const weeksInMonth = Math.ceil(totalDays / 7);
  const expectedHours = weeksInMonth * MAX_WEEKLY_HOURS;
  const overtimeHours = Math.max(0, totalHours - expectedHours);

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalDays,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  };
}

// ============================================================================
// GET /api/v1/org/:slug/reports - List reports for organization
// ============================================================================
router.get('/', requireRole(['employee', 'manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const userId = req.query.user_id as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    // Authorization check
    if (!canAccessUserReports(actor.role, actor.id, userId)) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own reports' });
    }

    const conditions: any[] = [eq(monthly_summaries.organization_id, organizationId)];

    // Non-managers can only see their own reports
    if (!MANAGER_ROLES.includes(actor.role)) {
      conditions.push(eq(monthly_summaries.user_id, actor.id));
    } else if (userId) {
      conditions.push(eq(monthly_summaries.user_id, userId));
    }

    if (year) {
      conditions.push(eq(monthly_summaries.year, year));
    }
    if (month) {
      conditions.push(eq(monthly_summaries.month, month));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(monthly_summaries)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    // Get paginated results
    const reports = await db
      .select()
      .from(monthly_summaries)
      .where(and(...conditions))
      .orderBy(desc(monthly_summaries.year), desc(monthly_summaries.month))
      .limit(limit)
      .offset(offset);

    res.json({
      reports,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ============================================================================
// GET /api/v1/org/:slug/reports/:id - Get single report by ID
// ============================================================================
router.get('/:id', requireRole(['employee', 'manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const result = await db
      .select()
      .from(monthly_summaries)
      .where(and(eq(monthly_summaries.id, id), eq(monthly_summaries.organization_id, organizationId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result[0]!;

    // Authorization check: employees can only view their own reports
    if (!MANAGER_ROLES.includes(actor.role) && report.user_id !== actor.id) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own reports' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// ============================================================================
// POST /api/v1/org/:slug/reports/generate - Trigger report generation
// ============================================================================
router.post('/generate', requireRole(['employee', 'manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const { user_id, year, month, report_type = 'monthly', options = {} } = req.body;

    // Validate required fields
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    // Validate month range
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be between 1 and 12' });
    }

    // Determine target user
    const targetUserId = user_id || actor.id;

    // Authorization check: employees can only generate their own reports
    if (!MANAGER_ROLES.includes(actor.role) && targetUserId !== actor.id) {
      return res.status(403).json({ error: 'Forbidden: You can only generate your own reports' });
    }

    // Check if report already exists
    const existing = await db
      .select()
      .from(monthly_summaries)
      .where(
        and(
          eq(monthly_summaries.organization_id, organizationId),
          eq(monthly_summaries.user_id, targetUserId),
          eq(monthly_summaries.year, year),
          eq(monthly_summaries.month, month)
        )
      )
      .limit(1);

    let reportId: string;

    if (existing.length > 0) {
      // Update existing report
      reportId = existing[0]!.id;
      
      // Regenerate report data
      const reportData = await generateMonthlyReportData(organizationId, targetUserId, year, month);

      await db
        .update(monthly_summaries)
        .set({
          total_hours: reportData.totalHours.toString(),
          total_days: reportData.totalDays,
          overtime_hours: reportData.overtimeHours.toString(),
          generated_at: new Date(),
        })
        .where(eq(monthly_summaries.id, reportId));

    } else {
      // Generate new report
      const reportData = await generateMonthlyReportData(organizationId, targetUserId, year, month);

      const created = await db
        .insert(monthly_summaries)
        .values({
          organization_id: organizationId,
          user_id: targetUserId,
          year,
          month,
          total_hours: reportData.totalHours.toString(),
          total_days: reportData.totalDays,
          overtime_hours: reportData.overtimeHours.toString(),
          generated_at: new Date(),
          delivery_method: options.deliveryMethod || 'download',
        })
        .returning();

      reportId = created[0]!.id;
    }

    // Queue PDF generation job
    await pdfQueue.add('generate-report-pdf', {
      type: 'monthly_summary',
      organizationId,
      userId: targetUserId,
      data: {
        reportId,
        year,
        month,
        reportType: report_type,
        options,
      },
    });

    // Log audit entry
    await logAudit({
      orgId: organizationId,
      actorId: actor.id,
      action: 'report.generate',
      entityType: 'monthly_summaries',
      entityId: reportId,
      newData: { userId: targetUserId, year, month, reportType: report_type },
    });

    res.status(201).json({
      message: 'Report generation started',
      reportId,
      status: 'generating',
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ============================================================================
// GET /api/v1/org/:slug/reports/:id/download - Download PDF report
// ============================================================================
router.get('/:id/download', requireRole(['employee', 'manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const result = await db
      .select()
      .from(monthly_summaries)
      .where(and(eq(monthly_summaries.id, id), eq(monthly_summaries.organization_id, organizationId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result[0]!;

    // Authorization check: employees can only download their own reports
    if (!MANAGER_ROLES.includes(actor.role) && report.user_id !== actor.id) {
      return res.status(403).json({ error: 'Forbidden: You can only download your own reports' });
    }

    // Check if PDF is ready
    if (!report.pdf_url) {
      return res.status(404).json({
        error: 'PDF not ready',
        message: 'Report is still being generated. Please try again later.',
        status: 'generating',
      });
    }

    // Log download audit entry
    await logAudit({
      orgId: organizationId,
      actorId: actor.id,
      action: 'report.download',
      entityType: 'monthly_summaries',
      entityId: id,
    });

    // Redirect to PDF URL or return URL
    res.json({
      pdfUrl: report.pdf_url,
      downloadUrl: report.pdf_url,
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// ============================================================================
// GET /api/v1/org/:slug/reports/monthly/:year/:month - Get monthly summary for user
// ============================================================================
router.get('/monthly/:year/:month', requireRole(['employee', 'manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const year = parseInt(req.params.year as string, 10);
    const month = parseInt(req.params.month as string, 10);
    const requestedUserId = (req.query.user_id as string) || actor.id;

    // Validate params
    if (isNaN(year) || isNaN(month)) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be between 1 and 12' });
    }

    // Authorization check: employees can only access their own reports
    if (!MANAGER_ROLES.includes(actor.role) && requestedUserId !== actor.id) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own reports' });
    }

    // Check if report exists
    const existing = await db
      .select()
      .from(monthly_summaries)
      .where(
        and(
          eq(monthly_summaries.organization_id, organizationId),
          eq(monthly_summaries.user_id, requestedUserId),
          eq(monthly_summaries.year, year),
          eq(monthly_summaries.month, month)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Return existing report
      return res.json({ report: existing[0] });
    }

    // Generate report if it doesn't exist
    const reportData = await generateMonthlyReportData(organizationId, requestedUserId, year, month);

    const created = await db
      .insert(monthly_summaries)
      .values({
        organization_id: organizationId,
        user_id: requestedUserId,
        year,
        month,
        total_hours: reportData.totalHours.toString(),
        total_days: reportData.totalDays,
        overtime_hours: reportData.overtimeHours.toString(),
        generated_at: new Date(),
        delivery_method: 'download',
      })
      .returning();

    // Queue PDF generation job
    await pdfQueue.add('generate-report-pdf', {
      type: 'monthly_summary',
      organizationId,
      userId: requestedUserId,
      data: {
        reportId: created[0]!.id,
        year,
        month,
        reportType: 'monthly',
      },
    });

    // Log audit entry
    await logAudit({
      orgId: organizationId,
      actorId: actor.id,
      action: 'report.generate',
      entityType: 'monthly_summaries',
      entityId: created[0]!.id,
      newData: { userId: requestedUserId, year, month },
    });

    res.status(201).json({
      report: created[0],
      message: 'Report generated successfully',
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

export default router;

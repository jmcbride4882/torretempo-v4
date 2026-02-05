import { Worker, Job } from 'bullmq';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { MonthlyJob, pdfQueue, emailQueue, redisConnection } from '../lib/queue.js';
import { db } from '../db/index.js';
import { member, organization, monthly_summaries, time_entries, user } from '../db/schema.js';

/**
 * Monthly Worker
 * Processes monthly queue jobs for automated report generation, delivery, and cleanup
 * 
 * Job Types:
 * - generate_summaries: Generate monthly reports for all active users
 * - send_reports: Queue email notifications for generated reports
 * - cleanup: Archive old reports (older than retention period)
 * 
 * Cron Schedule (configured separately):
 * - Generate summaries: 1st day of month at 2am
 * - Send reports: 1st day of month at 8am (after generation)
 * - Cleanup: 1st day of month at midnight
 */

// ============================================================================
// CONSTANTS
// ============================================================================
const RETENTION_YEARS = 7; // Spanish labor law requires 7-year retention
const BATCH_SIZE = 10; // Process users in batches to avoid overwhelming the queue

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate monthly report data for a specific user
 * Calculates total hours, days worked, and overtime from time entries
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
  const uniqueDates = new Set(entries.map((e) => e.entry_date.toISOString().split('T')[0]));
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

/**
 * Generate monthly summaries for all active users in an organization
 * Processes users in batches to avoid overwhelming the system
 */
async function generateAllMonthlySummaries(
  year: number,
  month: number,
  orgId?: string
): Promise<void> {
  console.log(`📊 Starting monthly summary generation for ${year}-${month}${orgId ? ` (org: ${orgId})` : ''}`);

  try {
    // Query all active organizations (or specific org if orgId provided)
    const orgs = orgId
      ? [{ id: orgId }]
      : await db.select({ id: organization.id }).from(organization);

    console.log(`📊 Processing ${orgs.length} organization(s)`);

    let totalReportsGenerated = 0;
    let totalErrors = 0;

    for (const org of orgs) {
      try {
        // Query all active members in the organization
        const members = await db
          .select({ userId: member.userId })
          .from(member)
          .where(eq(member.organizationId, org.id));

        console.log(`📊 Organization ${org.id}: ${members.length} members`);

        // Process members in batches
        for (let i = 0; i < members.length; i += BATCH_SIZE) {
          const batch = members.slice(i, i + BATCH_SIZE);

          for (const m of batch) {
            try {
              // Check if report already exists
              const existing = await db
                .select()
                .from(monthly_summaries)
                .where(
                  and(
                    eq(monthly_summaries.organization_id, org.id),
                    eq(monthly_summaries.user_id, m.userId),
                    eq(monthly_summaries.year, year),
                    eq(monthly_summaries.month, month)
                  )
                )
                .limit(1);

              if (existing.length > 0) {
                console.log(`⏭️  Report already exists for user ${m.userId} (${year}-${month})`);
                continue;
              }

              // Generate report data
              const reportData = await generateMonthlyReportData(org.id, m.userId, year, month);

              // Skip if no time entries (user didn't work this month)
              if (reportData.totalHours === 0) {
                console.log(`⏭️  Skipping user ${m.userId} (no hours worked in ${year}-${month})`);
                continue;
              }

              // Insert monthly summary
              const created = await db
                .insert(monthly_summaries)
                .values({
                  organization_id: org.id,
                  user_id: m.userId,
                  year,
                  month,
                  total_hours: reportData.totalHours.toString(),
                  total_days: reportData.totalDays,
                  overtime_hours: reportData.overtimeHours.toString(),
                  generated_at: new Date(),
                  delivery_method: 'email',
                })
                .returning();

              const reportId = created[0]!.id;

              // Queue PDF generation
              await pdfQueue.add('generate-pdf', {
                type: 'monthly_summary',
                organizationId: org.id,
                userId: m.userId,
                reportId,
                data: {
                  reportId,
                  year,
                  month,
                  totalHours: reportData.totalHours,
                  totalDays: reportData.totalDays,
                  overtimeHours: reportData.overtimeHours,
                },
              });

              totalReportsGenerated++;
              console.log(`✅ Generated report for user ${m.userId} (${year}-${month})`);
            } catch (error) {
              totalErrors++;
              console.error(`❌ Failed to generate report for user ${m.userId}:`, error);
              // Continue to next user (don't fail entire job)
            }
          }

          // Small delay between batches to avoid overwhelming the database
          if (i + BATCH_SIZE < members.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        totalErrors++;
        console.error(`❌ Failed to process organization ${org.id}:`, error);
        // Continue to next organization
      }
    }

    console.log(`📊 Summary generation complete: ${totalReportsGenerated} reports generated, ${totalErrors} errors`);
  } catch (error) {
    console.error('❌ Fatal error in generateAllMonthlySummaries:', error);
    throw error;
  }
}

/**
 * Send email notifications for all generated reports
 * Queries reports that have been generated but not yet delivered
 */
async function sendAllReports(year: number, month: number, orgId?: string): Promise<void> {
  console.log(`📧 Starting report delivery for ${year}-${month}${orgId ? ` (org: ${orgId})` : ''}`);

  try {
    // Query all generated reports for the month that haven't been delivered
    const conditions: any[] = [
      eq(monthly_summaries.year, year),
      eq(monthly_summaries.month, month),
      eq(monthly_summaries.delivery_method, 'email'),
    ];

    if (orgId) {
      conditions.push(eq(monthly_summaries.organization_id, orgId));
    }

    const reports = await db
      .select({
        id: monthly_summaries.id,
        organizationId: monthly_summaries.organization_id,
        userId: monthly_summaries.user_id,
        year: monthly_summaries.year,
        month: monthly_summaries.month,
        pdfUrl: monthly_summaries.pdf_url,
        deliveredAt: monthly_summaries.delivered_at,
      })
      .from(monthly_summaries)
      .where(and(...conditions));

    console.log(`📧 Found ${reports.length} reports to deliver`);

    let totalEmailsQueued = 0;
    let totalErrors = 0;

    for (const report of reports) {
      try {
        // Skip if already delivered
        if (report.deliveredAt) {
          console.log(`⏭️  Report ${report.id} already delivered`);
          continue;
        }

        // Skip if PDF not ready yet
        if (!report.pdfUrl) {
          console.log(`⏭️  Report ${report.id} PDF not ready yet`);
          continue;
        }

        // Get user email
        const userResult = await db
          .select({ email: user.email, name: user.name })
          .from(user)
          .where(eq(user.id, report.userId))
          .limit(1);

        if (userResult.length === 0) {
          console.error(`❌ User ${report.userId} not found`);
          continue;
        }

        const userEmail = userResult[0]!.email;
        const userName = userResult[0]!.name;

        // Queue email notification
        await emailQueue.add('send-email', {
          to: userEmail,
          subject: `Monthly Summary - ${year}/${month}`,
          template: 'monthly-summary.html',
          data: {
            userName,
            year,
            month,
            pdfUrl: report.pdfUrl,
            reportId: report.id,
          },
        });

        // Update delivered_at timestamp
        await db
          .update(monthly_summaries)
          .set({ delivered_at: new Date() })
          .where(eq(monthly_summaries.id, report.id));

        totalEmailsQueued++;
        console.log(`✅ Queued email for user ${report.userId} (${userEmail})`);
      } catch (error) {
        totalErrors++;
        console.error(`❌ Failed to queue email for report ${report.id}:`, error);
        // Continue to next report
      }
    }

    console.log(`📧 Report delivery complete: ${totalEmailsQueued} emails queued, ${totalErrors} errors`);
  } catch (error) {
    console.error('❌ Fatal error in sendAllReports:', error);
    throw error;
  }
}

/**
 * Archive or delete old reports older than retention period
 * Spanish labor law requires 7-year retention, so we only delete reports older than 7 years
 */
async function cleanupOldReports(): Promise<void> {
  console.log(`🧹 Starting cleanup of old reports (retention: ${RETENTION_YEARS} years)`);

  try {
    // Calculate cutoff date (7 years ago)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);
    const cutoffYear = cutoffDate.getFullYear();
    const cutoffMonth = cutoffDate.getMonth() + 1;

    console.log(`🧹 Cutoff date: ${cutoffYear}-${cutoffMonth}`);

    // Query old reports
    const oldReports = await db
      .select({
        id: monthly_summaries.id,
        organizationId: monthly_summaries.organization_id,
        userId: monthly_summaries.user_id,
        year: monthly_summaries.year,
        month: monthly_summaries.month,
      })
      .from(monthly_summaries)
      .where(
        and(
          // Year is less than cutoff year, OR year equals cutoff year and month is less than cutoff month
          eq(monthly_summaries.year, cutoffYear)
        )
      )
      .orderBy(desc(monthly_summaries.year), desc(monthly_summaries.month));

    // Filter by month if year matches cutoff year
    const reportsToDelete = oldReports.filter((report) => {
      if (report.year < cutoffYear) {
        return true;
      }
      if (report.year === cutoffYear && report.month < cutoffMonth) {
        return true;
      }
      return false;
    });

    console.log(`🧹 Found ${reportsToDelete.length} reports to archive/delete`);

    if (reportsToDelete.length === 0) {
      console.log('🧹 No old reports to clean up');
      return;
    }

    let totalDeleted = 0;
    let totalErrors = 0;

    for (const report of reportsToDelete) {
      try {
        // TODO: Archive to cold storage (S3 Glacier, etc.) before deleting
        // For now, we just log the report that would be archived
        console.log(
          `📦 Would archive report ${report.id} (${report.year}-${report.month}) for user ${report.userId}`
        );

        // TODO: Uncomment when archival system is in place
        // await db.delete(monthly_summaries).where(eq(monthly_summaries.id, report.id));

        totalDeleted++;
      } catch (error) {
        totalErrors++;
        console.error(`❌ Failed to archive report ${report.id}:`, error);
        // Continue to next report
      }
    }

    console.log(`🧹 Cleanup complete: ${totalDeleted} reports archived, ${totalErrors} errors`);
  } catch (error) {
    console.error('❌ Fatal error in cleanupOldReports:', error);
    throw error;
  }
}

// ============================================================================
// WORKER DEFINITION
// ============================================================================

/**
 * Monthly Worker
 * Processes monthly queue jobs with concurrency of 1 (one job at a time)
 */
const monthlyWorker = new Worker<MonthlyJob>(
  'monthly',
  async (job: Job<MonthlyJob>) => {
    const { type, organizationId, year, month } = job.data;

    console.log(`🔄 Processing monthly job: ${type} (${year}-${month})`);

    try {
      switch (type) {
        case 'generate_summaries':
          await generateAllMonthlySummaries(year, month, organizationId);
          break;

        case 'send_reports':
          await sendAllReports(year, month, organizationId);
          break;

        case 'cleanup':
          await cleanupOldReports();
          break;

        default:
          throw new Error(`Unknown job type: ${type}`);
      }

      console.log(`✅ Monthly job completed: ${type} (${year}-${month})`);
    } catch (error) {
      console.error(`❌ Monthly job failed: ${type} (${year}-${month})`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one monthly job at a time
  }
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

monthlyWorker.on('completed', (job) => {
  console.log(`✅ Monthly job ${job.id} completed`, {
    type: job.data.type,
    year: job.data.year,
    month: job.data.month,
    organizationId: job.data.organizationId,
  });
});

monthlyWorker.on('failed', (job, err) => {
  console.error(`❌ Monthly job ${job?.id} failed`, {
    type: job?.data.type,
    year: job?.data.year,
    month: job?.data.month,
    organizationId: job?.data.organizationId,
    attemptsMade: job?.attemptsMade,
    error: err.message,
  });
});

monthlyWorker.on('error', (err) => {
  console.error('❌ Monthly worker error:', err);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, closing monthly worker...');
  await monthlyWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, closing monthly worker...');
  await monthlyWorker.close();
  process.exit(0);
});

export default monthlyWorker;

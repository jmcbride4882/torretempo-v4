import { Worker, Job } from 'bullmq';
// @ts-expect-error - pdfkit types not installed, run: npm i --save-dev @types/pdfkit
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PdfJob, redisConnection } from '../lib/queue.js';
import { db } from '../db/index.js';
import { monthly_summaries } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const pdfsDir = path.join(publicDir, 'pdfs');

// Ensure PDFs directory exists
await mkdir(pdfsDir, { recursive: true });

/**
 * Generate HTML-like content for monthly summary report
 * @param data - Report data containing user info, hours, and summary
 * @returns Formatted report data for PDF generation
 */
interface MonthlyReportData {
  userName: string;
  month: number;
  year: number;
  totalHours: string;
  totalDays: number;
  overtimeHours: string;
  organizationName?: string;
}

/**
 * Generate a monthly summary PDF using PDFKit
 * @param data - Monthly report data
 * @param outputPath - File path to save the PDF
 * @returns Promise that resolves when PDF is generated
 */
async function generateMonthlySummaryPDF(
  data: MonthlyReportData,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = createWriteStream(outputPath);

      stream.on('finish', () => resolve());
      stream.on('error', reject);

      doc.pipe(stream);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      drawHeader(doc, 'Monthly Report', data.organizationName);

      // Period and employee info
      doc.fontSize(12).fillColor(BRAND.muted).text(`${monthNames[data.month - 1]} ${data.year}`);
      doc.fontSize(11).fillColor(BRAND.primary).text(`Employee: ${data.userName}`);
      doc.moveDown(1.5);

      // Summary box with accent bar
      const summaryY = doc.y;
      doc.rect(50, summaryY, doc.page.width - 100, 130).lineWidth(1).strokeColor(BRAND.border).stroke();
      doc.rect(50, summaryY, 5, 130).fill(BRAND.secondary);

      doc.y = summaryY + 15;
      doc.fontSize(14).fillColor(BRAND.primary).text('Summary', 70, doc.y);
      doc.moveDown(1);

      const leftMargin = 70;
      const valueMargin = 250;

      // Stats
      const summaryItems = [
        { label: 'Total Hours', value: data.totalHours },
        { label: 'Total Days', value: data.totalDays.toString() },
        { label: 'Overtime Hours', value: data.overtimeHours },
      ];

      for (const item of summaryItems) {
        doc.fontSize(11).fillColor(BRAND.muted).text(item.label, leftMargin, doc.y);
        doc.fillColor(BRAND.primary).text(item.value, valueMargin, doc.y - 13);
        doc.moveDown(0.6);
      }

      drawFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// SHARED PDF HELPERS
// ============================================================================

const BRAND = {
  primary: '#0a0a0a',
  secondary: '#6366f1',
  muted: '#64748b',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

function drawHeader(doc: InstanceType<typeof PDFDocument>, title: string, orgName?: string) {
  // Brand bar
  doc.rect(0, 0, doc.page.width, 4).fill(BRAND.secondary);

  doc.y = 30;

  // Title
  doc.fontSize(22).fillColor(BRAND.primary).text(title, 50, doc.y, { align: 'left' });

  // Organization name (right-aligned)
  if (orgName) {
    doc.fontSize(10).fillColor(BRAND.muted).text(orgName, 50, 35, { align: 'right' });
  }

  doc.moveDown(0.5);

  // Divider line
  const lineY = doc.y;
  doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).strokeColor(BRAND.border).lineWidth(1).stroke();
  doc.y = lineY + 15;
}

function drawFooter(doc: InstanceType<typeof PDFDocument>) {
  const y = doc.page.height - 40;
  doc.moveTo(50, y - 10).lineTo(doc.page.width - 50, y - 10).strokeColor(BRAND.border).lineWidth(0.5).stroke();

  doc.fontSize(8).fillColor(BRAND.muted).text(
    `Torre Tempo  |  Generated ${new Date().toLocaleDateString('es-ES')} at ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
    50, y, { align: 'center' }
  );
}

function drawTableRow(
  doc: InstanceType<typeof PDFDocument>,
  cols: { text: string; width: number; align?: 'left' | 'center' | 'right' }[],
  y: number,
  opts?: { bold?: boolean; bg?: string; color?: string }
) {
  if (opts?.bg) {
    const totalWidth = cols.reduce((sum, c) => sum + c.width, 0);
    doc.rect(50, y - 4, totalWidth, 20).fill(opts.bg);
  }

  let x = 50;
  for (const col of cols) {
    doc
      .fontSize(opts?.bold ? 10 : 9)
      .fillColor(opts?.color || BRAND.primary)
      .text(col.text, x, y, { width: col.width, align: col.align || 'left' });
    x += col.width;
  }
}

// ============================================================================
// COMPLIANCE REPORT PDF
// ============================================================================

interface ComplianceReportData {
  organizationName: string;
  period: string;
  employeeName?: string;
  violations: Array<{ rule: string; message: string; severity: string; date?: string }>;
  warnings: Array<{ rule: string; message: string; date?: string }>;
  passedRules: number;
  totalRules: number;
}

async function generateComplianceReportPDF(data: ComplianceReportData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = createWriteStream(outputPath);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      doc.pipe(stream);

      drawHeader(doc, 'Compliance Report', data.organizationName);

      // Period and employee
      doc.fontSize(11).fillColor(BRAND.muted).text(`Period: ${data.period}`);
      if (data.employeeName) {
        doc.text(`Employee: ${data.employeeName}`);
      }
      doc.moveDown(1);

      // Score summary box
      const score = data.totalRules > 0 ? Math.round((data.passedRules / data.totalRules) * 100) : 100;
      const scoreColor = score >= 90 ? BRAND.success : score >= 70 ? BRAND.warning : BRAND.danger;

      const boxY = doc.y;
      doc.rect(50, boxY, doc.page.width - 100, 50).lineWidth(1).strokeColor(BRAND.border).stroke();
      doc.rect(50, boxY, 6, 50).fill(scoreColor);

      doc.fontSize(24).fillColor(scoreColor).text(`${score}%`, 70, boxY + 10, { width: 80 });
      doc.fontSize(10).fillColor(BRAND.muted).text(
        `${data.passedRules} of ${data.totalRules} rules passed  |  ${data.violations.length} violations  |  ${data.warnings.length} warnings`,
        160, boxY + 18
      );
      doc.y = boxY + 65;

      // Violations table
      if (data.violations.length > 0) {
        doc.fontSize(13).fillColor(BRAND.danger).text('Violations');
        doc.moveDown(0.5);

        const colWidths = [{ text: 'Severity', width: 70 }, { text: 'Rule', width: 140 }, { text: 'Issue', width: 230 }, { text: 'Date', width: 70 }];
        let tableY = doc.y;
        drawTableRow(doc, colWidths.map(c => ({ ...c, align: 'left' as const })), tableY, { bold: true, bg: BRAND.bgLight, color: BRAND.muted });
        tableY += 22;

        for (const v of data.violations) {
          if (tableY > doc.page.height - 80) { doc.addPage(); tableY = 50; }
          const sevColor = v.severity === 'critical' ? BRAND.danger : v.severity === 'high' ? BRAND.warning : BRAND.muted;
          drawTableRow(doc, [
            { text: v.severity.toUpperCase(), width: 70, align: 'left' },
            { text: v.rule, width: 140, align: 'left' },
            { text: v.message, width: 230, align: 'left' },
            { text: v.date || '-', width: 70, align: 'left' },
          ], tableY, { color: sevColor });
          tableY += 20;
        }
        doc.y = tableY + 10;
      }

      // Warnings
      if (data.warnings.length > 0) {
        doc.fontSize(13).fillColor(BRAND.warning).text('Warnings');
        doc.moveDown(0.5);

        for (const w of data.warnings) {
          doc.fontSize(9).fillColor(BRAND.muted).text(`${w.rule}: ${w.message}${w.date ? ` (${w.date})` : ''}`);
          doc.moveDown(0.3);
        }
      }

      drawFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// ROSTER SUMMARY PDF
// ============================================================================

interface RosterSummaryData {
  organizationName: string;
  weekStart: string;
  weekEnd: string;
  shifts: Array<{ day: string; employee: string; time: string; location: string; status: string }>;
  totalShifts: number;
  totalHours: number;
  employeeCount: number;
}

async function generateRosterSummaryPDF(data: RosterSummaryData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });
      const stream = createWriteStream(outputPath);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      doc.pipe(stream);

      drawHeader(doc, 'Weekly Roster Summary', data.organizationName);

      doc.fontSize(11).fillColor(BRAND.muted).text(`Week: ${data.weekStart} — ${data.weekEnd}`);
      doc.moveDown(0.5);

      // Stats row
      const statsY = doc.y;
      const statWidth = 140;
      const stats = [
        { label: 'Total Shifts', value: String(data.totalShifts) },
        { label: 'Total Hours', value: `${data.totalHours.toFixed(1)}h` },
        { label: 'Employees', value: String(data.employeeCount) },
      ];

      stats.forEach((stat, i) => {
        const x = 50 + i * (statWidth + 20);
        doc.rect(x, statsY, statWidth, 45).lineWidth(1).strokeColor(BRAND.border).stroke();
        doc.fontSize(18).fillColor(BRAND.secondary).text(stat.value, x + 10, statsY + 6, { width: statWidth - 20 });
        doc.fontSize(8).fillColor(BRAND.muted).text(stat.label, x + 10, statsY + 30, { width: statWidth - 20 });
      });

      doc.y = statsY + 60;

      // Shift table
      const cols = [
        { text: 'Day', width: 100, align: 'left' as const },
        { text: 'Employee', width: 180, align: 'left' as const },
        { text: 'Time', width: 140, align: 'left' as const },
        { text: 'Location', width: 160, align: 'left' as const },
        { text: 'Status', width: 80, align: 'center' as const },
      ];

      let tableY = doc.y;
      drawTableRow(doc, cols, tableY, { bold: true, bg: BRAND.bgLight, color: BRAND.muted });
      tableY += 22;

      for (const shift of data.shifts) {
        if (tableY > doc.page.height - 60) { doc.addPage(); tableY = 50; }
        drawTableRow(doc, [
          { text: shift.day, width: 100 },
          { text: shift.employee, width: 180 },
          { text: shift.time, width: 140 },
          { text: shift.location, width: 160 },
          { text: shift.status, width: 80, align: 'center' },
        ], tableY);
        tableY += 18;
      }

      drawFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a generic report PDF
 * @param data - Report data
 * @param outputPath - File path to save the PDF
 * @returns Promise that resolves when PDF is generated
 */
async function generateReportPDF(data: Record<string, unknown>, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = createWriteStream(outputPath);

      stream.on('finish', () => resolve());
      stream.on('error', reject);

      doc.pipe(stream);

      drawHeader(doc, 'Report', data.organizationName as string | undefined);

      // Report data
      doc.fontSize(12).fillColor('#333333');
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'organizationName') return;
        doc.text(`${key}: ${String(value)}`);
        doc.moveDown(0.5);
      });

      drawFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a data export PDF
 * @param data - Export data
 * @param outputPath - File path to save the PDF
 * @returns Promise that resolves when PDF is generated
 */
async function generateExportPDF(data: Record<string, unknown>, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = createWriteStream(outputPath);

      stream.on('finish', () => resolve());
      stream.on('error', reject);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).fillColor('#1a1a1a').text('Data Export', { align: 'center' });

      doc.moveDown(1);

      // Export data
      doc.fontSize(10).fillColor('#333333');
      doc.text(JSON.stringify(data, null, 2));

      // Footer
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text(
          `Exported on ${new Date().toLocaleDateString('en-GB')}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * PDF Worker
 * Processes PDF generation jobs asynchronously
 * Supports: monthly_summary, report, export
 */
const pdfWorker = new Worker<PdfJob>(
  'pdf',
  async (job: Job<PdfJob>) => {
    const { type, organizationId, data } = job.data;

    console.log(`📄 Processing PDF job ${job.id} (type: ${type})`);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${type}_${organizationId}_${timestamp}.pdf`;
    const outputPath = path.join(pdfsDir, filename);
    const pdfUrl = `/api/public/pdfs/${filename}`;

    try {
      switch (type) {
        case 'monthly_summary': {
          // Validate required data
          if (!data.userName || !data.month || !data.year) {
            throw new Error('Missing required fields for monthly_summary: userName, month, year');
          }

          const reportData: MonthlyReportData = {
            userName: String(data.userName),
            month: Number(data.month),
            year: Number(data.year),
            totalHours: String(data.totalHours || '0.00'),
            totalDays: Number(data.totalDays || 0),
            overtimeHours: String(data.overtimeHours || '0.00'),
            organizationName: data.organizationName
              ? String(data.organizationName)
              : undefined,
          };

          await generateMonthlySummaryPDF(reportData, outputPath);

          // Update monthly_summaries table with PDF URL
          if (data.summaryId) {
            await db
              .update(monthly_summaries)
              .set({
                pdf_url: pdfUrl,
                generated_at: new Date(),
              })
              .where(eq(monthly_summaries.id, String(data.summaryId)));

            console.log(`✅ Updated monthly_summary ${data.summaryId} with PDF URL`);
          }

          break;
        }

        case 'compliance_report': {
          await generateComplianceReportPDF(data as unknown as ComplianceReportData, outputPath);
          break;
        }

        case 'roster_summary': {
          await generateRosterSummaryPDF(data as unknown as RosterSummaryData, outputPath);
          break;
        }

        case 'report': {
          await generateReportPDF(data, outputPath);
          break;
        }

        case 'export': {
          await generateExportPDF(data, outputPath);
          break;
        }

        default: {
          throw new Error(`Unknown PDF job type: ${type}`);
        }
      }

      console.log(`📄 PDF generated successfully: ${pdfUrl}`);
      return { pdfUrl, filename };
    } catch (error) {
      console.error(`❌ PDF generation failed for job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 PDFs at once
  }
);

pdfWorker.on('completed', (job) => {
  console.log('✅ PDF job completed', {
    jobId: job.id,
    type: job.data.type,
    organizationId: job.data.organizationId,
  });
});

pdfWorker.on('failed', (job, err) => {
  console.error('❌ PDF job failed', {
    jobId: job?.id,
    type: job?.data?.type,
    attemptsMade: job?.attemptsMade,
    error: err.message,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📄 Shutting down PDF worker...');
  await pdfWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📄 Shutting down PDF worker...');
  await pdfWorker.close();
  process.exit(0);
});

export default pdfWorker;

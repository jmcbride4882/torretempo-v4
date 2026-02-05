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

      // Header
      doc
        .fontSize(24)
        .fillColor('#1a1a1a')
        .text('Monthly Report', { align: 'center' });

      doc.moveDown(0.5);

      // Organization name (if provided)
      if (data.organizationName) {
        doc
          .fontSize(12)
          .fillColor('#666666')
          .text(data.organizationName, { align: 'center' });
        doc.moveDown(0.5);
      }

      // Period
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      doc
        .fontSize(14)
        .fillColor('#333333')
        .text(`${monthNames[data.month - 1]} ${data.year}`, { align: 'center' });

      doc.moveDown(1);

      // Employee info
      doc
        .fontSize(12)
        .fillColor('#666666')
        .text('Employee:', { continued: true })
        .fillColor('#1a1a1a')
        .text(` ${data.userName}`);

      doc.moveDown(2);

      // Summary box
      const summaryY = doc.y;
      doc
        .rect(50, summaryY, doc.page.width - 100, 150)
        .lineWidth(1)
        .strokeColor('#dddddd')
        .stroke();

      doc.y = summaryY + 20;

      // Summary title
      doc
        .fontSize(16)
        .fillColor('#1a1a1a')
        .text('Summary', 70, doc.y);

      doc.moveDown(1);

      // Summary data
      const leftMargin = 70;
      const valueMargin = 250;

      doc.fontSize(12).fillColor('#666666');

      // Total Hours
      doc.text('Total Hours:', leftMargin, doc.y, { continued: false });
      doc
        .fillColor('#1a1a1a')
        .text(data.totalHours, valueMargin, doc.y - 15, { continued: false });

      doc.moveDown(0.8);

      // Total Days
      doc.fillColor('#666666').text('Total Days:', leftMargin, doc.y, { continued: false });
      doc
        .fillColor('#1a1a1a')
        .text(data.totalDays.toString(), valueMargin, doc.y - 15, { continued: false });

      doc.moveDown(0.8);

      // Overtime Hours
      doc.fillColor('#666666').text('Overtime Hours:', leftMargin, doc.y, { continued: false });
      doc
        .fillColor('#1a1a1a')
        .text(data.overtimeHours, valueMargin, doc.y - 15, { continued: false });

      // Footer
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text(
          `Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`,
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

      // Header
      doc.fontSize(20).fillColor('#1a1a1a').text('Report', { align: 'center' });

      doc.moveDown(1);

      // Report data
      doc.fontSize(12).fillColor('#333333');
      Object.entries(data).forEach(([key, value]) => {
        doc.text(`${key}: ${String(value)}`);
        doc.moveDown(0.5);
      });

      // Footer
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text(
          `Generated on ${new Date().toLocaleDateString('en-GB')}`,
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

import { Worker } from 'bullmq';
import { Resend } from 'resend';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmailJob, redisConnection } from '../lib/queue.js';
import logger from '../lib/logger.js';

// Only initialize Resend if API key is provided
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromAddress = process.env.RESEND_FROM || 'Torre Tempo <no-reply@lsltgroup.es>';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.resolve(__dirname, '../templates/emails');

const templateCache = new Map<string, string>();

async function loadTemplate(templateName: string): Promise<string> {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const filePath = path.join(templatesDir, templateName);
  const html = await readFile(filePath, 'utf8');
  templateCache.set(templateName, html);
  return html;
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  const viewModel: Record<string, unknown> = {
    appName: 'Torre Tempo',
    supportEmail: 'admin@lsltgroup.es',
    year: new Date().getFullYear().toString(),
    ...data,
  };

  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    const value = viewModel[key];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  });
}

const emailWorker = new Worker<EmailJob>(
  'email',
  async (job) => {
    const { to, subject, template, data } = job.data;

    if (!resend) {
      logger.warn(`⚠️  RESEND_API_KEY not configured - skipping email to ${to} (${subject})`);
      return; // Skip email sending but don't fail the job
    }

    const templateHtml = await loadTemplate(template);
    const html = renderTemplate(templateHtml, data ?? {});

    const { error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message || 'Failed to send email');
    }

    logger.info(`📧 Email sent to ${to} (${subject})`);
  },
  {
    connection: redisConnection,
  }
);

emailWorker.on('completed', (job) => {
  logger.info('✅ Email job completed', { jobId: job.id });
});

emailWorker.on('failed', (job, err) => {
  logger.error('❌ Email job failed', {
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    error: err,
  });
});

export default emailWorker;

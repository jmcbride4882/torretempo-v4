import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { createWebSocketServer } from './lib/websocket.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { errorLogger } from './middleware/errorLogger.js';
import { subscriptionEnforcement } from './middleware/subscriptionEnforcement.js';
import { testConnection } from './db/index.js';
import shiftsRouter from './routes/shifts.js';
import shiftTemplatesRouter from './routes/shift-templates.js';
import locationsRouter from './routes/locations.js';
import swapsRouter from './routes/swaps.js';
import timeEntriesRouter from './routes/v1/time-entries.js';
import breaksRouter from './routes/v1/breaks.js';
import correctionsRouter from './routes/v1/correction-requests.js';
import membersRouter from './routes/members.js';
import inspectorRouter from './routes/inspector.js';
import reportsRouter from './routes/reports.js';
import employeeProfilesRouter from './routes/v1/employee-profiles.js';
import leaveRequestsRouter from './routes/v1/leave-requests.js';
import notificationsRouter from './routes/v1/notifications.js';
import auditChainRouter from './routes/v1/audit.js';
import rosterRouter from './routes/v1/roster.js';
import tenantBillingRouter from './routes/v1/billing.js';
import inspectorTokensRouter from './routes/admin/inspector-tokens.js';
import systemRouter from './routes/admin/system.js';
import tenantsRouter from './routes/admin/tenants.js';
import usersRouter from './routes/admin/users.js';
import subscriptionsRouter from './routes/admin/subscriptions.js';
import auditRouter from './routes/admin/audit.js';
import analyticsRouter from './routes/admin/analytics.js';
import errorsRouter from './routes/admin/errors.js';
import featureFlagsRouter from './routes/admin/feature-flags.js';
import broadcastsRouter from './routes/admin/broadcasts.js';
import billingRouter from './routes/admin/billing.js';
import impersonationRouter from './routes/admin/impersonation.js';
import sessionsRouter from './routes/admin/sessions.js';
import settingsRouter from './routes/admin/settings.js';
import plansRouter from './routes/admin/plans.js';
import trialJobsRouter from './routes/admin/trial-jobs.js';
import stripeWebhookRouter from './routes/webhooks/stripe.js';
import gocardlessWebhookRouter from './routes/webhooks/gocardless.js';
import 'dotenv/config';
import './workers/email.worker.js';
import './workers/trial.worker.js';
import './workers/trial-scheduler.worker.js';
import './workers/payment.worker.js';
import './workers/pdf.worker.js';
import './workers/monthly.worker.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required for nginx reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: ['https://time.lsltgroup.es', 'http://localhost:5173'],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CRITICAL: Better Auth handler BEFORE express.json()
app.all('/api/auth/*', toNodeHandler(auth));

// Webhooks - MUST use express.raw() BEFORE express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);
app.use('/api/webhooks/gocardless', express.raw({ type: 'application/json' }), gocardlessWebhookRouter);

// Body parsing AFTER Better Auth and webhooks
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '4.0.0', ts: Date.now() });
});

// Test error endpoint (only for testing error logging)
app.get('/api/test-error', (_req: Request, _res: Response) => {
  throw new Error('This is a test error for error logging verification');
});

// Admin routes (platform-level)
app.use('/api/admin/system', systemRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/tenants', tenantsRouter);
app.use('/api/admin/subscriptions', subscriptionsRouter);
app.use('/api/admin/audit', auditRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin/errors', errorsRouter);
app.use('/api/admin/feature-flags', featureFlagsRouter);
app.use('/api/admin/broadcasts', broadcastsRouter);
app.use('/api/admin/billing', billingRouter);
app.use('/api/admin/users', impersonationRouter);
app.use('/api/admin/sessions', sessionsRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/admin/plans', plansRouter);
app.use('/api/admin/trial-jobs', trialJobsRouter);

// Admin routes (tenant-specific)
app.use('/api/admin/:slug/inspector-tokens', tenantMiddleware, inspectorTokensRouter);

// Admin routes (placeholder for other admin endpoints)
app.use('/api/admin/*', requireAdmin, (_req: Request, res: Response) => {
  res.json({ message: 'Admin routes active' });
});

// Inspector routes (read-only for ITSS labor inspectors)
app.use('/api/inspector/v1', inspectorRouter);

// Tenant routes — EXEMPT from subscription enforcement (billing + notifications)
// These must work even when subscription is expired so users can upgrade
app.use('/api/v1/org/:slug/billing', tenantMiddleware, tenantBillingRouter);
app.use('/api/v1/org/:slug/notifications', tenantMiddleware, notificationsRouter);

// Tenant routes — ENFORCED (require active subscription or valid trial)
app.use('/api/v1/org/:slug/locations', tenantMiddleware, subscriptionEnforcement, locationsRouter);
app.use('/api/v1/org/:slug/shifts', tenantMiddleware, subscriptionEnforcement, shiftsRouter);
app.use('/api/v1/org/:slug/shift-templates', tenantMiddleware, subscriptionEnforcement, shiftTemplatesRouter);
app.use('/api/v1/org/:slug/swaps', tenantMiddleware, subscriptionEnforcement, swapsRouter);
app.use('/api/v1/org/:slug/time-entries', tenantMiddleware, subscriptionEnforcement, timeEntriesRouter);
app.use('/api/v1/org/:slug/breaks', tenantMiddleware, subscriptionEnforcement, breaksRouter);
app.use('/api/v1/org/:slug/corrections', tenantMiddleware, subscriptionEnforcement, correctionsRouter);
app.use('/api/v1/org/:slug/members', tenantMiddleware, subscriptionEnforcement, membersRouter);
app.use('/api/v1/org/:slug/reports', tenantMiddleware, subscriptionEnforcement, reportsRouter);
app.use('/api/v1/org/:slug/employees', tenantMiddleware, subscriptionEnforcement, employeeProfilesRouter);
app.use('/api/v1/org/:slug/leave-requests', tenantMiddleware, subscriptionEnforcement, leaveRequestsRouter);
app.use('/api/v1/org/:slug/audit/verify', tenantMiddleware, subscriptionEnforcement, auditChainRouter);
app.use('/api/v1/org/:slug/roster', tenantMiddleware, subscriptionEnforcement, rosterRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler with database logging (MUST be last)
app.use(errorLogger);

// Start server
async function start() {
  try {
    await testConnection();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`✅ API server running on http://localhost:${PORT}`);
    });
    
    // Initialize WebSocket server
    createWebSocketServer(server);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

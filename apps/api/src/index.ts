import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { testConnection } from './db/index.js';
import shiftsRouter from './routes/shifts.js';
import locationsRouter from './routes/locations.js';
import swapsRouter from './routes/swaps.js';
import notificationsRouter from './routes/notifications.js';
import timeEntriesRouter from './routes/time-entries.js';
import breaksRouter from './routes/breaks.js';
import correctionsRouter from './routes/corrections.js';
import membersRouter from './routes/members.js';
import inspectorRouter from './routes/inspector.js';
import reportsRouter from './routes/reports.js';
import inspectorTokensRouter from './routes/admin/inspector-tokens.js';
import systemRouter from './routes/admin/system.js';
import tenantsRouter from './routes/admin/tenants.js';
import usersRouter from './routes/admin/users.js';
import subscriptionsRouter from './routes/admin/subscriptions.js';
import auditRouter from './routes/admin/audit.js';
import analyticsRouter from './routes/admin/analytics.js';
import 'dotenv/config';
import './workers/email.worker.js';

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

// Body parsing AFTER Better Auth
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '4.0.0', ts: Date.now() });
});

// Admin routes (platform-level)
app.use('/api/admin/system', systemRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/tenants', tenantsRouter);
app.use('/api/admin/subscriptions', subscriptionsRouter);
app.use('/api/admin/audit', auditRouter);
app.use('/api/admin/analytics', analyticsRouter);

// Admin routes (tenant-specific)
app.use('/api/admin/:slug/inspector-tokens', tenantMiddleware, inspectorTokensRouter);

// Admin routes (placeholder for other admin endpoints)
app.use('/api/admin/*', requireAdmin, (_req: Request, res: Response) => {
  res.json({ message: 'Admin routes active' });
});

// Inspector routes (read-only for ITSS labor inspectors)
app.use('/api/inspector/v1', inspectorRouter);

// Tenant routes
app.use('/api/v1/org/:slug/locations', tenantMiddleware, locationsRouter);
app.use('/api/v1/org/:slug/shifts', tenantMiddleware, shiftsRouter);
app.use('/api/v1/org/:slug/swaps', tenantMiddleware, swapsRouter);
app.use('/api/v1/org/:slug/notifications', tenantMiddleware, notificationsRouter);
app.use('/api/v1/org/:slug/time-entries', tenantMiddleware, timeEntriesRouter);
app.use('/api/v1/org/:slug/time-entries', tenantMiddleware, breaksRouter);
app.use('/api/v1/org/:slug/corrections', tenantMiddleware, correctionsRouter);
app.use('/api/v1/org/:slug/members', tenantMiddleware, membersRouter);
app.use('/api/v1/org/:slug/reports', tenantMiddleware, reportsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (4 parameters required for Express error handling)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`✅ API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

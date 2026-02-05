import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { inspectorAuth } from './middleware/inspectorAuth.js';
import { testConnection } from './db/index.js';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

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

// Admin routes (placeholder)
app.use('/api/admin/*', requireAdmin, (_req: Request, res: Response) => {
  res.json({ message: 'Admin routes active' });
});

// Inspector routes (placeholder)
app.use('/api/inspector/v1/*', inspectorAuth, (_req: Request, res: Response) => {
  res.json({ message: 'Inspector routes active' });
});

// Tenant routes (placeholder)
app.use('/api/v1/org/:slug/*', tenantMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Tenant routes active', org: req.organizationId });
});

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

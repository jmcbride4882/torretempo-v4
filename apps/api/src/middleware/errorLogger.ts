import { Request, Response, NextFunction } from 'express';
import { logError, extractErrorContext } from '../services/errorLog.service.js';

/**
 * Express error handling middleware
 * Must be registered LAST (after all routes)
 * Logs errors to error_logs table and returns JSON response
 */
export function errorLogger(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Determine status code
  const statusCode = (err as any).statusCode || (err as any).status || 500;

  // Log to console (for development)
  console.error('[API Error]', {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Log to database (async, non-blocking)
  const errorData = extractErrorContext(req, err, statusCode);
  logError(errorData).catch((logErr) => {
    console.error('[ErrorLogger] Failed to log error to database:', logErr);
  });

  // Send response
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: statusCode >= 500 ? 'Internal server error' : err.message,
    });
  }
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error middleware
 * 
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

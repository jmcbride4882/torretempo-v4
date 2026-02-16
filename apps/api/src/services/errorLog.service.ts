import { Request } from 'express';
import { db } from '../db/index.js';
import { error_logs } from '../db/schema.js';
import logger from '../lib/logger.js';

export interface ErrorLogData {
  level: 'error' | 'warning' | 'info';
  message: string;
  source: 'api' | 'web' | 'system' | 'queue' | 'database';
  stack?: string;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  httpMethod?: string;
  httpPath?: string;
  httpStatus?: number;
  metadata?: Record<string, any>;
}

/**
 * Log an error to the error_logs table
 */
export async function logError(data: ErrorLogData): Promise<void> {
  try {
    await db.insert(error_logs).values({
      level: data.level,
      message: data.message,
      source: data.source,
      stack: data.stack,
      user_id: data.userId,
      organization_id: data.organizationId,
      request_id: data.requestId,
      http_method: data.httpMethod,
      http_path: data.httpPath,
      http_status: data.httpStatus,
      metadata: data.metadata ? data.metadata : null,
    });
  } catch (err) {
    // Fail silently - don't break the app if error logging fails
    logger.error('[ErrorLog] Failed to log error:', err);
  }
}

/**
 * Extract error log data from Express request
 */
export function extractErrorContext(
  req: Request,
  error: Error,
  statusCode: number
): ErrorLogData {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  const organizationId = req.organizationId || (req.params?.slug ? req.organizationId : undefined);

  return {
    level: 'error',
    message: error.message || 'Unknown error',
    source: 'api',
    stack: error.stack,
    userId: actor?.id,
    organizationId,
    requestId: req.headers['x-request-id'] as string,
    httpMethod: req.method,
    httpPath: req.path,
    httpStatus: statusCode,
    metadata: {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
      query: req.query,
      body: sanitizeBody(req.body),
    },
  };
}

/**
 * Remove sensitive data from request body before logging
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'pin'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Log a warning (non-critical issue)
 */
export async function logWarning(
  message: string,
  source: ErrorLogData['source'],
  metadata?: Record<string, any>
): Promise<void> {
  await logError({
    level: 'warning',
    message,
    source,
    metadata,
  });
}

/**
 * Log an info message (for debugging/monitoring)
 */
export async function logInfo(
  message: string,
  source: ErrorLogData['source'],
  metadata?: Record<string, any>
): Promise<void> {
  await logError({
    level: 'info',
    message,
    source,
    metadata,
  });
}

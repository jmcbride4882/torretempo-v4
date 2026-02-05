import { Router, Request, Response } from 'express';
import { queues, redisConnection } from '../../lib/queue.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import type { 
  SystemHealthResponse, 
  QueueMetrics, 
  FailedJobSummary 
} from '../../types/admin-types.js';

/**
 * Admin System Health Routes
 * Platform admins can monitor system health, queue metrics, and manage failed jobs
 * 
 * Security:
 * - Requires admin role
 * - All retry operations logged to admin_audit_log
 * - Read-only health checks (no auth required for internal health endpoint)
 */

const router = Router();

/**
 * GET /api/admin/system/health
 * Get comprehensive system health including Redis, database, and queue metrics
 * 
 * Returns:
 * - status: 'healthy' | 'degraded' | 'unhealthy'
 * - redis: Connection status and memory usage
 * - queues: Job counts for all queues
 * - failedJobs: Summary of failed jobs per queue
 * - uptime: Process uptime in seconds
 */
router.get(
  '/health',
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const healthData: Partial<SystemHealthResponse> = {
        timestamp: new Date(),
        uptime: process.uptime(),
      };

      // Check Redis connection
      try {
        const pingStart = Date.now();
        await redisConnection.ping();
        const pingDuration = Date.now() - pingStart;

        // Get Redis memory info
        const memoryInfo = await redisConnection.info('memory');
        const usedMemoryMatch = memoryInfo.match(/used_memory:(\d+)/);
        const peakMemoryMatch = memoryInfo.match(/used_memory_peak:(\d+)/);

        healthData.redis = {
          status: 'connected',
          ping: pingDuration,
          memory: {
            used: usedMemoryMatch?.[1] ? parseInt(usedMemoryMatch[1], 10) : 0,
            peak: peakMemoryMatch?.[1] ? parseInt(peakMemoryMatch[1], 10) : 0,
          },
        };
      } catch (error) {
        console.error('Redis health check failed:', error);
        healthData.redis = {
          status: 'disconnected',
          ping: 0,
          memory: {
            used: 0,
            peak: 0,
          },
        };
      }

      // Check database connection (simple query)
      try {
        const dbStart = Date.now();
        // Import db here to avoid circular dependencies
        const { db } = await import('../../db/index.js');
        const { sql } = await import('drizzle-orm');
        
        await db.execute(sql`SELECT 1`);
        const dbDuration = Date.now() - dbStart;

        healthData.database = {
          status: 'connected',
          responseTime: dbDuration,
          connectionCount: 0, // Would need pg pool stats for this
        };
      } catch (error) {
        console.error('Database health check failed:', error);
        healthData.database = {
          status: 'disconnected',
          responseTime: 0,
          connectionCount: 0,
        };
      }

      // Get queue metrics
      const queueMetrics: QueueMetrics[] = [];
      const failedJobsSummary: FailedJobSummary[] = [];

      for (const [queueName, queue] of Object.entries(queues)) {
        try {
          // Get job counts for this queue
          const counts = await queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed', 'paused');

          queueMetrics.push({
            name: queueName as QueueMetrics['name'],
            pending: counts.wait || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0,
            paused: counts.paused || 0,
          });

          // Get failed jobs summary
          const failedCount = counts.failed || 0;
          if (failedCount > 0) {
            const failedJobs = await queue.getFailed(0, Math.min(3, failedCount));
            
            const recentErrors = await Promise.all(
              failedJobs.slice(0, 3).map(async (job) => {
                const fullJob = await queue.getJob(job.id!);
                return {
                  jobId: job.id!,
                  error: fullJob?.failedReason || 'Unknown error',
                  failedAt: fullJob?.finishedOn ? new Date(fullJob.finishedOn) : new Date(),
                };
              })
            );

            failedJobsSummary.push({
              queueName,
              failedCount,
              oldestFailedAt: failedJobs.length > 0 && failedJobs[0]?.finishedOn 
                ? new Date(failedJobs[0].finishedOn) 
                : null,
              recentErrors,
            });
          }
        } catch (error) {
          console.error(`Error getting metrics for queue ${queueName}:`, error);
          // Add queue with zero metrics if error
          queueMetrics.push({
            name: queueName as QueueMetrics['name'],
            pending: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
          });
        }
      }

      healthData.queues = queueMetrics;
      healthData.failedJobs = failedJobsSummary;

      // Determine overall status
      let status: SystemHealthResponse['status'] = 'healthy';
      
      if (healthData.redis?.status === 'disconnected' || healthData.database?.status === 'disconnected') {
        status = 'unhealthy';
      } else {
        const totalFailed = queueMetrics.reduce((sum, q) => sum + q.failed, 0);
        const totalActive = queueMetrics.reduce((sum, q) => sum + q.active, 0);
        
        if (totalFailed > 100 || totalActive > 1000) {
          status = 'degraded';
        }
      }

      healthData.status = status;

      res.json(healthData as SystemHealthResponse);
    } catch (error) {
      console.error('Error getting system health:', error);
      res.status(500).json({ 
        error: 'Failed to get system health',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/system/queues/:queueName/failed
 * Get detailed failed jobs for a specific queue
 * 
 * Params:
 * - queueName: Name of the queue (email, pdf, notification, compliance, monthly, backup)
 * 
 * Query:
 * - limit: number (default 50, max 100) - Number of failed jobs to return
 * 
 * Returns:
 * - jobs: Array of failed job details with id, name, data, failedReason, stackTrace, attemptsMade, failedAt
 * - total: Total number of failed jobs
 */
router.get(
  '/queues/:queueName/failed',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const queueName = Array.isArray(req.params.queueName) 
        ? req.params.queueName[0] 
        : req.params.queueName;
      const limit = Math.min(
        parseInt(req.query.limit as string) || 50,
        100
      );

      // Validate queue name
      if (!queueName || !(queueName in queues)) {
        return res.status(404).json({ 
          error: 'Queue not found',
          validQueues: Object.keys(queues)
        });
      }

      const queue = queues[queueName as keyof typeof queues];

      // Get failed job count
      const failedCount = await queue.getFailedCount();

      // Get failed jobs (paginated)
      const failedJobs = await queue.getFailed(0, Math.min(limit, failedCount));

      // Get full job details
      const jobDetails = await Promise.all(
        failedJobs.map(async (job) => {
          const fullJob = await queue.getJob(job.id!);
          
          if (!fullJob) {
            return null;
          }

          return {
            id: fullJob.id!,
            name: fullJob.name,
            data: fullJob.data,
            failedReason: fullJob.failedReason || null,
            stackTrace: fullJob.stacktrace || null,
            attemptsMade: fullJob.attemptsMade,
            failedAt: fullJob.finishedOn ? new Date(fullJob.finishedOn) : null,
            processedOn: fullJob.processedOn ? new Date(fullJob.processedOn) : null,
          };
        })
      );

      // Filter out null entries
      const validJobDetails = jobDetails.filter(job => job !== null);

      res.json({
        queueName,
        total: failedCount,
        returned: validJobDetails.length,
        limit,
        jobs: validJobDetails,
      });
    } catch (error) {
      console.error('Error getting failed jobs:', error);
      res.status(500).json({ 
        error: 'Failed to get failed jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/admin/system/queues/:queueName/jobs/:jobId/retry
 * Retry a failed job
 * 
 * Params:
 * - queueName: Name of the queue
 * - jobId: Job ID to retry
 * 
 * Returns:
 * - message: Success message
 * - job: Job details
 */
router.post(
  '/queues/:queueName/jobs/:jobId/retry',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const queueName = Array.isArray(req.params.queueName) 
        ? req.params.queueName[0] 
        : req.params.queueName;
      const jobId = Array.isArray(req.params.jobId) 
        ? req.params.jobId[0] 
        : req.params.jobId;
      const actor = req.user;

      // Verify actor exists
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized: No user found in session' });
      }

      // Validate queue name
      if (!queueName || !(queueName in queues)) {
        return res.status(404).json({ 
          error: 'Queue not found',
          validQueues: Object.keys(queues)
        });
      }

      const queue = queues[queueName as keyof typeof queues];

      // Validate job ID
      if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
      }

      // Get job
      const job = await queue.getJob(jobId);

      if (!job) {
        return res.status(404).json({ 
          error: 'Job not found',
          jobId,
          queueName
        });
      }

      // Retry the job
      await job.retry();

      // Log admin action
      await logAdminAction({
        adminId: actor.id,
        action: 'queue.retry_job',
        targetType: 'bullmq_job',
        targetId: jobId,
        details: {
          queueName,
          jobName: job.name,
          attemptsMade: job.attemptsMade,
          previousFailureReason: job.failedReason || null,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.json({
        message: 'Job retry initiated successfully',
        job: {
          id: job.id!,
          name: job.name,
          queueName,
          attemptsMade: job.attemptsMade,
          state: await job.getState(),
        },
      });
    } catch (error) {
      console.error('Error retrying job:', error);
      res.status(500).json({ 
        error: 'Failed to retry job',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

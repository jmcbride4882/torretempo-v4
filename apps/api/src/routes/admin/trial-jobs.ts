import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import { trialQueue } from '../../lib/queue.js';
import logger from '../../lib/logger.js';

const router = Router();

/**
 * POST /api/admin/trial-jobs/create
 * Create a new scheduled trial job
 */
router.post(
  '/create',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { jobType, schedule, organizationId, userId, reason, daysToExtend } = req.body;

      if (!jobType || !organizationId) {
        return res.status(400).json({
          error: 'Job type and organizationId are required',
        });
      }

      // Validate job type
      const validJobTypes = ['trial-reminder', 'trial-expired', 'trial-downgraded', 'trial-grace_ended', 'trial-extended'];
      if (!validJobTypes.includes(jobType)) {
        return res.status(400).json({
          error: `Invalid job type: ${jobType}. Valid types: ${validJobTypes.join(', ')}`,
        });
      }

      // Build job data
      const jobData: Record<string, unknown> = {
        type: jobType,
        organizationId,
      };
      if (userId) jobData.userId = userId;
      if (reason) jobData.reason = reason;
      if (daysToExtend) jobData.daysToExtend = daysToExtend;

      // Add job to trial queue (with optional repeat schedule)
      const jobOptions: Record<string, unknown> = {};
      if (schedule && typeof schedule === 'string') {
        jobOptions.repeat = { pattern: schedule };
      }

      const job = await trialQueue.add(jobType, jobData, jobOptions);

      // Log admin action
      await logAdminAction({
        adminId: req.user!.id,
        action: 'trial.job.created',
        targetType: 'trial_job',
        targetId: job.id ?? 'unknown',
        details: {
          job_type: jobType,
          schedule: schedule ?? null,
          organization_id: organizationId,
          user_id: userId ?? null,
          reason: reason ?? null,
          days_to_extend: daysToExtend ?? null,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.status(201).json({
        message: 'Trial job created successfully',
        data: {
          jobId: job.id,
          jobType,
          schedule: schedule ?? null,
        },
      });
    } catch (error) {
      logger.error('Error creating trial job:', error);
      res.status(500).json({
        error: 'Failed to create trial job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/trial-jobs
 * List all trial jobs from the BullMQ queue
 */
router.get(
  '/',
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      // Get jobs from BullMQ queue (stored in Redis, not database)
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        trialQueue.getJobs(['waiting'], 0, 50),
        trialQueue.getJobs(['active'], 0, 50),
        trialQueue.getJobs(['completed'], 0, 50),
        trialQueue.getJobs(['failed'], 0, 50),
        trialQueue.getJobs(['delayed'], 0, 50),
      ]);

      const allJobs = [...waiting, ...active, ...completed, ...failed, ...delayed];

      const jobList = allJobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        status: job.finishedOn
          ? (job.failedReason ? 'failed' : 'completed')
          : (job.delay ? 'delayed' : 'active'),
        createdAt: job.timestamp,
        finishedOn: job.finishedOn ?? null,
        failedReason: job.failedReason ?? null,
        attemptsMade: job.attemptsMade,
      }));

      res.status(200).json({
        data: jobList,
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: allJobs.length,
        },
      });
    } catch (error) {
      logger.error('Error listing trial jobs:', error);
      res.status(500).json({
        error: 'Failed to list trial jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/trial-jobs/:id
 * Get specific trial job details
 */
router.get(
  '/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
      }

      const job = await trialQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const state = await job.getState();

      res.status(200).json({
        data: {
          id: job.id,
          name: job.name,
          data: job.data,
          status: state,
          createdAt: job.timestamp,
          finishedOn: job.finishedOn ?? null,
          failedReason: job.failedReason ?? null,
          attemptsMade: job.attemptsMade,
          opts: job.opts,
        },
      });
    } catch (error) {
      logger.error('Error getting trial job:', error);
      res.status(500).json({
        error: 'Failed to get trial job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/admin/trial-jobs/:id/cancel
 * Cancel/remove a trial job
 */
router.post(
  '/:id/cancel',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
      }

      const job = await trialQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const state = await job.getState();

      if (state === 'completed' || state === 'failed') {
        return res.status(400).json({
          error: 'Cannot cancel completed or failed jobs',
        });
      }

      // Remove the job from the queue
      await job.remove();

      // Log admin action
      await logAdminAction({
        adminId: req.user!.id,
        action: 'trial.job.cancelled',
        targetType: 'trial_job',
        targetId: jobId,
        details: {
          original_status: state,
          cancelled_by: req.user!.id,
        },
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.status(200).json({
        message: 'Trial job cancelled successfully',
        data: { jobId },
      });
    } catch (error) {
      logger.error('Error cancelling trial job:', error);
      res.status(500).json({
        error: 'Failed to cancel trial job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;

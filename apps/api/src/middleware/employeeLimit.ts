import { Request, Response, NextFunction, RequestHandler } from 'express';
import { checkEmployeeLimit } from '../services/subscription.service.js';
import logger from '../lib/logger.js';

/**
 * Employee Limit Middleware
 * Soft enforcement of employee limits on member invite routes
 *
 * - Checks current_employee_count vs plan_employee_limit
 * - Returns 403 if at limit with upgrade message
 * - Returns 403 if over limit (shouldn't happen) with suspension message
 * - Allows request if under limit or unlimited plan
 *
 * Usage (optional middleware on invite routes):
 * app.post('/members/invite', employeeLimit(), handler)
 */
export function employeeLimit(): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get organization ID from request context
      // Assumes tenant middleware has already set req.organizationId
      const organizationId = req.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID not found in request' });
        return;
      }

      // Check employee limit
      const limitCheck = await checkEmployeeLimit(organizationId);

      // If over limit (shouldn't happen in normal flow)
      if (limitCheck.current > (limitCheck.limit || Infinity)) {
        res.status(403).json({
          error: 'Account suspended - over employee limit',
          message: `Your organization has exceeded the employee limit (${limitCheck.current}/${limitCheck.limit}). Please contact support.`,
          current: limitCheck.current,
          limit: limitCheck.limit,
        });
        return;
      }

      // If at capacity
      if (limitCheck.atCapacity) {
        res.status(403).json({
          error: 'Employee limit reached',
          message: `Your organization has reached the employee limit (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to add more employees.`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          action: 'upgrade_plan',
        });
        return;
      }

      // Within limit or unlimited - allow request to proceed
      next();
    } catch (error) {
      logger.error('Employee limit middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

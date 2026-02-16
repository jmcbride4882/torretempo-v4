import { Router, Request, Response } from 'express';
import { verifyAuditChain } from '../../services/audit.service.js';
import { requireRole } from '../../middleware/requireRole.js';
import logger from '../../lib/logger.js';

const router = Router();

/**
 * GET /api/v1/org/:slug/audit/verify/:entryId
 * Verify audit chain integrity for time entries
 * Manager+ only
 * 
 * Returns:
 * - valid: boolean - Whether the audit chain is valid
 * - chainLength: number - Number of entries in the chain
 * - lastHash: string - Hash of the last entry
 * - tamperedAt?: number - Index of first tampered entry (if invalid)
 */
router.get(
  '/:entryId',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const entryId = req.params.entryId as string;
      const orgId = req.organizationId!;

      // Validate entryId parameter
      if (!entryId) {
        return res.status(400).json({ error: 'entryId parameter is required' });
      }

      // Verify audit chain
      const result = await verifyAuditChain({
        orgId,
        targetEntryId: entryId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Audit verification failed:', error);
      
      // Check if error is about target entry not found
      if (error instanceof Error && error.message.includes('not found in audit chain')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to verify audit chain' });
    }
  }
);

export default router;

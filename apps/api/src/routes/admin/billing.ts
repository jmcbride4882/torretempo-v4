import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import {
  createStripeInvoice,
  createStripeRefund,
  applyStripeCredit,
} from '../../services/payment.service.js';
import logger from '../../lib/logger.js';

/**
 * Admin Billing Operations Routes
 * Platform admins can perform manual billing operations
 */

const router = Router();

// POST /api/admin/billing/invoice - Create manual invoice
router.post('/invoice', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customer_id, amount, description } = req.body;

    if (!customer_id || !amount || !description) {
      return res.status(400).json({ error: 'customer_id, amount, and description are required' });
    }

    const invoice = await createStripeInvoice(
      customer_id,
      parseFloat(amount),
      description,
      { admin_id: actor.id, manual: 'true' }
    );

    await logAdminAction({
      adminId: actor.id,
      action: 'billing.create_invoice',
      targetType: 'invoice',
      targetId: invoice.id,
      details: { customer_id, amount, description },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.json({ invoice });
  } catch (error) {
    logger.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// POST /api/admin/billing/refund - Process refund
router.post('/refund', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { payment_intent_id, amount, reason } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'payment_intent_id is required' });
    }

    const refund = await createStripeRefund(
      payment_intent_id,
      amount ? parseFloat(amount) : undefined,
      reason
    );

    await logAdminAction({
      adminId: actor.id,
      action: 'billing.refund',
      targetType: 'refund',
      targetId: refund.id,
      details: { payment_intent_id, amount, reason },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.json({ refund });
  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// POST /api/admin/billing/credit - Apply account credit
router.post('/credit', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customer_id, amount, description } = req.body;

    if (!customer_id || !amount || !description) {
      return res.status(400).json({ error: 'customer_id, amount, and description are required' });
    }

    const result = await applyStripeCredit(
      customer_id,
      parseFloat(amount),
      description
    );

    await logAdminAction({
      adminId: actor.id,
      action: 'billing.apply_credit',
      targetType: 'credit',
      targetId: customer_id,
      details: { customer_id, amount, description },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });

    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error applying credit:', error);
    res.status(500).json({ error: 'Failed to apply credit' });
  }
});

export default router;

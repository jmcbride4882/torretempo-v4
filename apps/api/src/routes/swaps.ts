import { Router, Request, Response } from 'express';
import { and, eq, or, inArray, desc, ne, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shifts, swap_requests, member } from '../db/schema.js';
import { requireRole } from '../middleware/requireRole.js';
import { rightToDisconnect } from '../middleware/rightToDisconnect.js';
import { logAudit } from '../services/audit.service.js';
import { sendSwapNotification } from '../services/notification.service.js';
import logger from '../lib/logger.js';

const router = Router();

const ACTIVE_STATUSES = ['pending_peer', 'pending_manager', 'approved'];
const MANAGER_ROLES = ['manager', 'tenantAdmin', 'owner'];

function getActor(req: Request, res: Response): { id: string; role: string } | null {
  const actor = (req.user ?? (req.session?.user as any)) as any;
  if (!actor?.id) {
    res.status(401).json({ error: 'Unauthorized: No user found in session' });
    return null;
  }
  return { id: actor.id, role: actor.role || 'employee' };
}

async function hasConflictingSwap(
  organizationId: string,
  offeredShiftId: string,
  desiredShiftId?: string | null,
  excludeSwapId?: string
): Promise<boolean> {
  const conflictConditions = [
    eq(swap_requests.offered_shift_id, offeredShiftId),
    eq(swap_requests.desired_shift_id, offeredShiftId),
  ];

  if (desiredShiftId) {
    conflictConditions.push(eq(swap_requests.offered_shift_id, desiredShiftId));
    conflictConditions.push(eq(swap_requests.desired_shift_id, desiredShiftId));
  }

  const whereConditions: any[] = [
    eq(swap_requests.organization_id, organizationId),
    inArray(swap_requests.status, ACTIVE_STATUSES),
    or(...conflictConditions),
  ];

  if (excludeSwapId) {
    whereConditions.push(ne(swap_requests.id, excludeSwapId));
  }

  const existing = await db
    .select({ id: swap_requests.id })
    .from(swap_requests)
    .where(and(...whereConditions))
    .limit(1);

  return existing.length > 0;
}

// GET /api/v1/org/:slug/swaps - List swap requests
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const status = req.query.status as string | undefined;
    const requester_id = req.query.requester_id as string | undefined;
    const recipient_id = req.query.recipient_id as string | undefined;
    const offered_shift_id = req.query.offered_shift_id as string | undefined;
    const desired_shift_id = req.query.desired_shift_id as string | undefined;
    const manager_id = req.query.manager_id as string | undefined;

    const conditions: any[] = [eq(swap_requests.organization_id, organizationId)];

    if (status) {
      const statuses = status.split(',').map((value) => value.trim());
      conditions.push(inArray(swap_requests.status, statuses));
    }
    if (requester_id) {
      conditions.push(eq(swap_requests.requester_id, requester_id));
    }
    if (recipient_id) {
      conditions.push(eq(swap_requests.recipient_id, recipient_id));
    }
    if (offered_shift_id) {
      conditions.push(eq(swap_requests.offered_shift_id, offered_shift_id));
    }
    if (desired_shift_id) {
      conditions.push(eq(swap_requests.desired_shift_id, desired_shift_id));
    }
    if (manager_id) {
      conditions.push(eq(swap_requests.manager_id, manager_id));
    }

    const result = await db
      .select()
      .from(swap_requests)
      .where(and(...conditions))
      .orderBy(desc(swap_requests.created_at));

    res.json({ swaps: result });
  } catch (error) {
    logger.error('Error fetching swaps:', error);
    res.status(500).json({ error: 'Failed to fetch swaps' });
  }
});

// GET /api/v1/org/:slug/swaps/mine - List my swap requests (as requester)
router.get('/mine', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const status = req.query.status as string | undefined;

    const conditions: any[] = [
      eq(swap_requests.organization_id, organizationId),
      eq(swap_requests.requester_id, actor.id),
    ];

    if (status) {
      const statuses = status.split(',').map((value) => value.trim());
      conditions.push(inArray(swap_requests.status, statuses));
    }

    const results = await db
      .select()
      .from(swap_requests)
      .where(and(...conditions))
      .orderBy(desc(swap_requests.created_at));

    // Transform to match frontend types
    const swaps = results.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      offered_shift_id: r.offered_shift_id,
      desired_shift_id: r.desired_shift_id || null,
      requester_id: r.requester_id,
      recipient_id: r.recipient_id || null,
      manager_id: r.manager_id || null,
      status: r.status,
      reason: r.reason || null,
      rejection_reason: null,
      rejected_by: null,
      created_at: r.created_at.toISOString(),
      updated_at: r.created_at.toISOString(),
      peer_responded_at: null,
      manager_responded_at: r.resolved_at?.toISOString() || null,
      completed_at: r.status === 'completed' ? r.resolved_at?.toISOString() || null : null,
      expires_at: null,
    }));

    res.json({ swaps });
  } catch (error) {
    logger.error('Error fetching my swaps:', error);
    res.status(500).json({ error: 'Failed to fetch swaps' });
  }
});

// GET /api/v1/org/:slug/swaps/pending - List swaps pending my action
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const pendingConditions: any[] = [];

    pendingConditions.push(
      and(
        eq(swap_requests.status, 'pending_peer'),
        eq(swap_requests.recipient_id, actor.id)
      )
    );

    if (MANAGER_ROLES.includes(actor.role)) {
      pendingConditions.push(eq(swap_requests.status, 'pending_manager'));
    }

    if (pendingConditions.length === 0) {
      res.json({ swaps: [] });
      return;
    }

    const results = await db
      .select()
      .from(swap_requests)
      .where(and(eq(swap_requests.organization_id, organizationId), or(...pendingConditions)))
      .orderBy(desc(swap_requests.created_at));

    // Transform to match frontend types
    const swaps = results.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      offered_shift_id: r.offered_shift_id,
      desired_shift_id: r.desired_shift_id || null,
      requester_id: r.requester_id,
      recipient_id: r.recipient_id || null,
      manager_id: r.manager_id || null,
      status: r.status,
      reason: r.reason || null,
      rejection_reason: null, // TODO: Add to schema
      rejected_by: null, // TODO: Add to schema
      created_at: r.created_at.toISOString(),
      updated_at: r.created_at.toISOString(), // Use created_at as fallback
      peer_responded_at: null, // TODO: Add to schema
      manager_responded_at: r.resolved_at?.toISOString() || null,
      completed_at: r.status === 'completed' ? r.resolved_at?.toISOString() || null : null,
      expires_at: null, // TODO: Add to schema
    }));

    res.json({ swaps });
  } catch (error) {
    logger.error('Error fetching pending swaps:', error);
    res.status(500).json({ error: 'Failed to fetch pending swaps' });
  }
});

// GET /api/v1/org/:slug/swaps/pending-count - Get count of swaps pending my action
router.get('/pending-count', async (req: Request, res: Response) => {
  try {
    const actor = getActor(req, res);
    if (!actor) {
      return;
    }

    const organizationId = req.organizationId!;
    const pendingConditions: any[] = [];

    pendingConditions.push(
      and(
        eq(swap_requests.status, 'pending_peer'),
        eq(swap_requests.recipient_id, actor.id)
      )
    );

    if (MANAGER_ROLES.includes(actor.role)) {
      pendingConditions.push(eq(swap_requests.status, 'pending_manager'));
    }

    if (pendingConditions.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(swap_requests)
      .where(and(eq(swap_requests.organization_id, organizationId), or(...pendingConditions)));

    const count = Number(result[0]?.count || 0);
    res.json({ count });
  } catch (error) {
    logger.error('Error fetching pending swap count:', error);
    res.status(500).json({ error: 'Failed to fetch pending swap count' });
  }
});

// POST /api/v1/org/:slug/swaps - Create new swap request
router.post(
  '/',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  rightToDisconnect,
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const { offered_shift_id, recipient_id, desired_shift_id, reason } = req.body;

      if (!offered_shift_id) {
        return res.status(400).json({ error: 'offered_shift_id is required' });
      }

      // Fetch offered shift
      const offeredShiftResult = await db
        .select()
        .from(shifts)
        .where(and(eq(shifts.id, offered_shift_id), eq(shifts.organization_id, organizationId)))
        .limit(1);

      if (offeredShiftResult.length === 0) {
        return res.status(404).json({ error: 'Offered shift not found' });
      }

      const offeredShift = offeredShiftResult[0]!;

      if (offeredShift.user_id !== actor.id) {
        return res.status(403).json({ error: 'You can only offer your own shifts' });
      }

      if (offeredShift.status === 'draft') {
        return res.status(400).json({ error: 'Cannot swap draft shifts' });
      }

      let resolvedRecipientId = recipient_id as string | null | undefined;
      let resolvedDesiredShiftId = desired_shift_id as string | null | undefined;

      if (resolvedDesiredShiftId) {
        const desiredShiftResult = await db
          .select()
          .from(shifts)
          .where(
            and(
              eq(shifts.id, resolvedDesiredShiftId),
              eq(shifts.organization_id, organizationId)
            )
          )
          .limit(1);

        if (desiredShiftResult.length === 0) {
          return res.status(404).json({ error: 'Desired shift not found' });
        }

        const desiredShift = desiredShiftResult[0]!;

        if (!desiredShift.user_id) {
          return res.status(400).json({ error: 'Desired shift must be assigned to a user' });
        }

        if (desiredShift.status === 'draft') {
          return res.status(400).json({ error: 'Cannot swap draft shifts' });
        }

        if (resolvedRecipientId && desiredShift.user_id !== resolvedRecipientId) {
          return res.status(400).json({ error: 'desired_shift_id does not belong to recipient_id' });
        }

        resolvedRecipientId = desiredShift.user_id;
      }

      if (resolvedRecipientId) {
        if (resolvedRecipientId === actor.id) {
          return res.status(400).json({ error: 'Cannot create a swap with yourself' });
        }

        const memberResult = await db
          .select()
          .from(member)
          .where(
            and(eq(member.organizationId, organizationId), eq(member.userId, resolvedRecipientId))
          )
          .limit(1);

        if (memberResult.length === 0) {
          return res.status(400).json({ error: 'Recipient is not a member of this organization' });
        }
      }

      if (resolvedDesiredShiftId && resolvedDesiredShiftId === offered_shift_id) {
        return res.status(400).json({ error: 'Desired shift must be different from offered shift' });
      }

      const hasConflicts = await hasConflictingSwap(
        organizationId,
        offered_shift_id,
        resolvedDesiredShiftId
      );

      if (hasConflicts) {
        return res.status(409).json({ error: 'Conflicting swap request exists for one of the shifts' });
      }

      const created = await db
        .insert(swap_requests)
        .values({
          organization_id: organizationId,
          requester_id: actor.id,
          offered_shift_id,
          recipient_id: resolvedRecipientId || null,
          desired_shift_id: resolvedDesiredShiftId || null,
          status: 'pending_peer',
          reason: reason || null,
        })
        .returning();

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'swap.create',
        entityType: 'swap_requests',
        entityId: created[0]!.id,
        newData: created[0],
      });

      // Send notification to recipient (or all employees if open request)
      if (resolvedRecipientId) {
        await sendSwapNotification('swap_requested', resolvedRecipientId, {
          organizationId,
          swapId: created[0]!.id,
          title: 'New Swap Request',
          message: 'You have a new shift swap request',
          link: `/t/${organizationId}/swaps`,
        });
      }

      res.status(201).json({ swap: created[0] });
    } catch (error) {
      logger.error('Error creating swap request:', error);
      res.status(500).json({ error: 'Failed to create swap request' });
    }
  }
);

// PUT /api/v1/org/:slug/swaps/:id/respond-peer - Peer responds (accept/reject)
router.put(
  '/:id/respond-peer',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;
      const decision = req.body.decision as string | undefined;

      if (!decision || !['accept', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'decision must be accept or reject' });
      }

      const existing = await db
        .select()
        .from(swap_requests)
        .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Swap request not found' });
      }

      const swap = existing[0]!;

      if (swap.status !== 'pending_peer') {
        return res.status(400).json({ error: 'Swap request is not awaiting peer response' });
      }

      if (!swap.recipient_id) {
        return res.status(400).json({ error: 'Swap request must be claimed before responding' });
      }

      if (swap.recipient_id !== actor.id) {
        return res.status(403).json({ error: 'You are not the recipient for this swap request' });
      }

      if (!swap.desired_shift_id) {
        return res.status(400).json({ error: 'Swap request missing desired_shift_id' });
      }

      if (decision === 'reject') {
        const updated = await db
          .update(swap_requests)
          .set({ status: 'rejected', resolved_at: new Date() })
          .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
          .returning();

        await logAudit({
          orgId: organizationId,
          actorId: actor.id,
          action: 'swap.peer_reject',
          entityType: 'swap_requests',
          entityId: id,
          oldData: swap,
          newData: updated[0],
        });

        // Notify requester of rejection
        await sendSwapNotification('swap_rejected', swap.requester_id, {
          organizationId,
          swapId: id,
          title: 'Swap Request Rejected',
          message: 'Your shift swap request was rejected',
          link: `/t/${organizationId}/swaps`,
        });

        return res.json({ swap: updated[0] });
      }

      const updated = await db
        .update(swap_requests)
        .set({ status: 'pending_manager' })
        .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
        .returning();

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'swap.peer_accept',
        entityType: 'swap_requests',
        entityId: id,
        oldData: swap,
        newData: updated[0],
      });

      res.json({ swap: updated[0] });
    } catch (error) {
      logger.error('Error responding to swap request:', error);
      res.status(500).json({ error: 'Failed to respond to swap request' });
    }
  }
);

// PUT /api/v1/org/:slug/swaps/:id/respond-manager - Manager responds (approve/reject)
router.put(
  '/:id/respond-manager',
  requireRole(['manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;
      const decision = req.body.decision as string | undefined;

      if (!decision || !['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'decision must be approve or reject' });
      }

      const existing = await db
        .select()
        .from(swap_requests)
        .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Swap request not found' });
      }

      const swap = existing[0]!;

      if (swap.status !== 'pending_manager') {
        return res.status(400).json({ error: 'Swap request is not awaiting manager approval' });
      }

      if (!swap.recipient_id || !swap.desired_shift_id) {
        return res.status(400).json({ error: 'Swap request missing recipient or desired shift' });
      }

      const recipientId = swap.recipient_id;
      const desiredShiftId = swap.desired_shift_id;

      if (decision === 'reject') {
        const updated = await db
          .update(swap_requests)
          .set({ status: 'rejected', resolved_at: new Date(), manager_id: actor.id })
          .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
          .returning();

        await logAudit({
          orgId: organizationId,
          actorId: actor.id,
          action: 'swap.manager_reject',
          entityType: 'swap_requests',
          entityId: id,
          oldData: swap,
          newData: updated[0],
        });

        // Notify requester of manager rejection
        await sendSwapNotification('swap_rejected', swap.requester_id, {
          organizationId,
          swapId: id,
          title: 'Swap Request Rejected',
          message: 'Your shift swap request was rejected by a manager',
          link: `/t/${organizationId}/swaps`,
        });

        return res.json({ swap: updated[0] });
      }

      const hasConflicts = await hasConflictingSwap(
        organizationId,
        swap.offered_shift_id,
        desiredShiftId,
        id
      );

      if (hasConflicts) {
        return res.status(409).json({ error: 'Conflicting swap request exists for one of the shifts' });
      }

      const result = await db.transaction(async (tx) => {
        const approved = await tx
          .update(swap_requests)
          .set({ status: 'approved', manager_id: actor.id })
          .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
          .returning();

        const offeredShiftResult = await tx
          .select()
          .from(shifts)
          .where(and(eq(shifts.id, swap.offered_shift_id), eq(shifts.organization_id, organizationId)))
          .limit(1);

        const desiredShiftResult = await tx
          .select()
          .from(shifts)
          .where(and(eq(shifts.id, desiredShiftId), eq(shifts.organization_id, organizationId)))
          .limit(1);

        if (offeredShiftResult.length === 0 || desiredShiftResult.length === 0) {
          throw new Error('Shift not found for swap');
        }

        const offeredShift = offeredShiftResult[0]!;
        const desiredShift = desiredShiftResult[0]!;

        if (offeredShift.user_id !== swap.requester_id) {
          throw new Error('Offered shift is no longer assigned to requester');
        }

        if (desiredShift.user_id !== recipientId) {
          throw new Error('Desired shift is no longer assigned to recipient');
        }

        await tx
          .update(shifts)
          .set({ user_id: recipientId, updated_at: new Date() })
          .where(and(eq(shifts.id, swap.offered_shift_id), eq(shifts.organization_id, organizationId)));

        await tx
          .update(shifts)
          .set({ user_id: swap.requester_id, updated_at: new Date() })
          .where(and(eq(shifts.id, desiredShiftId), eq(shifts.organization_id, organizationId)));

        const completed = await tx
          .update(swap_requests)
          .set({ status: 'completed', resolved_at: new Date() })
          .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
          .returning();

        return { approved: approved[0]!, completed: completed[0]! };
      });

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'swap.manager_approve',
        entityType: 'swap_requests',
        entityId: id,
        oldData: swap,
        newData: result.approved,
      });

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'swap.complete',
        entityType: 'swap_requests',
        entityId: id,
        newData: result.completed,
      });

      // Notify both requester and recipient that swap is approved and completed
      await sendSwapNotification('swap_approved', [swap.requester_id, recipientId], {
        organizationId,
        swapId: id,
        title: 'Swap Request Approved',
        message: 'Your shift swap has been approved and completed',
        link: `/t/${organizationId}/swaps`,
      });

      res.json({ swap: result.completed });
    } catch (error) {
      logger.error('Error responding to swap request:', error);
      res.status(500).json({ error: 'Failed to respond to swap request' });
    }
  }
);

// PUT /api/v1/org/:slug/swaps/:id/claim - Claim an open swap request
router.put(
  '/:id/claim',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;
      const desired_shift_id = req.body.desired_shift_id as string | undefined;

      const existing = await db
        .select()
        .from(swap_requests)
        .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Swap request not found' });
      }

      const swap = existing[0]!;

      if (swap.status !== 'pending_peer') {
        return res.status(400).json({ error: 'Swap request is not open for claiming' });
      }

      if (swap.recipient_id) {
        return res.status(400).json({ error: 'Swap request has already been claimed' });
      }

      const resolvedDesiredShiftId = desired_shift_id || swap.desired_shift_id;

      if (!resolvedDesiredShiftId) {
        return res.status(400).json({ error: 'desired_shift_id is required to claim this swap' });
      }

      if (resolvedDesiredShiftId === swap.offered_shift_id) {
        return res.status(400).json({ error: 'Desired shift must be different from offered shift' });
      }

      const desiredShiftResult = await db
        .select()
        .from(shifts)
        .where(
          and(eq(shifts.id, resolvedDesiredShiftId), eq(shifts.organization_id, organizationId))
        )
        .limit(1);

      if (desiredShiftResult.length === 0) {
        return res.status(404).json({ error: 'Desired shift not found' });
      }

      const desiredShift = desiredShiftResult[0]!;

      if (desiredShift.user_id !== actor.id) {
        return res.status(403).json({ error: 'You can only claim with your own shift' });
      }

      if (desiredShift.status === 'draft') {
        return res.status(400).json({ error: 'Cannot swap draft shifts' });
      }

      const hasConflicts = await hasConflictingSwap(
        organizationId,
        swap.offered_shift_id,
        resolvedDesiredShiftId,
        id
      );

      if (hasConflicts) {
        return res.status(409).json({ error: 'Conflicting swap request exists for one of the shifts' });
      }

      const updated = await db
        .update(swap_requests)
        .set({
          recipient_id: actor.id,
          desired_shift_id: resolvedDesiredShiftId,
          status: 'pending_manager',
        })
        .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
        .returning();

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'swap.peer_accept',
        entityType: 'swap_requests',
        entityId: id,
        oldData: swap,
        newData: updated[0],
      });

      res.json({ swap: updated[0] });
    } catch (error) {
      logger.error('Error claiming swap request:', error);
      res.status(500).json({ error: 'Failed to claim swap request' });
    }
  }
);

// PUT /api/v1/org/:slug/swaps/:id/cancel - Cancel own swap request
router.put(
  '/:id/cancel',
  requireRole(['employee', 'manager', 'tenantAdmin', 'owner']),
  async (req: Request, res: Response) => {
    try {
      const actor = getActor(req, res);
      if (!actor) {
        return;
      }

      const organizationId = req.organizationId!;
      const id = req.params.id as string;

      const existing = await db
        .select()
        .from(swap_requests)
        .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Swap request not found' });
      }

      const swap = existing[0]!;

      if (swap.requester_id !== actor.id) {
        return res.status(403).json({ error: 'You can only cancel your own swap requests' });
      }

      if (!['pending_peer', 'pending_manager'].includes(swap.status)) {
        return res.status(400).json({ error: 'Swap request cannot be cancelled at this stage' });
      }

      const updated = await db
        .update(swap_requests)
        .set({ status: 'rejected', resolved_at: new Date() })
        .where(and(eq(swap_requests.id, id), eq(swap_requests.organization_id, organizationId)))
        .returning();

      await logAudit({
        orgId: organizationId,
        actorId: actor.id,
        action: 'swap.cancelled',
        entityType: 'swap_requests',
        entityId: id,
        oldData: swap,
        newData: updated[0],
      });

      // Notify the recipient (if any) that the swap was cancelled
      if (swap.recipient_id) {
        await sendSwapNotification('swap_rejected', swap.recipient_id, {
          organizationId,
          swapId: id,
          title: 'Swap Request Cancelled',
          message: 'A shift swap request you were involved in has been cancelled by the requester',
          link: `/t/${organizationId}/swaps`,
        });
      }

      res.json({ swap: updated[0] });
    } catch (error) {
      logger.error('Error cancelling swap request:', error);
      res.status(500).json({ error: 'Failed to cancel swap request' });
    }
  }
);

export default router;

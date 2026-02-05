// @ts-nocheck - TODO: Fix Drizzle type assertions
import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { member } from '../db/schema.js';

const router = Router();

/**
 * POST /api/v1/org/:slug/members/:memberId/pin
 * Set or update the clock-in PIN for a member
 * Body: { pin: string } (4-digit numeric string)
 */
router.post('/:memberId/pin', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.userId!; // From session
    const { memberId } = req.params;
    const { pin } = req.body;

    // Validate PIN format (4 digits)
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        message: 'PIN must be exactly 4 digits' 
      });
    }

    // Check if member exists and belongs to organization
    const [existingMember] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.id, memberId),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Authorization check: only allow updating own PIN or if tenantAdmin/owner
    if (existingMember.userId !== userId) {
      // TODO: Check if requester has tenantAdmin or owner role
      // For now, only allow users to set their own PIN
      return res.status(403).json({ 
        message: 'You can only set your own PIN' 
      });
    }

    // Hash the PIN using bcrypt
    const hashedPin = await bcrypt.hash(pin, 10);

    // Update member with hashed PIN
    await db
      .update(member)
      .set({ clock_in_pin: hashedPin })
      .where(eq(member.id, memberId));

    res.json({ 
      message: 'PIN set successfully',
      hasPIN: true 
    });
  } catch (error) {
    console.error('Error setting PIN:', error);
    res.status(500).json({ message: 'Failed to set PIN' });
  }
});

/**
 * POST /api/v1/org/:slug/members/:memberId/verify-pin
 * Verify a clock-in PIN for authentication
 * Body: { pin: string }
 */
router.post('/:memberId/verify-pin', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { memberId } = req.params;
    const { pin } = req.body;

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        message: 'PIN must be exactly 4 digits',
        valid: false 
      });
    }

    // Get member with hashed PIN
    const [existingMember] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.id, memberId),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingMember) {
      return res.status(404).json({ 
        message: 'Member not found',
        valid: false 
      });
    }

    if (!existingMember.clock_in_pin) {
      return res.status(400).json({ 
        message: 'No PIN set for this member',
        valid: false 
      });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, existingMember.clock_in_pin);

    if (!isValid) {
      return res.status(401).json({ 
        message: 'Invalid PIN',
        valid: false 
      });
    }

    res.json({ 
      message: 'PIN verified',
      valid: true,
      memberId: existingMember.id,
      userId: existingMember.userId 
    });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({ 
      message: 'Failed to verify PIN',
      valid: false 
    });
  }
});

/**
 * GET /api/v1/org/:slug/members/:memberId/pin-status
 * Check if a member has a PIN set
 */
router.get('/:memberId/pin-status', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { memberId } = req.params;

    const [existingMember] = await db
      .select({ hasPIN: member.clock_in_pin })
      .from(member)
      .where(
        and(
          eq(member.id, memberId),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({ 
      hasPIN: existingMember.hasPIN !== null 
    });
  } catch (error) {
    console.error('Error checking PIN status:', error);
    res.status(500).json({ message: 'Failed to check PIN status' });
  }
});

/**
 * DELETE /api/v1/org/:slug/members/:memberId/pin
 * Remove the clock-in PIN for a member
 */
router.delete('/:memberId/pin', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.userId!;
    const { memberId } = req.params;

    // Check if member exists and belongs to organization
    const [existingMember] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.id, memberId),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Authorization check: only allow removing own PIN or if admin
    if (existingMember.userId !== userId) {
      return res.status(403).json({ 
        message: 'You can only remove your own PIN' 
      });
    }

    // Remove PIN
    await db
      .update(member)
      .set({ clock_in_pin: null })
      .where(eq(member.id, memberId));

    res.json({ 
      message: 'PIN removed successfully',
      hasPIN: false 
    });
  } catch (error) {
    console.error('Error removing PIN:', error);
    res.status(500).json({ message: 'Failed to remove PIN' });
  }
});

export default router;

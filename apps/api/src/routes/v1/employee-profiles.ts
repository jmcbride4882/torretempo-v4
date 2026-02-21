import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { employee_profiles, member } from '../../db/schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAudit } from '../../services/audit.service.js';
import logger from '../../lib/logger.js';

const router = Router();

/**
 * Helper: Transform DB row into API response format
 * Maps production DB columns to the API response shape expected by the frontend
 */
function transformProfile(profile: any): any {
  const result: any = { ...profile };

  // Parse address JSON if it's a string
  if (typeof result.address === 'string') {
    try {
      result.address = JSON.parse(result.address);
    } catch {
      result.address = null;
    }
  }

  // Map emergency contact fields to nested object
  if (result.emergency_contact_name || result.emergency_contact_phone) {
    result.emergency_contact = {
      name: result.emergency_contact_name || '',
      relationship: '',
      phone_number: result.emergency_contact_phone || '',
    };
  } else {
    result.emergency_contact = null;
  }
  delete result.emergency_contact_name;
  delete result.emergency_contact_phone;

  // Map phone field to phone_number for API consistency
  result.phone_number = result.phone || null;
  delete result.phone;

  // Map is_active to data_processing_consent for backwards compat
  result.data_processing_consent = result.is_active ?? false;

  // Provide defaults for fields the frontend expects
  result.working_hours_per_week = 40;
  result.vacation_days_accrued = '22';
  result.vacation_days_used = '0';

  return result;
}

/**
 * Helper: Transform API input data into DB columns
 */
function transformForDB(data: any): any {
  const dbData: any = {};

  // Direct mappings
  if (data.dni_nie !== undefined) dbData.dni_nie = data.dni_nie;
  if (data.social_security_number !== undefined) dbData.social_security_number = data.social_security_number;
  if (data.job_title !== undefined) dbData.job_title = data.job_title;
  if (data.employment_type !== undefined) dbData.employment_type = data.employment_type;
  if (data.department !== undefined) dbData.department = data.department;
  if (data.tax_id !== undefined) dbData.tax_id = data.tax_id;
  if (data.notes !== undefined) dbData.notes = data.notes;

  // phone_number → phone
  if (data.phone_number !== undefined) dbData.phone = data.phone_number;

  // address object → JSON string
  if (data.address !== undefined) {
    dbData.address = typeof data.address === 'string' ? data.address : JSON.stringify(data.address);
  }

  // emergency_contact object → separate fields
  if (data.emergency_contact !== undefined) {
    if (data.emergency_contact) {
      dbData.emergency_contact_name = data.emergency_contact.name || '';
      dbData.emergency_contact_phone = data.emergency_contact.phone_number || '';
    } else {
      dbData.emergency_contact_name = null;
      dbData.emergency_contact_phone = null;
    }
  }

  // Date fields
  if (data.date_of_birth) dbData.date_of_birth = new Date(data.date_of_birth);
  if (data.contract_start_date) dbData.contract_start_date = new Date(data.contract_start_date);
  if (data.contract_end_date) dbData.contract_end_date = new Date(data.contract_end_date);

  return dbData;
}

/**
 * Helper: Get user's role in organization
 */
async function getUserRole(userId: string, organizationId: string): Promise<string | null> {
  const memberResult = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, userId),
        eq(member.organizationId, organizationId)
      )
    )
    .limit(1);

  return memberResult.length > 0 ? memberResult[0]!.role : null;
}

// GET /api/v1/org/:slug/employees - List all employee profiles (manager+ only)
router.get('/', requireRole(['manager', 'tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const profiles = await db
      .select()
      .from(employee_profiles)
      .where(eq(employee_profiles.organization_id, organizationId))
      .orderBy(employee_profiles.created_at);

    const transformed = profiles.map(transformProfile);
    res.json({ employees: transformed, count: transformed.length });
  } catch (error) {
    logger.error('Error fetching employee profiles:', error);
    res.status(500).json({ message: 'Failed to fetch employee profiles' });
  }
});

// GET /api/v1/org/:slug/employees/me - Get current user's own employee profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.session!.user.id;

    const profileResult = await db
      .select()
      .from(employee_profiles)
      .where(
        and(
          eq(employee_profiles.user_id, userId),
          eq(employee_profiles.organization_id, organizationId)
        )
      )
      .limit(1);

    if (profileResult.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    res.json({ employee: transformProfile(profileResult[0]) });
  } catch (error) {
    logger.error('Error fetching own employee profile:', error);
    res.status(500).json({ message: 'Failed to fetch employee profile' });
  }
});

// GET /api/v1/org/:slug/employees/:id - Get single employee profile (self or manager+)
// Accepts either a profile UUID or a user_id (Better Auth text ID)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.session!.user.id;
    const lookupId = req.params.id as string;

    // Detect if lookupId is a UUID (employee_profiles.id) or a text ID (user_id)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupId);

    let profileResult;
    if (isUuid) {
      profileResult = await db
        .select()
        .from(employee_profiles)
        .where(
          and(
            eq(employee_profiles.id, lookupId),
            eq(employee_profiles.organization_id, organizationId)
          )
        )
        .limit(1);
    } else {
      // Lookup by user_id (Better Auth text ID)
      profileResult = await db
        .select()
        .from(employee_profiles)
        .where(
          and(
            eq(employee_profiles.user_id, lookupId),
            eq(employee_profiles.organization_id, organizationId)
          )
        )
        .limit(1);
    }

    if (profileResult.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const profile = profileResult[0]!;

    // Check access: user can access their own profile OR must be manager+
    const userRole = await getUserRole(userId, organizationId);
    const isManagerOrHigher = ['manager', 'tenantAdmin', 'owner'].includes(userRole || '');
    const isOwnProfile = profile.user_id === userId;

    if (!isOwnProfile && !isManagerOrHigher) {
      return res.status(403).json({ message: 'Insufficient permissions to view this profile' });
    }

    res.json({ employee: transformProfile(profile) });
  } catch (error) {
    logger.error('Error fetching employee profile:', error);
    res.status(500).json({ message: 'Failed to fetch employee profile' });
  }
});

// POST /api/v1/org/:slug/employees - Create employee profile (tenantAdmin+ only)
router.post('/', requireRole(['tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const actorId = req.session!.user.id;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    // Verify user is a member of this organization
    const memberResult = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, user_id as string),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1);

    if (memberResult.length === 0) {
      return res.status(400).json({ message: 'User is not a member of this organization' });
    }

    // Check if profile already exists
    const existingProfile = await db
      .select()
      .from(employee_profiles)
      .where(
        and(
          eq(employee_profiles.user_id, user_id as string),
          eq(employee_profiles.organization_id, organizationId)
        )
      )
      .limit(1);

    if (existingProfile.length > 0) {
      return res.status(400).json({ message: 'Employee profile already exists for this user' });
    }

    // Transform input to DB columns
    const dbData = transformForDB(req.body);

    const newProfile = await db
      .insert(employee_profiles)
      .values({
        user_id: user_id as string,
        organization_id: organizationId,
        ...dbData,
      })
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId,
      action: 'employee_profile.create',
      entityType: 'employee_profiles',
      entityId: newProfile[0]!.id,
      newData: { id: newProfile[0]!.id, user_id: newProfile[0]!.user_id, job_title: newProfile[0]!.job_title },
    });

    res.status(201).json({ employee: transformProfile(newProfile[0]) });
  } catch (error) {
    logger.error('Error creating employee profile:', error);
    res.status(500).json({ message: 'Failed to create employee profile' });
  }
});

// PATCH /api/v1/org/:slug/employees/:id - Update employee profile (tenantAdmin+ only)
// Accepts either a profile UUID or a user_id (Better Auth text ID)
router.patch('/:id', requireRole(['tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const actorId = req.session!.user.id;
    const lookupId = req.params.id as string;
    const updates = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.organization_id;
    delete updates.created_at;

    // Detect if lookupId is a UUID (employee_profiles.id) or a text ID (user_id)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupId);

    let existingResult;
    if (isUuid) {
      existingResult = await db
        .select()
        .from(employee_profiles)
        .where(
          and(
            eq(employee_profiles.id, lookupId),
            eq(employee_profiles.organization_id, organizationId)
          )
        )
        .limit(1);
    } else {
      existingResult = await db
        .select()
        .from(employee_profiles)
        .where(
          and(
            eq(employee_profiles.user_id, lookupId),
            eq(employee_profiles.organization_id, organizationId)
          )
        )
        .limit(1);
    }

    if (existingResult.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    // Transform input to DB columns
    const dbUpdates = transformForDB(updates);
    const profileId = existingResult[0]!.id;

    // Update profile
    const updatedProfile = await db
      .update(employee_profiles)
      .set({ ...dbUpdates, updated_at: new Date() })
      .where(
        and(
          eq(employee_profiles.id, profileId),
          eq(employee_profiles.organization_id, organizationId)
        )
      )
      .returning();

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId,
      action: 'employee_profile.update',
      entityType: 'employee_profiles',
      entityId: profileId,
      oldData: { id: existingResult[0]!.id, user_id: existingResult[0]!.user_id },
      newData: { id: updatedProfile[0]!.id, user_id: updatedProfile[0]!.user_id },
    });

    res.json({ employee: transformProfile(updatedProfile[0]) });
  } catch (error) {
    logger.error('Error updating employee profile:', error);
    res.status(500).json({ message: 'Failed to update employee profile' });
  }
});

// DELETE /api/v1/org/:slug/employees/:id - Delete employee profile (tenantAdmin+ only)
// Accepts either a profile UUID or a user_id (Better Auth text ID)
router.delete('/:id', requireRole(['tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const actorId = req.session!.user.id;
    const lookupId = req.params.id as string;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupId);

    let existingResult;
    if (isUuid) {
      existingResult = await db
        .select()
        .from(employee_profiles)
        .where(
          and(
            eq(employee_profiles.id, lookupId),
            eq(employee_profiles.organization_id, organizationId)
          )
        )
        .limit(1);
    } else {
      existingResult = await db
        .select()
        .from(employee_profiles)
        .where(
          and(
            eq(employee_profiles.user_id, lookupId),
            eq(employee_profiles.organization_id, organizationId)
          )
        )
        .limit(1);
    }

    if (existingResult.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const profileId = existingResult[0]!.id;

    await db
      .delete(employee_profiles)
      .where(
        and(
          eq(employee_profiles.id, profileId),
          eq(employee_profiles.organization_id, organizationId)
        )
      );

    // Log audit
    await logAudit({
      orgId: organizationId,
      actorId,
      action: 'employee_profile.delete',
      entityType: 'employee_profiles',
      entityId: profileId,
      oldData: { id: existingResult[0]!.id, user_id: existingResult[0]!.user_id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting employee profile:', error);
    res.status(500).json({ message: 'Failed to delete employee profile' });
  }
});

export default router;

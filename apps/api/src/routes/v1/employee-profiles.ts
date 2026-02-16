import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { employee_profiles, member } from '../../db/schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAudit } from '../../services/audit.service.js';
import { encryption } from '../../lib/encryption.js';
import logger from '../../lib/logger.js';

// Types for JSONB structures
interface EmployeeAddress {
  street: string;
  city: string;
  postal_code: string;
  province?: string;
  country: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone_number: string;
  email?: string;
}

const router = Router();

/**
 * Helper: Encrypt PII fields before database insert/update
 */
function encryptPIIFields(data: any): any {
  const encrypted: any = { ...data };

  // Encrypt required fields
  if (data.dni_nie) {
    encrypted.dni_nie_encrypted = encryption.encrypt(data.dni_nie);
    delete encrypted.dni_nie;
  }
  if (data.social_security_number) {
    encrypted.social_security_number_encrypted = encryption.encrypt(data.social_security_number);
    delete encrypted.social_security_number;
  }

  // Encrypt optional fields
  if (data.tax_id) {
    encrypted.tax_id_encrypted = encryption.encrypt(data.tax_id);
    delete encrypted.tax_id;
  }
  if (data.phone_number) {
    encrypted.phone_number_encrypted = encryption.encrypt(data.phone_number);
    delete encrypted.phone_number;
  }
  if (data.address) {
    encrypted.address_encrypted = encryption.encryptJSON(data.address);
    delete encrypted.address;
  }
  if (data.emergency_contact) {
    encrypted.emergency_contact_encrypted = encryption.encryptJSON(data.emergency_contact);
    delete encrypted.emergency_contact;
  }
  if (data.work_permit_number) {
    encrypted.work_permit_number_encrypted = encryption.encrypt(data.work_permit_number);
    delete encrypted.work_permit_number;
  }

  return encrypted;
}

/**
 * Helper: Decrypt PII fields after database select
 */
function decryptPIIFields(profile: any): any {
  const decrypted: any = { ...profile };

  try {
    // Decrypt required fields
    if (profile.dni_nie_encrypted) {
      decrypted.dni_nie = encryption.decrypt(profile.dni_nie_encrypted);
      delete decrypted.dni_nie_encrypted;
    }
    if (profile.social_security_number_encrypted) {
      decrypted.social_security_number = encryption.decrypt(profile.social_security_number_encrypted);
      delete decrypted.social_security_number_encrypted;
    }

    // Decrypt optional fields
    if (profile.tax_id_encrypted) {
      decrypted.tax_id = encryption.decrypt(profile.tax_id_encrypted);
      delete decrypted.tax_id_encrypted;
    }
    if (profile.phone_number_encrypted) {
      decrypted.phone_number = encryption.decrypt(profile.phone_number_encrypted);
      delete decrypted.phone_number_encrypted;
    }
    if (profile.address_encrypted) {
      decrypted.address = encryption.decryptJSON<EmployeeAddress>(profile.address_encrypted);
      delete decrypted.address_encrypted;
    }
    if (profile.emergency_contact_encrypted) {
      decrypted.emergency_contact = encryption.decryptJSON<EmergencyContact>(profile.emergency_contact_encrypted);
      delete decrypted.emergency_contact_encrypted;
    }
    if (profile.work_permit_number_encrypted) {
      decrypted.work_permit_number = encryption.decrypt(profile.work_permit_number_encrypted);
      delete decrypted.work_permit_number_encrypted;
    }
  } catch (error) {
    logger.error('Error decrypting PII fields:', error);
    throw new Error('Failed to decrypt sensitive data');
  }

  return decrypted;
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

    // Decrypt all profiles
    const decryptedProfiles = profiles.map(decryptPIIFields);

    res.json({ employees: decryptedProfiles, count: decryptedProfiles.length });
  } catch (error) {
    logger.error('Error fetching employee profiles:', error);
    res.status(500).json({ message: 'Failed to fetch employee profiles' });
  }
});

// GET /api/v1/org/:slug/employees/:id - Get single employee profile (self or manager+)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.session!.user.id;
    const profileId = req.params.id as string;

    // Fetch the profile
    const profileResult = await db
      .select()
      .from(employee_profiles)
      .where(
        and(
          eq(employee_profiles.id, profileId),
          eq(employee_profiles.organization_id, organizationId)
        )
      )
      .limit(1);

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

    // Decrypt and return
    const decrypted = decryptPIIFields(profile);
    res.json({ employee: decrypted });
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
    const {
      user_id,
      dni_nie,
      social_security_number,
      date_of_birth,
      job_title,
      employment_type,
      contract_start_date,
      working_hours_per_week,
      data_processing_consent,
    } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }
    if (!dni_nie) {
      return res.status(400).json({ message: 'dni_nie is required' });
    }
    if (!social_security_number) {
      return res.status(400).json({ message: 'social_security_number is required' });
    }
    if (!date_of_birth) {
      return res.status(400).json({ message: 'date_of_birth is required' });
    }
    if (!job_title) {
      return res.status(400).json({ message: 'job_title is required' });
    }
    if (!employment_type) {
      return res.status(400).json({ message: 'employment_type is required' });
    }
    if (!contract_start_date) {
      return res.status(400).json({ message: 'contract_start_date is required' });
    }
    if (!working_hours_per_week) {
      return res.status(400).json({ message: 'working_hours_per_week is required' });
    }

    // Verify user exists and is a member of this organization
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

    // Check if profile already exists for this user
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

    // Encrypt PII fields
    const encryptedData = encryptPIIFields(req.body);

    // Create employee profile
    const newProfile = await db
      .insert(employee_profiles)
      .values({
        user_id: user_id as string,
        organization_id: organizationId,
        ...encryptedData,
        date_of_birth: new Date(date_of_birth as string),
        contract_start_date: new Date(contract_start_date as string),
        contract_end_date: req.body.contract_end_date ? new Date(req.body.contract_end_date as string) : null,
        health_safety_training_date: req.body.health_safety_training_date ? new Date(req.body.health_safety_training_date as string) : null,
        work_permit_expiry: req.body.work_permit_expiry ? new Date(req.body.work_permit_expiry as string) : null,
        gdpr_consent_date: data_processing_consent ? new Date() : null,
        data_processing_consent: data_processing_consent || false,
      })
      .returning();

    // Log audit (DO NOT log decrypted PII)
    await logAudit({
      orgId: organizationId,
      actorId,
      action: 'employee_profile.create',
      entityType: 'employee_profiles',
      entityId: newProfile[0]!.id,
      newData: { id: newProfile[0]!.id, user_id: newProfile[0]!.user_id, job_title },
    });

    // Decrypt before returning
    const decrypted = decryptPIIFields(newProfile[0]);
    res.status(201).json({ employee: decrypted });
  } catch (error) {
    logger.error('Error creating employee profile:', error);
    res.status(500).json({ message: 'Failed to create employee profile' });
  }
});

// PATCH /api/v1/org/:slug/employees/:id - Update employee profile (tenantAdmin+ only)
router.patch('/:id', requireRole(['tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const actorId = req.session!.user.id;
    const profileId = req.params.id as string;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.organization_id;
    delete updates.created_at;

    // Fetch existing profile
    const existingResult = await db
      .select()
      .from(employee_profiles)
      .where(
        and(
          eq(employee_profiles.id, profileId),
          eq(employee_profiles.organization_id, organizationId)
        )
      )
      .limit(1);

    if (existingResult.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    // Encrypt PII fields if present in updates
    const encryptedUpdates = encryptPIIFields(updates);

    // Convert date strings to Date objects
    if (updates.date_of_birth) {
      encryptedUpdates.date_of_birth = new Date(updates.date_of_birth as string);
    }
    if (updates.contract_start_date) {
      encryptedUpdates.contract_start_date = new Date(updates.contract_start_date as string);
    }
    if (updates.contract_end_date) {
      encryptedUpdates.contract_end_date = new Date(updates.contract_end_date as string);
    }
    if (updates.health_safety_training_date) {
      encryptedUpdates.health_safety_training_date = new Date(updates.health_safety_training_date as string);
    }
    if (updates.work_permit_expiry) {
      encryptedUpdates.work_permit_expiry = new Date(updates.work_permit_expiry as string);
    }

    // Update profile
    const updatedProfile = await db
      .update(employee_profiles)
      .set({ ...encryptedUpdates, updated_at: new Date() })
      .where(
        and(
          eq(employee_profiles.id, profileId),
          eq(employee_profiles.organization_id, organizationId)
        )
      )
      .returning();

    // Log audit (DO NOT log decrypted PII)
    await logAudit({
      orgId: organizationId,
      actorId,
      action: 'employee_profile.update',
      entityType: 'employee_profiles',
      entityId: profileId,
      oldData: { id: existingResult[0]!.id, user_id: existingResult[0]!.user_id },
      newData: { id: updatedProfile[0]!.id, user_id: updatedProfile[0]!.user_id },
    });

    // Decrypt before returning
    const decrypted = decryptPIIFields(updatedProfile[0]);
    res.json({ employee: decrypted });
  } catch (error) {
    logger.error('Error updating employee profile:', error);
    res.status(500).json({ message: 'Failed to update employee profile' });
  }
});

// DELETE /api/v1/org/:slug/employees/:id - Delete employee profile (tenantAdmin+ only)
router.delete('/:id', requireRole(['tenantAdmin', 'owner']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const actorId = req.session!.user.id;
    const profileId = req.params.id as string;

    // Fetch existing profile
    const existingResult = await db
      .select()
      .from(employee_profiles)
      .where(
        and(
          eq(employee_profiles.id, profileId),
          eq(employee_profiles.organization_id, organizationId)
        )
      )
      .limit(1);

    if (existingResult.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    // Delete profile
    await db
      .delete(employee_profiles)
      .where(
        and(
          eq(employee_profiles.id, profileId),
          eq(employee_profiles.organization_id, organizationId)
        )
      );

    // Log audit (DO NOT log decrypted PII)
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

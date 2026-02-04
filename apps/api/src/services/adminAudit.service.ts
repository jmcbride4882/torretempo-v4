import { db } from '../db';
import { admin_audit_log } from '../db/schema';

interface LogAdminActionParams {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any>;
  ip?: string;
}

/**
 * Log an admin action to the admin audit log
 * Simpler than the regular audit service - no hash chain needed
 * Actions: impersonate, ban_user, generate_inspector_token, etc.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  const { adminId, action, targetType, targetId, details, ip } = params;

  try {
    await db.insert(admin_audit_log).values({
      admin_id: adminId,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || null,
      ip_address: ip ? (ip as any) : null,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    throw error;
  }
}

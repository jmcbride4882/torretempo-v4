import { createHash } from 'crypto';
import { db } from '../db/index.js';
import { audit_log } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

interface LogAuditParams {
  orgId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

/**
 * Compute SHA-256 hash of a string
 */
function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Log an audit entry with hash chain verification
 * Fetches the previous entry hash and creates a new entry with:
 * - prev_hash: SHA-256 of previous entry
 * - entry_hash: SHA-256 of current entry (action + entityType + entityId + newData + timestamp)
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  const {
    orgId,
    actorId,
    action,
    entityType,
    entityId,
    oldData,
    newData,
    ip,
    userAgent,
  } = params;

  try {
    // Fetch the previous entry hash for this organization
    const previousEntry = await db
      .select({ entry_hash: audit_log.entry_hash })
      .from(audit_log)
      .where(eq(audit_log.organization_id, orgId))
      .orderBy(desc(audit_log.created_at))
      .limit(1);

    const prevHash = previousEntry.length > 0 ? previousEntry[0]!.entry_hash : null;

    // Compute the entry hash for this audit log
    const timestamp = new Date().toISOString();
    const hashInput = `${prevHash || 'GENESIS'}${action}${entityType}${entityId || ''}${JSON.stringify(newData || {})}${timestamp}`;
    const entryHash = computeHash(hashInput);

    // Insert the audit log entry
    await db.insert(audit_log).values({
      organization_id: orgId,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData || null,
      new_data: newData || null,
      ip_address: ip ? (ip as any) : null,
      user_agent: userAgent || null,
      prev_hash: prevHash,
      entry_hash: entryHash,
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    throw error;
  }
}

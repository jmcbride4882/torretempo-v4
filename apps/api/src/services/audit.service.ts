import { createHash } from 'crypto';
import { db } from '../db/index.js';
import { audit_log } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import logger from '../lib/logger.js';

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

interface LogTimeEntryAuditParams {
  orgId: string;
  userId: string;
  timeEntryId: string;
  clockIn: Date;
  clockOut: Date | null;
  breakMinutes: number;
  action: 'create' | 'update' | 'delete';
}

interface VerifyAuditChainParams {
  orgId: string;
  targetEntryId: string;
}

interface AuditVerificationResult {
  valid: boolean;
  chainLength: number;
  lastHash: string;
  tamperedAt?: number;
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
    logger.error('Failed to log audit entry:', error);
    throw error;
  }
}

/**
 * Log time entry-specific audit with hash chain
 * Uses format: ${userId}:${clockIn}:${clockOut}:${breakMinutes}:${previousHash}
 * Genesis entry uses previousHash = "0000000000000000" (16 zeros)
 */
export async function logTimeEntryAudit(params: LogTimeEntryAuditParams): Promise<string> {
  const {
    orgId,
    userId,
    timeEntryId,
    clockIn,
    clockOut,
    breakMinutes,
    action,
  } = params;

  try {
    // Fetch the previous entry hash for this organization
    const previousEntry = await db
      .select({ entry_hash: audit_log.entry_hash })
      .from(audit_log)
      .where(
        and(
          eq(audit_log.organization_id, orgId),
          eq(audit_log.entity_type, 'timeEntry')
        )
      )
      .orderBy(desc(audit_log.created_at))
      .limit(1);

    // Use genesis hash if no previous entry
    const prevHash = previousEntry.length > 0 ? previousEntry[0]!.entry_hash : '0000000000000000';

    // Compute the entry hash for time entry
    const clockInStr = clockIn.toISOString();
    const clockOutStr = clockOut ? clockOut.toISOString() : 'null';
    const hashInput = `${userId}:${clockInStr}:${clockOutStr}:${breakMinutes}:${prevHash}`;
    const entryHash = computeHash(hashInput);

    // Insert the audit log entry
    await db.insert(audit_log).values({
      organization_id: orgId,
      actor_id: userId,
      action,
      entity_type: 'timeEntry',
      entity_id: timeEntryId,
      old_data: null,
      new_data: {
        userId,
        clockIn: clockInStr,
        clockOut: clockOutStr,
        breakMinutes,
      },
      ip_address: null,
      user_agent: null,
      prev_hash: prevHash,
      entry_hash: entryHash,
    });

    return entryHash;
  } catch (error) {
    logger.error('Failed to log time entry audit:', error);
    throw error;
  }
}

/**
 * Verify audit chain integrity for time entries
 * Recalculates hashes and detects tampering
 * Returns valid=false with tamperedAt index if chain is broken
 */
export async function verifyAuditChain(params: VerifyAuditChainParams): Promise<AuditVerificationResult> {
  const { orgId, targetEntryId } = params;

  try {
    // Fetch all audit_log entries for time entries in this organization
    const entries = await db
      .select({
        id: audit_log.id,
        entity_id: audit_log.entity_id,
        prev_hash: audit_log.prev_hash,
        entry_hash: audit_log.entry_hash,
        new_data: audit_log.new_data,
        created_at: audit_log.created_at,
      })
      .from(audit_log)
      .where(
        and(
          eq(audit_log.organization_id, orgId),
          eq(audit_log.entity_type, 'timeEntry')
        )
      )
      .orderBy(audit_log.created_at);

    // Validate that target entry exists in chain
    const targetExists = entries.some((entry) => entry.entity_id === targetEntryId);
    if (!targetExists && entries.length > 0) {
      throw new Error(`Target entry ${targetEntryId} not found in audit chain`);
    }

    // Handle empty chain
    if (entries.length === 0) {
      return {
        valid: true,
        chainLength: 0,
        lastHash: '0000000000000000',
      };
    }

    // Verify genesis entry
    const firstEntry = entries[0];
    if (firstEntry && firstEntry.prev_hash !== '0000000000000000' && firstEntry.prev_hash !== null) {
      return {
        valid: false,
        chainLength: entries.length,
        lastHash: firstEntry.entry_hash || '',
        tamperedAt: 0,
      };
    }

    // Verify each entry in the chain
    let expectedPrevHash = '0000000000000000';
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;

      const newData = entry.new_data as any;

      // Recalculate hash
      const hashInput = `${newData.userId}:${newData.clockIn}:${newData.clockOut}:${newData.breakMinutes}:${expectedPrevHash}`;
      const calculatedHash = computeHash(hashInput);

      // Check if stored hash matches calculated hash
      if (calculatedHash !== entry.entry_hash) {
        return {
          valid: false,
          chainLength: entries.length,
          lastHash: entry.entry_hash || '',
          tamperedAt: i,
        };
      }

      // Check if prev_hash matches expected
      if (entry.prev_hash !== expectedPrevHash) {
        return {
          valid: false,
          chainLength: entries.length,
          lastHash: entry.entry_hash || '',
          tamperedAt: i,
        };
      }

      // Update expected prev_hash for next iteration
      expectedPrevHash = entry.entry_hash || '';
    }

    // Chain is valid
    const lastEntry = entries[entries.length - 1];
    return {
      valid: true,
      chainLength: entries.length,
      lastHash: lastEntry?.entry_hash || '',
    };
  } catch (error) {
    logger.error('Failed to verify audit chain:', error);
    throw error;
  }
}

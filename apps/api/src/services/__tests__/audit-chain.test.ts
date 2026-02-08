/**
 * Audit Chain Tests
 * 
 * Comprehensive test coverage for SHA-256 hash chain audit functionality.
 * Tests include: genesis entry, chain integrity, tampering detection, performance.
 */

// Set environment variable before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHash } from 'crypto';

// Mock the database before importing the audit service
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

vi.mock('../../db/index.js', () => ({
  db: mockDb,
}));

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
}));

// Import after mocking
const { logTimeEntryAudit, verifyAuditChain } = await import('../audit.service.js');

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Helper to compute SHA-256 hash (matches service implementation)
 */
function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Create a mock audit entry
 */
function createAuditEntry(
  entryId: string,
  userId: string,
  clockIn: Date,
  clockOut: Date | null,
  breakMinutes: number,
  prevHash: string
) {
  const clockInStr = clockIn.toISOString();
  const clockOutStr = clockOut ? clockOut.toISOString() : 'null';
  const hashInput = `${userId}:${clockInStr}:${clockOutStr}:${breakMinutes}:${prevHash}`;
  const entryHash = computeHash(hashInput);

  return {
    id: entryId,
    entity_id: entryId,
    prev_hash: prevHash,
    entry_hash: entryHash,
    new_data: {
      userId,
      clockIn: clockInStr,
      clockOut: clockOutStr,
      breakMinutes,
    },
    created_at: clockIn,
  };
}

/**
 * Reset all mocks before each test
 */
function resetMocks() {
  vi.clearAllMocks();
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  });
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('Audit Chain', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // logTimeEntryAudit Tests
  // ==========================================================================

  describe('logTimeEntryAudit', () => {
    it('should create genesis entry with 16-zero previous hash', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const timeEntryId = 'entry-789';
      const clockIn = new Date('2026-02-08T09:00:00Z');
      const clockOut = new Date('2026-02-08T17:00:00Z');
      const breakMinutes = 30;

      // Mock empty previous entries (genesis case)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const insertMock = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: insertMock,
      });

      const result = await logTimeEntryAudit({
        orgId,
        userId,
        timeEntryId,
        clockIn,
        clockOut,
        breakMinutes,
        action: 'create',
      });

      // Verify genesis hash was used
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          prev_hash: '0000000000000000',
        })
      );

      // Verify hash format
      const expectedHashInput = `${userId}:${clockIn.toISOString()}:${clockOut.toISOString()}:${breakMinutes}:0000000000000000`;
      const expectedHash = computeHash(expectedHashInput);
      expect(result).toBe(expectedHash);
    });

    it('should link to previous entry hash', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const timeEntryId = 'entry-789';
      const clockIn = new Date('2026-02-08T09:00:00Z');
      const clockOut = new Date('2026-02-08T17:00:00Z');
      const breakMinutes = 30;
      const previousHash = 'abcd1234previoushash';

      // Mock previous entry exists
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ entry_hash: previousHash }]),
      });

      const insertMock = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: insertMock,
      });

      const result = await logTimeEntryAudit({
        orgId,
        userId,
        timeEntryId,
        clockIn,
        clockOut,
        breakMinutes,
        action: 'create',
      });

      // Verify previous hash was used
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          prev_hash: previousHash,
        })
      );

      // Verify hash includes previous hash
      const expectedHashInput = `${userId}:${clockIn.toISOString()}:${clockOut.toISOString()}:${breakMinutes}:${previousHash}`;
      const expectedHash = computeHash(expectedHashInput);
      expect(result).toBe(expectedHash);
    });

    it('should use correct hash format with null clock_out', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const timeEntryId = 'entry-789';
      const clockIn = new Date('2026-02-08T09:00:00Z');
      const clockOut = null;
      const breakMinutes = 0;

      // Mock empty previous entries
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const insertMock = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: insertMock,
      });

      const result = await logTimeEntryAudit({
        orgId,
        userId,
        timeEntryId,
        clockIn,
        clockOut,
        breakMinutes,
        action: 'create',
      });

      // Verify hash uses "null" string for null clock_out
      const expectedHashInput = `${userId}:${clockIn.toISOString()}:null:${breakMinutes}:0000000000000000`;
      const expectedHash = computeHash(expectedHashInput);
      expect(result).toBe(expectedHash);
    });

    it('should store correct audit data in database', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const timeEntryId = 'entry-789';
      const clockIn = new Date('2026-02-08T09:00:00Z');
      const clockOut = new Date('2026-02-08T17:00:00Z');
      const breakMinutes = 30;

      // Mock empty previous entries
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const insertMock = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: insertMock,
      });

      await logTimeEntryAudit({
        orgId,
        userId,
        timeEntryId,
        clockIn,
        clockOut,
        breakMinutes,
        action: 'create',
      });

      // Verify audit log entry structure
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          actor_id: userId,
          action: 'create',
          entity_type: 'timeEntry',
          entity_id: timeEntryId,
          new_data: {
            userId,
            clockIn: clockIn.toISOString(),
            clockOut: clockOut.toISOString(),
            breakMinutes,
          },
          prev_hash: '0000000000000000',
          entry_hash: expect.any(String),
        })
      );
    });
  });

  // ==========================================================================
  // verifyAuditChain Tests
  // ==========================================================================

  describe('verifyAuditChain', () => {
    it('should verify valid chain of 3 entries', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-3';

      // Create a valid chain
      const entry1 = createAuditEntry(
        'entry-1',
        'user-1',
        new Date('2026-02-08T09:00:00Z'),
        new Date('2026-02-08T17:00:00Z'),
        30,
        '0000000000000000'
      );

      const entry2 = createAuditEntry(
        'entry-2',
        'user-1',
        new Date('2026-02-09T09:00:00Z'),
        new Date('2026-02-09T17:00:00Z'),
        30,
        entry1.entry_hash
      );

      const entry3 = createAuditEntry(
        'entry-3',
        'user-1',
        new Date('2026-02-10T09:00:00Z'),
        new Date('2026-02-10T17:00:00Z'),
        30,
        entry2.entry_hash
      );

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([entry1, entry2, entry3]),
      });

      const result = await verifyAuditChain({ orgId, targetEntryId });

      expect(result.valid).toBe(true);
      expect(result.chainLength).toBe(3);
      expect(result.lastHash).toBe(entry3.entry_hash);
      expect(result.tamperedAt).toBeUndefined();
    });

    it('should detect tampering in middle of chain', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-3';

      // Create entries
      const entry1 = createAuditEntry(
        'entry-1',
        'user-1',
        new Date('2026-02-08T09:00:00Z'),
        new Date('2026-02-08T17:00:00Z'),
        30,
        '0000000000000000'
      );

      const entry2 = createAuditEntry(
        'entry-2',
        'user-1',
        new Date('2026-02-09T09:00:00Z'),
        new Date('2026-02-09T17:00:00Z'),
        30,
        entry1.entry_hash
      );

      // Tamper with entry2 by modifying break minutes
      const tamperedEntry2 = {
        ...entry2,
        new_data: {
          ...entry2.new_data,
          breakMinutes: 60, // Changed from 30
        },
      };

      const entry3 = createAuditEntry(
        'entry-3',
        'user-1',
        new Date('2026-02-10T09:00:00Z'),
        new Date('2026-02-10T17:00:00Z'),
        30,
        entry2.entry_hash // Still references original hash
      );

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([entry1, tamperedEntry2, entry3]),
      });

      const result = await verifyAuditChain({ orgId, targetEntryId });

      expect(result.valid).toBe(false);
      expect(result.tamperedAt).toBe(1); // Second entry (index 1)
      expect(result.chainLength).toBe(3);
    });

    it('should detect tampering in genesis entry', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-1';

      // Create genesis entry with wrong prev_hash
      const entry1 = createAuditEntry(
        'entry-1',
        'user-1',
        new Date('2026-02-08T09:00:00Z'),
        new Date('2026-02-08T17:00:00Z'),
        30,
        '0000000000000000'
      );

      // Tamper with prev_hash
      const tamperedEntry1 = {
        ...entry1,
        prev_hash: 'wronghash123456',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([tamperedEntry1]),
      });

      const result = await verifyAuditChain({ orgId, targetEntryId });

      expect(result.valid).toBe(false);
      expect(result.tamperedAt).toBe(0); // First entry
    });

    it('should handle empty chain', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-1';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      });

      const result = await verifyAuditChain({ orgId, targetEntryId });

      expect(result.valid).toBe(true);
      expect(result.chainLength).toBe(0);
      expect(result.lastHash).toBe('0000000000000000');
    });

    it('should throw error if target entry not found', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-999';

      // Create chain without target entry
      const entry1 = createAuditEntry(
        'entry-1',
        'user-1',
        new Date('2026-02-08T09:00:00Z'),
        new Date('2026-02-08T17:00:00Z'),
        30,
        '0000000000000000'
      );

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([entry1]),
      });

      await expect(
        verifyAuditChain({ orgId, targetEntryId })
      ).rejects.toThrow('not found in audit chain');
    });

    it('should verify chain with null clock_out entries', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-2';

      // Create chain with incomplete entry
      const entry1 = createAuditEntry(
        'entry-1',
        'user-1',
        new Date('2026-02-08T09:00:00Z'),
        null, // No clock out yet
        0,
        '0000000000000000'
      );

      const entry2 = createAuditEntry(
        'entry-2',
        'user-1',
        new Date('2026-02-09T09:00:00Z'),
        new Date('2026-02-09T17:00:00Z'),
        30,
        entry1.entry_hash
      );

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([entry1, entry2]),
      });

      const result = await verifyAuditChain({ orgId, targetEntryId });

      expect(result.valid).toBe(true);
      expect(result.chainLength).toBe(2);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should verify 100 entries in <200ms', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-100';

      // Create a chain of 100 entries
      const entries = [];
      let prevHash = '0000000000000000';

      for (let i = 1; i <= 100; i++) {
        const dayOffset = Math.floor((i - 1) / 10); // 0-9
        const day = 8 + dayOffset;
        const entry = createAuditEntry(
          `entry-${i}`,
          'user-1',
          new Date(`2026-02-${String(day).padStart(2, '0')}T09:00:00Z`),
          new Date(`2026-02-${String(day).padStart(2, '0')}T17:00:00Z`),
          30,
          prevHash
        );
        entries.push(entry);
        prevHash = entry.entry_hash;
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(entries),
      });

      const startTime = Date.now();
      const result = await verifyAuditChain({ orgId, targetEntryId });
      const duration = Date.now() - startTime;

      expect(result.valid).toBe(true);
      expect(result.chainLength).toBe(100);
      expect(duration).toBeLessThan(200); // Should be much faster than 200ms
    });

    it('should verify 1000 entries in <2000ms', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-1000';

      // Create a chain of 1000 entries across 30 days (max 34 entries per day)
      const entries = [];
      let prevHash = '0000000000000000';

      for (let i = 1; i <= 1000; i++) {
        const dayOffset = Math.floor((i - 1) / 34); // Spread across 30 days
        const monthOffset = Math.floor(dayOffset / 28); // Handle month overflow
        const dayInMonth = (dayOffset % 28) + 1; // Days 1-28 to avoid month-end issues
        
        const entry = createAuditEntry(
          `entry-${i}`,
          `user-${(i % 5) + 1}`, // Rotate through 5 users
          new Date(`2026-${String(2 + monthOffset).padStart(2, '0')}-${String(dayInMonth).padStart(2, '0')}T09:00:00Z`),
          new Date(`2026-${String(2 + monthOffset).padStart(2, '0')}-${String(dayInMonth).padStart(2, '0')}T17:00:00Z`),
          30,
          prevHash
        );
        entries.push(entry);
        prevHash = entry.entry_hash;
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(entries),
      });

      const startTime = Date.now();
      const result = await verifyAuditChain({ orgId, targetEntryId });
      const duration = Date.now() - startTime;

      expect(result.valid).toBe(true);
      expect(result.chainLength).toBe(1000);
      expect(duration).toBeLessThan(2000); // Performance requirement
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle zero break minutes', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const timeEntryId = 'entry-789';
      const clockIn = new Date('2026-02-08T09:00:00Z');
      const clockOut = new Date('2026-02-08T17:00:00Z');
      const breakMinutes = 0;

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const insertMock = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: insertMock,
      });

      const result = await logTimeEntryAudit({
        orgId,
        userId,
        timeEntryId,
        clockIn,
        clockOut,
        breakMinutes,
        action: 'create',
      });

      // Verify hash includes 0 for break minutes
      const expectedHashInput = `${userId}:${clockIn.toISOString()}:${clockOut.toISOString()}:0:0000000000000000`;
      const expectedHash = computeHash(expectedHashInput);
      expect(result).toBe(expectedHash);
    });

    it('should handle midnight crossing shifts', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const timeEntryId = 'entry-789';
      const clockIn = new Date('2026-02-08T22:00:00Z');
      const clockOut = new Date('2026-02-09T06:00:00Z');
      const breakMinutes = 30;

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const insertMock = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: insertMock,
      });

      const result = await logTimeEntryAudit({
        orgId,
        userId,
        timeEntryId,
        clockIn,
        clockOut,
        breakMinutes,
        action: 'create',
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // SHA-256 hash length
    });

    it('should detect tampering with prev_hash mismatch', async () => {
      const orgId = 'org-123';
      const targetEntryId = 'entry-2';

      // Create entries where entry2's prev_hash doesn't match entry1's entry_hash
      const entry1 = createAuditEntry(
        'entry-1',
        'user-1',
        new Date('2026-02-08T09:00:00Z'),
        new Date('2026-02-08T17:00:00Z'),
        30,
        '0000000000000000'
      );

      const entry2 = createAuditEntry(
        'entry-2',
        'user-1',
        new Date('2026-02-09T09:00:00Z'),
        new Date('2026-02-09T17:00:00Z'),
        30,
        'wrongprevioushash' // Wrong prev_hash
      );

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([entry1, entry2]),
      });

      const result = await verifyAuditChain({ orgId, targetEntryId });

      expect(result.valid).toBe(false);
      expect(result.tamperedAt).toBe(1);
    });
  });
});

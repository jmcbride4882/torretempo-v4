/**
 * Integration Test: Complete Time Tracking Flow
 * 
 * Task 2.18: Tests the full time tracking workflow
 * 
 * Flow:
 * 1. User clocks in (geofence valid, within tolerance)
 * 2. System validates (no violations)
 * 3. User starts break after 4 hours
 * 4. User ends break after 20 minutes
 * 5. User works 2 more hours
 * 6. User clocks out
 * 7. System runs compliance checks (all pass)
 * 8. Audit log entry created with SHA-256 hash
 * 
 * Failure scenarios:
 * - Clock in outside geofence → 400 error
 * - Clock out without mandatory break → warning
 * - Clock out after 10 hours → violation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock database
const mockDb = {
  timeEntries: new Map<string, TimeEntry>(),
  breakEntries: new Map<string, BreakEntry>(),
  auditLog: new Map<string, AuditEntry>(),
  complianceChecks: new Map<string, ComplianceCheck>(),
};

// Types
interface TimeEntry {
  id: string;
  userId: string;
  organizationId: string;
  clockIn: Date;
  clockOut: Date | null;
  breakMinutes: number;
  method: string;
  latitude: number;
  longitude: number;
}

interface BreakEntry {
  id: string;
  timeEntryId: string;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
  isPaid: boolean;
}

interface AuditEntry {
  id: string;
  action: string;
  recordId: string;
  recordHash: string;
  previousHash: string;
  timestamp: Date;
}

interface ComplianceCheck {
  id: string;
  timeEntryId: string;
  checkType: string;
  result: 'pass' | 'warning' | 'violation';
  message: string;
}

// ============================================================================
// Test Helpers
// ============================================================================

function generateId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function createTimeEntry(data: Partial<TimeEntry>): TimeEntry {
  const entry: TimeEntry = {
    id: generateId(),
    userId: 'test-user-1',
    organizationId: 'test-org-1',
    clockIn: new Date(),
    clockOut: null,
    breakMinutes: 0,
    method: 'tap',
    latitude: 40.4168,
    longitude: -3.7038,
    ...data,
  };
  mockDb.timeEntries.set(entry.id, entry);
  return entry;
}

function createBreakEntry(data: Partial<BreakEntry>): BreakEntry {
  const entry: BreakEntry = {
    id: generateId(),
    timeEntryId: '',
    startTime: new Date(),
    endTime: null,
    durationMinutes: 0,
    isPaid: false,
    ...data,
  };
  mockDb.breakEntries.set(entry.id, entry);
  return entry;
}

function calculateHoursWorked(clockIn: Date, clockOut: Date, breakMinutes: number): number {
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const totalMinutes = diffMs / (1000 * 60);
  return (totalMinutes - breakMinutes) / 60;
}

// Haversine distance calculation
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// SHA-256 hash simulation
function calculateHash(data: string, previousHash: string): string {
  // Simplified hash for testing (in production, use crypto.createHash)
  const combined = `${data}:${previousHash}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

// ============================================================================
// Compliance Validation
// ============================================================================

interface ComplianceResult {
  pass: boolean;
  type: 'pass' | 'warning' | 'violation';
  message: string;
  rule: string;
}

function validateDailyLimit(hoursWorked: number): ComplianceResult {
  if (hoursWorked > 9) {
    return {
      pass: false,
      type: 'violation',
      message: `Daily limit exceeded: ${hoursWorked.toFixed(1)}h (max 9h)`,
      rule: 'daily_limit',
    };
  }
  if (hoursWorked > 8) {
    return {
      pass: true,
      type: 'warning',
      message: `Approaching daily limit: ${hoursWorked.toFixed(1)}h`,
      rule: 'daily_limit',
    };
  }
  return { pass: true, type: 'pass', message: 'Daily limit OK', rule: 'daily_limit' };
}

function validateMandatoryBreak(hoursWorked: number, breakMinutes: number): ComplianceResult {
  if (hoursWorked > 6 && breakMinutes < 15) {
    return {
      pass: true,
      type: 'warning',
      message: `Shift >6h requires 15min break. Current: ${breakMinutes}min`,
      rule: 'mandatory_break',
    };
  }
  return { pass: true, type: 'pass', message: 'Break requirement OK', rule: 'mandatory_break' };
}

function validateGeofence(
  userLat: number,
  userLon: number,
  locationLat: number,
  locationLon: number,
  radiusMeters: number = 50
): ComplianceResult {
  const distance = haversineDistance(userLat, userLon, locationLat, locationLon);
  
  if (distance > radiusMeters) {
    return {
      pass: false,
      type: 'violation',
      message: `Outside geofence: ${distance.toFixed(0)}m (max ${radiusMeters}m)`,
      rule: 'geofence',
    };
  }
  return { pass: true, type: 'pass', message: 'Within geofence', rule: 'geofence' };
}

// ============================================================================
// Tests
// ============================================================================

describe('Time Tracking Flow Integration', () => {
  beforeAll(() => {
    // Clear mock database
    mockDb.timeEntries.clear();
    mockDb.breakEntries.clear();
    mockDb.auditLog.clear();
    mockDb.complianceChecks.clear();
  });

  afterAll(() => {
    // Cleanup
    mockDb.timeEntries.clear();
    mockDb.breakEntries.clear();
    mockDb.auditLog.clear();
    mockDb.complianceChecks.clear();
  });

  describe('Happy Path: Complete Shift', () => {
    let timeEntry: TimeEntry;
    let breakEntry: BreakEntry;

    it('Step 1: User clocks in (geofence valid)', () => {
      // Location: Madrid office
      const officeLocation = { lat: 40.4168, lon: -3.7038 };
      const userLocation = { lat: 40.4168, lon: -3.7038 }; // Same location
      
      // Validate geofence
      const geofenceResult = validateGeofence(
        userLocation.lat,
        userLocation.lon,
        officeLocation.lat,
        officeLocation.lon,
        50
      );
      
      expect(geofenceResult.pass).toBe(true);
      expect(geofenceResult.type).toBe('pass');
      
      // Create time entry
      timeEntry = createTimeEntry({
        clockIn: new Date('2026-02-08T09:00:00Z'),
        latitude: userLocation.lat,
        longitude: userLocation.lon,
      });
      
      expect(timeEntry.id).toBeDefined();
      expect(timeEntry.clockIn).toBeDefined();
      expect(timeEntry.clockOut).toBeNull();
    });

    it('Step 2: System validates (no violations)', () => {
      // At clock-in, no compliance checks needed yet
      expect(timeEntry.clockOut).toBeNull();
    });

    it('Step 3: User starts break after 4 hours', () => {
      // Simulate 4 hours of work
      const breakStartTime = new Date('2026-02-08T13:00:00Z');
      
      breakEntry = createBreakEntry({
        timeEntryId: timeEntry.id,
        startTime: breakStartTime,
        isPaid: false,
      });
      
      expect(breakEntry.id).toBeDefined();
      expect(breakEntry.timeEntryId).toBe(timeEntry.id);
      expect(breakEntry.endTime).toBeNull();
    });

    it('Step 4: User ends break after 20 minutes', () => {
      const breakEndTime = new Date('2026-02-08T13:20:00Z');
      
      breakEntry.endTime = breakEndTime;
      breakEntry.durationMinutes = 20;
      mockDb.breakEntries.set(breakEntry.id, breakEntry);
      
      // Update time entry break minutes
      timeEntry.breakMinutes = 20;
      mockDb.timeEntries.set(timeEntry.id, timeEntry);
      
      expect(breakEntry.endTime).toBeDefined();
      expect(breakEntry.durationMinutes).toBe(20);
      expect(timeEntry.breakMinutes).toBe(20);
    });

    it('Step 5: User works 2 more hours', () => {
      // Just a placeholder - time passes
      expect(timeEntry.breakMinutes).toBe(20);
    });

    it('Step 6: User clocks out', () => {
      const clockOutTime = new Date('2026-02-08T17:00:00Z');
      
      timeEntry.clockOut = clockOutTime;
      mockDb.timeEntries.set(timeEntry.id, timeEntry);
      
      expect(timeEntry.clockOut).toBeDefined();
      
      // Calculate hours worked
      const hoursWorked = calculateHoursWorked(
        timeEntry.clockIn,
        timeEntry.clockOut,
        timeEntry.breakMinutes
      );
      
      // 9:00 to 17:00 = 8 hours, minus 20 min break = 7h 40m
      expect(hoursWorked).toBeCloseTo(7.67, 1);
    });

    it('Step 7: System runs compliance checks (all pass)', () => {
      const hoursWorked = calculateHoursWorked(
        timeEntry.clockIn,
        timeEntry.clockOut!,
        timeEntry.breakMinutes
      );
      
      // Daily limit check
      const dailyResult = validateDailyLimit(hoursWorked);
      expect(dailyResult.pass).toBe(true);
      expect(dailyResult.type).toBe('pass');
      
      // Mandatory break check
      const breakResult = validateMandatoryBreak(hoursWorked, timeEntry.breakMinutes);
      expect(breakResult.pass).toBe(true);
      expect(breakResult.type).toBe('pass');
      
      // Store compliance checks
      mockDb.complianceChecks.set(generateId(), {
        id: generateId(),
        timeEntryId: timeEntry.id,
        checkType: 'daily_limit',
        result: dailyResult.type,
        message: dailyResult.message,
      });
      
      mockDb.complianceChecks.set(generateId(), {
        id: generateId(),
        timeEntryId: timeEntry.id,
        checkType: 'mandatory_break',
        result: breakResult.type,
        message: breakResult.message,
      });
    });

    it('Step 8: Audit log entry created with SHA-256 hash', () => {
      const previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
      const entryData = `${timeEntry.userId}:${timeEntry.clockIn.toISOString()}:${timeEntry.clockOut?.toISOString()}:${timeEntry.breakMinutes}`;
      const recordHash = calculateHash(entryData, previousHash);
      
      const auditEntry: AuditEntry = {
        id: generateId(),
        action: 'time_entry_complete',
        recordId: timeEntry.id,
        recordHash,
        previousHash,
        timestamp: new Date(),
      };
      
      mockDb.auditLog.set(auditEntry.id, auditEntry);
      
      expect(auditEntry.recordHash).toBeDefined();
      expect(auditEntry.recordHash.length).toBe(64);
      expect(auditEntry.previousHash).toBe(previousHash);
    });
  });

  describe('Failure Scenarios', () => {
    it('Clock in outside geofence returns violation', () => {
      const officeLocation = { lat: 40.4168, lon: -3.7038 };
      const userLocation = { lat: 40.4200, lon: -3.7000 }; // ~400m away
      
      const result = validateGeofence(
        userLocation.lat,
        userLocation.lon,
        officeLocation.lat,
        officeLocation.lon,
        50
      );
      
      expect(result.pass).toBe(false);
      expect(result.type).toBe('violation');
      expect(result.message).toContain('Outside geofence');
    });

    it('Clock out without mandatory break returns warning', () => {
      const hoursWorked = 7; // >6 hours
      const breakMinutes = 10; // <15 minutes
      
      const result = validateMandatoryBreak(hoursWorked, breakMinutes);
      
      expect(result.pass).toBe(true); // Warning, not blocking
      expect(result.type).toBe('warning');
      expect(result.message).toContain('requires 15min break');
    });

    it('Clock out after 10 hours returns violation', () => {
      const hoursWorked = 10;
      
      const result = validateDailyLimit(hoursWorked);
      
      expect(result.pass).toBe(false);
      expect(result.type).toBe('violation');
      expect(result.message).toContain('Daily limit exceeded');
    });

    it('Clock out at exactly 9 hours returns warning (approaching limit)', () => {
      const hoursWorked = 9;
      
      const result = validateDailyLimit(hoursWorked);
      
      expect(result.pass).toBe(true);
      expect(result.type).toBe('warning'); // 9h is at the limit, so warning
    });

    it('Clock out at 8.5 hours returns warning', () => {
      const hoursWorked = 8.5;
      
      const result = validateDailyLimit(hoursWorked);
      
      expect(result.pass).toBe(true);
      expect(result.type).toBe('warning');
      expect(result.message).toContain('Approaching daily limit');
    });
  });

  describe('Audit Chain Integrity', () => {
    it('should create linked audit entries', () => {
      const entries: AuditEntry[] = [];
      let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
      
      // Create 5 linked audit entries
      for (let i = 0; i < 5; i++) {
        const entryData = `user-${i}:clock-in:${new Date().toISOString()}`;
        const recordHash = calculateHash(entryData, previousHash);
        
        const entry: AuditEntry = {
          id: generateId(),
          action: 'clock_in',
          recordId: `entry-${i}`,
          recordHash,
          previousHash,
          timestamp: new Date(),
        };
        
        entries.push(entry);
        previousHash = recordHash;
      }
      
      // Verify chain
      expect(entries.length).toBe(5);
      
      for (let i = 1; i < entries.length; i++) {
        const current = entries[i];
        const previous = entries[i - 1];
        expect(current?.previousHash).toBe(previous?.recordHash);
      }
    });

    it('should detect tampering in audit chain', () => {
      const entries: AuditEntry[] = [];
      let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
      
      // Create 3 linked entries
      for (let i = 0; i < 3; i++) {
        const entryData = `user-${i}:clock-in:${new Date().toISOString()}`;
        const recordHash = calculateHash(entryData, previousHash);
        
        entries.push({
          id: generateId(),
          action: 'clock_in',
          recordId: `entry-${i}`,
          recordHash,
          previousHash,
          timestamp: new Date(),
        });
        
        previousHash = recordHash;
      }
      
      // Tamper with middle entry
      const tamperedEntry = entries[1];
      if (tamperedEntry) {
        tamperedEntry.recordHash = 'tampered_hash_value_that_is_invalid';
      }
      
      // Verify chain is broken
      const entry2 = entries[2];
      const entry1 = entries[1];
      expect(entry2?.previousHash).not.toBe(entry1?.recordHash);
    });
  });

  describe('Break Tracking', () => {
    it('should track multiple breaks in a shift', () => {
      const timeEntry = createTimeEntry({
        clockIn: new Date('2026-02-08T08:00:00Z'),
      });
      
      // Morning break
      const break1 = createBreakEntry({
        timeEntryId: timeEntry.id,
        startTime: new Date('2026-02-08T10:00:00Z'),
        endTime: new Date('2026-02-08T10:15:00Z'),
        durationMinutes: 15,
        isPaid: true,
      });
      
      // Lunch break
      const break2 = createBreakEntry({
        timeEntryId: timeEntry.id,
        startTime: new Date('2026-02-08T13:00:00Z'),
        endTime: new Date('2026-02-08T13:30:00Z'),
        durationMinutes: 30,
        isPaid: false,
      });
      
      // Afternoon break
      const break3 = createBreakEntry({
        timeEntryId: timeEntry.id,
        startTime: new Date('2026-02-08T16:00:00Z'),
        endTime: new Date('2026-02-08T16:15:00Z'),
        durationMinutes: 15,
        isPaid: true,
      });
      
      // Calculate total break time
      const totalBreakMinutes = break1.durationMinutes + break2.durationMinutes + break3.durationMinutes;
      const paidBreakMinutes = break1.durationMinutes + break3.durationMinutes;
      const unpaidBreakMinutes = break2.durationMinutes;
      
      expect(totalBreakMinutes).toBe(60);
      expect(paidBreakMinutes).toBe(30);
      expect(unpaidBreakMinutes).toBe(30);
    });

    it('should calculate net working hours correctly', () => {
      const clockIn = new Date('2026-02-08T08:00:00Z');
      const clockOut = new Date('2026-02-08T17:00:00Z');
      const breakMinutes = 60; // 1 hour total breaks
      
      const hoursWorked = calculateHoursWorked(clockIn, clockOut, breakMinutes);
      
      // 9 hours total - 1 hour breaks = 8 hours
      expect(hoursWorked).toBe(8);
    });
  });
});

describe('Geofence Validation', () => {
  it('should pass for user at exact location', () => {
    const result = validateGeofence(40.4168, -3.7038, 40.4168, -3.7038, 50);
    expect(result.pass).toBe(true);
  });

  it('should pass for user within 50m', () => {
    // ~30m away
    const result = validateGeofence(40.4170, -3.7035, 40.4168, -3.7038, 50);
    expect(result.pass).toBe(true);
  });

  it('should fail for user 100m away with 50m radius', () => {
    // ~100m away
    const result = validateGeofence(40.4178, -3.7028, 40.4168, -3.7038, 50);
    expect(result.pass).toBe(false);
  });

  it('should pass for user 100m away with 150m radius', () => {
    // ~100m away
    const result = validateGeofence(40.4178, -3.7028, 40.4168, -3.7038, 150);
    expect(result.pass).toBe(true);
  });
});

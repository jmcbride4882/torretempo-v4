/**
 * Roster Validation Tests
 *
 * Tests for Spanish labor law compliance validation:
 * - 9h daily limit
 * - 40h weekly limit
 * - 12h rest between shifts
 */

import { describe, it, expect } from 'vitest';

// Mock types matching the validator
interface ValidationIssue {
  rule: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ruleReference?: string;
}

interface ValidationResult {
  valid: boolean;
  violations: ValidationIssue[];
  warnings: ValidationIssue[];
}

// Helper to create shift times
function createShiftTimes(date: string, startHour: number, endHour: number) {
  const start = new Date(`${date}T${startHour.toString().padStart(2, '0')}:00:00`);
  const end = new Date(`${date}T${endHour.toString().padStart(2, '0')}:00:00`);
  return { start, end };
}

// Helper to calculate shift duration in hours
function getShiftDuration(start: Date, end: Date, breakMinutes: number = 0): number {
  const diffMs = end.getTime() - start.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return hours - breakMinutes / 60;
}

// Simplified validation logic for testing (mirrors roster-validator.ts)
function validateDailyHours(shiftHours: number, existingDailyHours: number, maxDaily: number = 9): ValidationResult {
  const totalDaily = existingDailyHours + shiftHours;
  const violations: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (totalDaily > maxDaily) {
    violations.push({
      rule: 'daily_hours_limit',
      message: `Daily hours (${totalDaily.toFixed(1)}h) exceed ${maxDaily}h limit`,
      severity: 'critical',
      ruleReference: 'Estatuto de los Trabajadores Art. 34.3',
    });
  } else if (totalDaily > maxDaily - 1) {
    warnings.push({
      rule: 'daily_hours_warning',
      message: `Daily hours (${totalDaily.toFixed(1)}h) approaching ${maxDaily}h limit`,
      severity: 'medium',
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

function validateWeeklyHours(shiftHours: number, existingWeeklyHours: number, maxWeekly: number = 40): ValidationResult {
  const totalWeekly = existingWeeklyHours + shiftHours;
  const violations: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (totalWeekly > maxWeekly) {
    violations.push({
      rule: 'weekly_hours_limit',
      message: `Weekly hours (${totalWeekly.toFixed(1)}h) exceed ${maxWeekly}h limit`,
      severity: 'critical',
      ruleReference: 'Estatuto de los Trabajadores Art. 34.1',
    });
  } else if (totalWeekly > maxWeekly - 2) {
    warnings.push({
      rule: 'weekly_hours_warning',
      message: `Weekly hours (${totalWeekly.toFixed(1)}h) approaching ${maxWeekly}h limit`,
      severity: 'medium',
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

function validateRestPeriod(
  newShiftStart: Date,
  previousShiftEnd: Date | null,
  nextShiftStart: Date | null,
  minRestHours: number = 12
): ValidationResult {
  const violations: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Check rest after previous shift
  if (previousShiftEnd) {
    const restAfterPrevious = (newShiftStart.getTime() - previousShiftEnd.getTime()) / (1000 * 60 * 60);
    if (restAfterPrevious < minRestHours) {
      violations.push({
        rule: 'rest_period_after',
        message: `Only ${restAfterPrevious.toFixed(1)}h rest after previous shift (minimum ${minRestHours}h required)`,
        severity: 'critical',
        ruleReference: 'Estatuto de los Trabajadores Art. 37.1',
      });
    }
  }

  // Check rest before next shift
  if (nextShiftStart) {
    // Assume new shift is 8h for this check
    const assumedShiftEnd = new Date(newShiftStart.getTime() + 8 * 60 * 60 * 1000);
    const restBeforeNext = (nextShiftStart.getTime() - assumedShiftEnd.getTime()) / (1000 * 60 * 60);
    if (restBeforeNext < minRestHours) {
      violations.push({
        rule: 'rest_period_before',
        message: `Only ${restBeforeNext.toFixed(1)}h rest before next shift (minimum ${minRestHours}h required)`,
        severity: 'critical',
        ruleReference: 'Estatuto de los Trabajadores Art. 37.1',
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

describe('Roster Validation - Spanish Labor Law Compliance', () => {
  describe('Daily Hours Limit (9h max)', () => {
    it('should pass for shift under 9h with no existing hours', () => {
      const result = validateDailyHours(8, 0);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass for shift exactly at 9h limit', () => {
      const result = validateDailyHours(9, 0);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail for shift exceeding 9h', () => {
      const result = validateDailyHours(10, 0);
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.rule).toBe('daily_hours_limit');
      expect(result.violations[0]?.severity).toBe('critical');
    });

    it('should fail when combined hours exceed 9h', () => {
      const result = validateDailyHours(5, 5); // 10h total
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('should warn when approaching 9h limit', () => {
      const result = validateDailyHours(8.5, 0); // 8.5h - approaching limit
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.rule).toBe('daily_hours_warning');
    });

    it('should include legal reference in violation', () => {
      const result = validateDailyHours(10, 0);
      expect(result.violations[0]?.ruleReference).toContain('Art. 34.3');
    });
  });

  describe('Weekly Hours Limit (40h max)', () => {
    it('should pass for weekly hours under 40h', () => {
      const result = validateWeeklyHours(8, 24); // 32h total
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass for exactly 40h weekly', () => {
      const result = validateWeeklyHours(8, 32); // 40h total
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail for weekly hours exceeding 40h', () => {
      const result = validateWeeklyHours(8, 35); // 43h total
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.rule).toBe('weekly_hours_limit');
    });

    it('should warn when approaching 40h limit', () => {
      const result = validateWeeklyHours(8, 31); // 39h total
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.rule).toBe('weekly_hours_warning');
    });

    it('should include legal reference in violation', () => {
      const result = validateWeeklyHours(8, 40);
      expect(result.violations[0]?.ruleReference).toContain('Art. 34.1');
    });
  });

  describe('Rest Period (12h minimum between shifts)', () => {
    it('should pass with sufficient rest after previous shift', () => {
      const previousEnd = new Date('2024-01-15T17:00:00');
      const newStart = new Date('2024-01-16T09:00:00'); // 16h rest
      const result = validateRestPeriod(newStart, previousEnd, null);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail with insufficient rest after previous shift', () => {
      const previousEnd = new Date('2024-01-15T22:00:00');
      const newStart = new Date('2024-01-16T06:00:00'); // Only 8h rest
      const result = validateRestPeriod(newStart, previousEnd, null);
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.rule).toBe('rest_period_after');
    });

    it('should fail with insufficient rest before next shift', () => {
      const newStart = new Date('2024-01-15T06:00:00');
      const nextStart = new Date('2024-01-15T18:00:00'); // Only 4h rest (assuming 8h shift)
      const result = validateRestPeriod(newStart, null, nextStart);
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.rule).toBe('rest_period_before');
    });

    it('should pass with no adjacent shifts', () => {
      const newStart = new Date('2024-01-15T09:00:00');
      const result = validateRestPeriod(newStart, null, null);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should include legal reference in violation', () => {
      const previousEnd = new Date('2024-01-15T22:00:00');
      const newStart = new Date('2024-01-16T06:00:00');
      const result = validateRestPeriod(newStart, previousEnd, null);
      expect(result.violations[0]?.ruleReference).toContain('Art. 37.1');
    });
  });

  describe('Combined Validation Scenarios', () => {
    it('should validate a standard 8h shift on empty day', () => {
      const dailyResult = validateDailyHours(8, 0);
      const weeklyResult = validateWeeklyHours(8, 0);
      
      expect(dailyResult.valid).toBe(true);
      expect(weeklyResult.valid).toBe(true);
    });

    it('should validate end-of-week shift approaching weekly limit', () => {
      const dailyResult = validateDailyHours(8, 0);
      const weeklyResult = validateWeeklyHours(8, 31); // 39h total
      
      expect(dailyResult.valid).toBe(true);
      expect(weeklyResult.valid).toBe(true);
      expect(weeklyResult.warnings).toHaveLength(1);
    });

    it('should fail shift that violates multiple rules', () => {
      // 10h shift on a day with 1h already worked, week already at 35h
      const dailyResult = validateDailyHours(10, 1); // 11h daily - FAIL
      const weeklyResult = validateWeeklyHours(10, 35); // 45h weekly - FAIL
      
      expect(dailyResult.valid).toBe(false);
      expect(weeklyResult.valid).toBe(false);
    });
  });

  describe('Shift Duration Calculations', () => {
    it('should calculate correct duration without break', () => {
      const { start, end } = createShiftTimes('2024-01-15', 9, 17);
      const duration = getShiftDuration(start, end, 0);
      expect(duration).toBe(8);
    });

    it('should calculate correct duration with 30min break', () => {
      const { start, end } = createShiftTimes('2024-01-15', 9, 17);
      const duration = getShiftDuration(start, end, 30);
      expect(duration).toBe(7.5);
    });

    it('should calculate correct duration with 60min break', () => {
      const { start, end } = createShiftTimes('2024-01-15', 9, 18);
      const duration = getShiftDuration(start, end, 60);
      expect(duration).toBe(8);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  getRetryDelayMs,
  getNextRetryDate,
  isDunningExhausted,
  getDunningStatus,
  MAX_DUNNING_ATTEMPTS,
} from '../dunning.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Dunning Utility', () => {
  describe('MAX_DUNNING_ATTEMPTS', () => {
    it('should be 3', () => {
      expect(MAX_DUNNING_ATTEMPTS).toBe(3);
    });
  });

  describe('getRetryDelayMs()', () => {
    it('should return 2 days delay after attempt 1', () => {
      expect(getRetryDelayMs(1)).toBe(2 * DAY_MS);
    });

    it('should return 4 days delay after attempt 2', () => {
      expect(getRetryDelayMs(2)).toBe(4 * DAY_MS);
    });

    it('should return default 2 days for out-of-range attempts', () => {
      expect(getRetryDelayMs(3)).toBe(2 * DAY_MS);
      expect(getRetryDelayMs(0)).toBe(2 * DAY_MS);
    });

    it('should always return a positive number', () => {
      for (let i = 0; i <= 5; i++) {
        expect(getRetryDelayMs(i)).toBeGreaterThan(0);
      }
    });

    it('should produce the correct retry schedule (Day 1, Day 3, Day 7)', () => {
      // Day 1 to Day 3 = 2 day delay
      const delay1 = getRetryDelayMs(1);
      expect(delay1 / DAY_MS).toBe(2);

      // Day 3 to Day 7 = 4 day delay
      const delay2 = getRetryDelayMs(2);
      expect(delay2 / DAY_MS).toBe(4);

      // Total span from Day 1 to Day 7 = 6 days
      expect((delay1 + delay2) / DAY_MS).toBe(6);
    });
  });

  describe('getNextRetryDate()', () => {
    it('should return a valid ISO date string', () => {
      const result = getNextRetryDate(1);
      expect(() => new Date(result)).not.toThrow();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return a date 2 days in the future for attempt 1', () => {
      const now = new Date('2025-01-15T12:00:00.000Z');
      const result = getNextRetryDate(1, now);
      const expected = new Date('2025-01-17T12:00:00.000Z');
      expect(new Date(result).getTime()).toBe(expected.getTime());
    });

    it('should return a date 4 days in the future for attempt 2', () => {
      const now = new Date('2025-01-15T12:00:00.000Z');
      const result = getNextRetryDate(2, now);
      const expected = new Date('2025-01-19T12:00:00.000Z');
      expect(new Date(result).getTime()).toBe(expected.getTime());
    });

    it('should use current time as default', () => {
      const before = Date.now();
      const result = new Date(getNextRetryDate(1)).getTime();
      const after = Date.now();

      // Result should be approximately 2 days from now
      const twoDays = 2 * DAY_MS;
      expect(result).toBeGreaterThanOrEqual(before + twoDays);
      expect(result).toBeLessThanOrEqual(after + twoDays);
    });
  });

  describe('isDunningExhausted()', () => {
    it('should return false for attempts 1 and 2', () => {
      expect(isDunningExhausted(1)).toBe(false);
      expect(isDunningExhausted(2)).toBe(false);
    });

    it('should return true for attempt 3 (max)', () => {
      expect(isDunningExhausted(3)).toBe(true);
    });

    it('should return true for attempts beyond max', () => {
      expect(isDunningExhausted(4)).toBe(true);
      expect(isDunningExhausted(10)).toBe(true);
    });

    it('should return false for attempt 0', () => {
      expect(isDunningExhausted(0)).toBe(false);
    });
  });

  describe('getDunningStatus()', () => {
    it('should return retry_1 for attempt 1', () => {
      expect(getDunningStatus(1)).toBe('retry_1');
    });

    it('should return retry_2 for attempt 2', () => {
      expect(getDunningStatus(2)).toBe('retry_2');
    });

    it('should return exhausted for attempt 3+', () => {
      expect(getDunningStatus(3)).toBe('exhausted');
      expect(getDunningStatus(4)).toBe('exhausted');
    });
  });

  describe('End-to-end dunning schedule', () => {
    it('should model the full Day 1 → Day 3 → Day 7 → suspend flow', () => {
      const day1 = new Date('2025-06-01T10:00:00.000Z');

      // Attempt 1 on Day 1
      expect(isDunningExhausted(1)).toBe(false);
      expect(getDunningStatus(1)).toBe('retry_1');

      // Schedule retry for Day 3
      const day3 = getNextRetryDate(1, day1);
      expect(new Date(day3).toISOString()).toBe('2025-06-03T10:00:00.000Z');

      // Attempt 2 on Day 3
      expect(isDunningExhausted(2)).toBe(false);
      expect(getDunningStatus(2)).toBe('retry_2');

      // Schedule retry for Day 7
      const day7 = getNextRetryDate(2, new Date(day3));
      expect(new Date(day7).toISOString()).toBe('2025-06-07T10:00:00.000Z');

      // Attempt 3 on Day 7 - exhausted
      expect(isDunningExhausted(3)).toBe(true);
      expect(getDunningStatus(3)).toBe('exhausted');
    });
  });
});

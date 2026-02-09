/**
 * Dunning Utility
 * Pure functions for dunning retry logic
 * Retry schedule: Day 1, Day 3, Day 7, then suspend
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Retry delay schedule:
 * After attempt 1: wait 2 days (Day 1 → Day 3)
 * After attempt 2: wait 4 days (Day 3 → Day 7)
 */
const RETRY_DELAYS_MS = [
  2 * DAY_MS, // After attempt 1: wait 2 days
  4 * DAY_MS, // After attempt 2: wait 4 days
];

export const MAX_DUNNING_ATTEMPTS = 3;

/**
 * Get the delay in milliseconds before the next retry attempt
 */
export function getRetryDelayMs(currentAttempt: number): number {
  return RETRY_DELAYS_MS[currentAttempt - 1] ?? 2 * DAY_MS;
}

/**
 * Get the ISO date string for the next retry attempt
 */
export function getNextRetryDate(currentAttempt: number, fromDate: Date = new Date()): string {
  const delayMs = getRetryDelayMs(currentAttempt);
  return new Date(fromDate.getTime() + delayMs).toISOString();
}

/**
 * Check if dunning attempts are exhausted
 */
export function isDunningExhausted(attempt: number): boolean {
  return attempt >= MAX_DUNNING_ATTEMPTS;
}

/**
 * Get a human-readable description of the dunning status
 */
export function getDunningStatus(attempt: number): string {
  if (attempt >= MAX_DUNNING_ATTEMPTS) return 'exhausted';
  return `retry_${attempt}`;
}

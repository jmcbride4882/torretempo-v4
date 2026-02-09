/**
 * useRosterValidation Hook
 * 
 * Provides real-time validation for roster shift assignments.
 * Calls the roster validation API with debouncing and caching.
 */

import { useState, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export interface ValidationIssue {
  rule: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ruleReference?: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ShiftData {
  start: string | Date;
  end: string | Date;
  locationId?: string;
  breakMinutes?: number;
}

interface CacheEntry {
  result: ValidationResult;
  timestamp: number;
}

interface UseRosterValidationOptions {
  organizationSlug: string;
  debounceMs?: number;
}

interface UseRosterValidationReturn {
  validate: (userId: string, shiftData: ShiftData, excludeShiftId?: string) => Promise<ValidationResult>;
  validateSync: (userId: string, shiftData: ShiftData, excludeShiftId?: string) => ValidationResult | null;
  isValidating: boolean;
  lastResult: ValidationResult | null;
  clearCache: () => void;
}

/**
 * Generate cache key from validation parameters
 */
function getCacheKey(userId: string, shiftData: ShiftData, excludeShiftId?: string): string {
  const start = typeof shiftData.start === 'string' ? shiftData.start : shiftData.start.toISOString();
  const end = typeof shiftData.end === 'string' ? shiftData.end : shiftData.end.toISOString();
  return `${userId}:${start}:${end}:${shiftData.locationId || ''}:${excludeShiftId || ''}`;
}

export function useRosterValidation({
  organizationSlug,
  debounceMs = 300,
}: UseRosterValidationOptions): UseRosterValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);
  
  // Cache for validation results
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Clear the validation cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  /**
   * Get cached result if valid
   */
  const getCachedResult = useCallback((cacheKey: string): ValidationResult | null => {
    const entry = cacheRef.current.get(cacheKey);
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cacheRef.current.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }, []);

  /**
   * Set cache entry
   */
  const setCachedResult = useCallback((cacheKey: string, result: ValidationResult) => {
    cacheRef.current.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
    
    // Cleanup old entries (keep max 100)
    if (cacheRef.current.size > 100) {
      const entries = Array.from(cacheRef.current.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        const key = entries[i]?.[0];
        if (key) cacheRef.current.delete(key);
      }
    }
  }, []);

  /**
   * Synchronous validation check (returns cached result or null)
   */
  const validateSync = useCallback((
    userId: string,
    shiftData: ShiftData,
    excludeShiftId?: string
  ): ValidationResult | null => {
    const cacheKey = getCacheKey(userId, shiftData, excludeShiftId);
    return getCachedResult(cacheKey);
  }, [getCachedResult]);

  /**
   * Async validation with debouncing
   */
  const validate = useCallback(async (
    userId: string,
    shiftData: ShiftData,
    excludeShiftId?: string
  ): Promise<ValidationResult> => {
    const cacheKey = getCacheKey(userId, shiftData, excludeShiftId);
    
    // Check cache first
    const cached = getCachedResult(cacheKey);
    if (cached) {
      setLastResult(cached);
      return cached;
    }
    
    // Cancel any pending debounced request
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    return new Promise((resolve) => {
      debounceTimerRef.current = setTimeout(async () => {
        setIsValidating(true);
        
        // Create new abort controller
        abortControllerRef.current = new AbortController();
        
        try {
          const response = await fetch(
            `${API_URL}/api/v1/org/${organizationSlug}/roster/validate`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              signal: abortControllerRef.current.signal,
              body: JSON.stringify({
                userId,
                shiftData: {
                  start: typeof shiftData.start === 'string' 
                    ? shiftData.start 
                    : shiftData.start.toISOString(),
                  end: typeof shiftData.end === 'string' 
                    ? shiftData.end 
                    : shiftData.end.toISOString(),
                  locationId: shiftData.locationId,
                  breakMinutes: shiftData.breakMinutes || 0,
                },
                excludeShiftId,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('Validation request failed');
          }
          
          const result: ValidationResult = await response.json();
          
          // Cache the result
          setCachedResult(cacheKey, result);
          setLastResult(result);
          
          resolve(result);
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            // Request was cancelled, don't reject
            return;
          }
          
          // Return a default "valid" result on error to not block the UI
          const fallbackResult: ValidationResult = {
            valid: true,
            violations: [],
            warnings: [{
              rule: 'validation_error',
              message: 'Could not validate shift. Please try again.',
              severity: 'low',
            }],
          };
          
          setLastResult(fallbackResult);
          resolve(fallbackResult);
        } finally {
          setIsValidating(false);
        }
      }, debounceMs);
    });
  }, [organizationSlug, debounceMs, getCachedResult, setCachedResult]);

  return {
    validate,
    validateSync,
    isValidating,
    lastResult,
    clearCache,
  };
}

export default useRosterValidation;

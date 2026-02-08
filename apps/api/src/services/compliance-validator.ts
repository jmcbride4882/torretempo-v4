/**
 * Compliance Validator Service
 * 
 * Real-time validation of Spanish labor law compliance.
 * All rules are synchronous with no database I/O (pure calculation).
 * 
 * Spanish Labor Law References:
 * - Estatuto de los Trabajadores Art. 34: Working time limits
 * - Art. 34.1: 40 hours/week regular, 48h absolute max
 * - Art. 34.3: 9 hours/day max, 12 hours rest between shifts
 * - Art. 34.4: 15 minutes break for shifts >6 hours
 * - Art. 37.1: 35 hours continuous weekly rest
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ComplianceResult {
  pass: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ruleReference?: string;
  recommendedAction?: string;
}

export interface TimeEntry {
  id: string;
  clock_in: Date;
  clock_out?: Date | null;
  break_minutes: number;
  clock_in_location?: { lat: number; lng: number } | null;
  clock_out_location?: { lat: number; lng: number } | null;
}

export interface BreakEntry {
  id: string;
  time_entry_id: string;
  break_start: Date;
  break_end?: Date | null;
  break_type: 'paid' | 'unpaid';
}

export interface ValidationContext {
  currentEntry: TimeEntry;
  allEntries: TimeEntry[];
  breaks: BreakEntry[];
  userAge?: number;
  isPregnant?: boolean;
  locationCoords: [number, number]; // [lat, lng]
  userCoords: [number, number]; // [lat, lng]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMEZONE = 'Europe/Madrid';
const MAX_DAILY_HOURS = 9;
const MAX_WEEKLY_HOURS_REGULAR = 40;
const MAX_WEEKLY_HOURS_ABSOLUTE = 48;
const MIN_REST_HOURS_BETWEEN_SHIFTS = 12;
const MANDATORY_BREAK_THRESHOLD_HOURS = 6;
const MANDATORY_BREAK_MINUTES = 15;
const MIN_WEEKLY_REST_HOURS = 35;
const MAX_NIGHT_WORK_HOURS = 8;
const NIGHT_WORK_START = 20; // 20:00
const NIGHT_WORK_END = 6; // 06:00
const GEOFENCE_RADIUS_METERS = 50;
const MAX_CONTINUOUS_WORK_HOURS = 9;
const ADOLESCENT_MAX_DAILY_HOURS = 8;
const ADOLESCENT_MAX_WEEKLY_HOURS = 40;
const ADOLESCENT_AGE_THRESHOLD = 18;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert UTC date to Europe/Madrid timezone
 */
function toMadridTime(date: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return new Date(
    `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`
  );
}

/**
 * Calculate duration in hours between two dates
 */
function calculateHours(start: Date, end: Date, breakMinutes = 0): number {
  const milliseconds = end.getTime() - start.getTime();
  const hours = milliseconds / (1000 * 60 * 60);
  return Math.max(0, hours - breakMinutes / 60);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get start of day in Madrid timezone
 */
function getStartOfDay(date: Date): Date {
  const madrid = toMadridTime(date);
  madrid.setHours(0, 0, 0, 0);
  return madrid;
}

/**
 * Get start of week (Monday) in Madrid timezone
 */
function getStartOfWeek(date: Date): Date {
  const madrid = toMadridTime(date);
  const day = madrid.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday is start of week
  const monday = new Date(madrid);
  monday.setDate(madrid.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Check if a time is during night hours (20:00 - 06:00)
 */
function isNightHours(date: Date): boolean {
  const madrid = toMadridTime(date);
  const hour = madrid.getHours();
  return hour >= NIGHT_WORK_START || hour < NIGHT_WORK_END;
}

/**
 * Get entries for a specific day
 */
function getEntriesForDay(entries: TimeEntry[], date: Date): TimeEntry[] {
  const dayStart = getStartOfDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return entries.filter((entry) => {
    const clockIn = toMadridTime(entry.clock_in);
    return clockIn >= dayStart && clockIn < dayEnd;
  });
}

/**
 * Get entries for a specific week
 */
function getEntriesForWeek(entries: TimeEntry[], date: Date): TimeEntry[] {
  const weekStart = getStartOfWeek(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return entries.filter((entry) => {
    const clockIn = toMadridTime(entry.clock_in);
    return clockIn >= weekStart && clockIn < weekEnd;
  });
}

/**
 * Calculate total hours for entries
 */
function calculateTotalHours(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => {
    if (!entry.clock_out) return total;
    return total + calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes);
  }, 0);
}

/**
 * Calculate night work hours for an entry
 */
function calculateNightWorkHours(entry: TimeEntry): number {
  if (!entry.clock_out) return 0;

  const clockIn = toMadridTime(entry.clock_in);
  const clockOut = toMadridTime(entry.clock_out);
  
  let nightHours = 0;
  const current = new Date(clockIn);

  while (current < clockOut) {
    if (isNightHours(current)) {
      nightHours += 1;
    }
    current.setHours(current.getHours() + 1);
  }

  // Approximate adjustment for partial hours
  const totalHours = calculateHours(entry.clock_in, entry.clock_out);
  const ratio = nightHours / totalHours;
  return totalHours * ratio - entry.break_minutes / 60;
}

// ============================================================================
// COMPLIANCE VALIDATOR CLASS
// ============================================================================

export class ComplianceValidator {
  /**
   * 1. Validate Daily Hours Limit (9h max)
   * Spanish Law: Estatuto Art. 34.3
   */
  validateDailyLimit(entries: TimeEntry[], targetDate?: Date): ComplianceResult {
    const date = targetDate || new Date();
    const dayEntries = getEntriesForDay(entries, date);
    const totalHours = calculateTotalHours(dayEntries);

    if (totalHours <= MAX_DAILY_HOURS) {
      return {
        pass: true,
        message: `Daily hours (${totalHours.toFixed(1)}h) within limit`,
        ruleReference: 'Estatuto Art. 34.3',
      };
    }

    const severity: ComplianceResult['severity'] = totalHours > MAX_DAILY_HOURS + 2 ? 'critical' : 'high';

    return {
      pass: false,
      severity,
      message: `Daily hours (${totalHours.toFixed(1)}h) exceed limit of ${MAX_DAILY_HOURS}h`,
      ruleReference: 'Estatuto Art. 34.3',
      recommendedAction: 'Contact your manager for approval and document the exception',
    };
  }

  /**
   * 2. Validate Weekly Hours Limit (40h regular time)
   * Spanish Law: Estatuto Art. 34.1
   */
  validateWeeklyLimit(entries: TimeEntry[], targetDate?: Date): ComplianceResult {
    const date = targetDate || new Date();
    const weekEntries = getEntriesForWeek(entries, date);
    const totalHours = calculateTotalHours(weekEntries);

    if (totalHours <= MAX_WEEKLY_HOURS_REGULAR) {
      return {
        pass: true,
        message: `Weekly hours (${totalHours.toFixed(1)}h) within regular limit`,
        ruleReference: 'Estatuto Art. 34.1',
      };
    }

    const severity: ComplianceResult['severity'] = totalHours > MAX_WEEKLY_HOURS_REGULAR + 4 ? 'medium' : 'low';

    return {
      pass: false,
      severity,
      message: `Weekly hours (${totalHours.toFixed(1)}h) exceed regular limit of ${MAX_WEEKLY_HOURS_REGULAR}h`,
      ruleReference: 'Estatuto Art. 34.1',
      recommendedAction: 'Hours between 40-48 count as overtime and require compensation',
    };
  }

  /**
   * 3. Validate Rest Period Between Shifts (12h min)
   * Spanish Law: Estatuto Art. 34.3
   */
  validateRestPeriod(entries: TimeEntry[]): ComplianceResult {
    if (entries.length < 2) {
      return {
        pass: true,
        message: 'Insufficient shift history to validate rest period',
        ruleReference: 'Estatuto Art. 34.3',
      };
    }

    // Sort entries by clock_out time
    const sorted = [...entries]
      .filter((e) => e.clock_out)
      .sort((a, b) => a.clock_out!.getTime() - b.clock_out!.getTime());

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (!current || !next || !current.clock_out || !next.clock_in) continue;

      const restHours = calculateHours(current.clock_out, next.clock_in);

      if (restHours < MIN_REST_HOURS_BETWEEN_SHIFTS) {
        return {
          pass: false,
          severity: 'critical',
          message: `Rest period (${restHours.toFixed(1)}h) below minimum of ${MIN_REST_HOURS_BETWEEN_SHIFTS}h`,
          ruleReference: 'Estatuto Art. 34.3',
          recommendedAction: 'Schedule must ensure 12 hours between shift end and next shift start',
        };
      }
    }

    return {
      pass: true,
      message: 'All rest periods meet minimum requirement',
      ruleReference: 'Estatuto Art. 34.3',
    };
  }

  /**
   * 4. Validate Mandatory Break (15min for shifts >6h)
   * Spanish Law: Estatuto Art. 34.4
   */
  validateMandatoryBreak(entry: TimeEntry, breaks: BreakEntry[]): ComplianceResult {
    if (!entry.clock_out) {
      return {
        pass: true,
        message: 'Shift not yet complete',
        ruleReference: 'Estatuto Art. 34.4',
      };
    }

    const shiftHours = calculateHours(entry.clock_in, entry.clock_out, 0);

    if (shiftHours <= MANDATORY_BREAK_THRESHOLD_HOURS) {
      return {
        pass: true,
        message: `Shift (${shiftHours.toFixed(1)}h) does not require mandatory break`,
        ruleReference: 'Estatuto Art. 34.4',
      };
    }

    const entryBreaks = breaks.filter((b) => b.time_entry_id === entry.id);
    const totalBreakMinutes = entryBreaks.reduce((total, b) => {
      if (!b.break_end) return total;
      return total + calculateHours(b.break_start, b.break_end) * 60;
    }, 0);

    if (totalBreakMinutes >= MANDATORY_BREAK_MINUTES) {
      return {
        pass: true,
        message: `Break time (${totalBreakMinutes.toFixed(0)}min) meets requirement`,
        ruleReference: 'Estatuto Art. 34.4',
      };
    }

    return {
      pass: false,
      severity: 'high',
      message: `Shift >${MANDATORY_BREAK_THRESHOLD_HOURS}h requires ${MANDATORY_BREAK_MINUTES}min break (current: ${totalBreakMinutes.toFixed(0)}min)`,
      ruleReference: 'Estatuto Art. 34.4',
      recommendedAction: 'Ensure employee takes mandatory break before end of shift',
    };
  }

  /**
   * 5. Validate Maximum Continuous Work (9h without 15min break)
   * Spanish Law: Estatuto Art. 34.4 (interpretation)
   */
  validateContinuousWork(entry: TimeEntry, breaks: BreakEntry[]): ComplianceResult {
    if (!entry.clock_out) {
      return {
        pass: true,
        message: 'Shift not yet complete',
        ruleReference: 'Estatuto Art. 34.4',
      };
    }

    const entryBreaks = breaks
      .filter((b) => b.time_entry_id === entry.id && b.break_end)
      .sort((a, b) => a.break_start.getTime() - b.break_start.getTime());

    if (entryBreaks.length === 0) {
      const continuousHours = calculateHours(entry.clock_in, entry.clock_out, 0);

      if (continuousHours > MAX_CONTINUOUS_WORK_HOURS) {
        return {
          pass: false,
          severity: 'high',
          message: `Continuous work (${continuousHours.toFixed(1)}h) exceeds ${MAX_CONTINUOUS_WORK_HOURS}h without break`,
          ruleReference: 'Estatuto Art. 34.4',
          recommendedAction: 'Schedule break within continuous work period',
        };
      }
    } else {
      // Check each continuous work segment
      let segmentStart = entry.clock_in;

      for (const breakEntry of entryBreaks) {
        const segmentHours = calculateHours(segmentStart, breakEntry.break_start, 0);

        if (segmentHours > MAX_CONTINUOUS_WORK_HOURS) {
          return {
            pass: false,
            severity: 'high',
            message: `Continuous work segment (${segmentHours.toFixed(1)}h) exceeds ${MAX_CONTINUOUS_WORK_HOURS}h`,
            ruleReference: 'Estatuto Art. 34.4',
            recommendedAction: 'Break should be scheduled earlier in shift',
          };
        }

        segmentStart = breakEntry.break_end!;
      }

      // Check final segment
      const finalHours = calculateHours(segmentStart, entry.clock_out, 0);
      if (finalHours > MAX_CONTINUOUS_WORK_HOURS) {
        return {
          pass: false,
          severity: 'high',
          message: `Final work segment (${finalHours.toFixed(1)}h) exceeds ${MAX_CONTINUOUS_WORK_HOURS}h`,
          ruleReference: 'Estatuto Art. 34.4',
          recommendedAction: 'Additional break needed before end of shift',
        };
      }
    }

    return {
      pass: true,
      message: 'Continuous work periods within acceptable limits',
      ruleReference: 'Estatuto Art. 34.4',
    };
  }

  /**
   * 6. Validate Weekly Rest Period (35h continuous once per week)
   * Spanish Law: Estatuto Art. 37.1
   */
  validateWeeklyRest(entries: TimeEntry[], targetDate?: Date): ComplianceResult {
    const date = targetDate || new Date();
    const weekEntries = getEntriesForWeek(entries, date)
      .filter((e) => e.clock_out)
      .sort((a, b) => a.clock_in.getTime() - b.clock_in.getTime());

    if (weekEntries.length === 0) {
      return {
        pass: true,
        message: 'No completed shifts this week',
        ruleReference: 'Estatuto Art. 37.1',
      };
    }

    // Find longest rest period between shifts
    let maxRestHours = 0;

    for (let i = 0; i < weekEntries.length - 1; i++) {
      const current = weekEntries[i];
      const next = weekEntries[i + 1];

      if (current && next && current.clock_out && next.clock_in) {
        const restHours = calculateHours(current.clock_out, next.clock_in);
        maxRestHours = Math.max(maxRestHours, restHours);
      }
    }

    if (maxRestHours >= MIN_WEEKLY_REST_HOURS) {
      return {
        pass: true,
        message: `Weekly rest period (${maxRestHours.toFixed(1)}h) meets requirement`,
        ruleReference: 'Estatuto Art. 37.1',
      };
    }

    return {
      pass: false,
      severity: 'critical',
      message: `No ${MIN_WEEKLY_REST_HOURS}h continuous rest period found (max: ${maxRestHours.toFixed(1)}h)`,
      ruleReference: 'Estatuto Art. 37.1',
      recommendedAction: 'Schedule must include 35 continuous hours rest per week',
    };
  }

  /**
   * 7. Validate Night Work Limit (8h max for 20:00-06:00)
   * Spanish Law: Estatuto Art. 36 (Night work regulations)
   */
  validateNightWork(entry: TimeEntry): ComplianceResult {
    if (!entry.clock_out) {
      return {
        pass: true,
        message: 'Shift not yet complete',
        ruleReference: 'Estatuto Art. 36',
      };
    }

    const nightHours = calculateNightWorkHours(entry);

    if (nightHours <= MAX_NIGHT_WORK_HOURS) {
      return {
        pass: true,
        message: `Night work hours (${nightHours.toFixed(1)}h) within limit`,
        ruleReference: 'Estatuto Art. 36',
      };
    }

    return {
      pass: false,
      severity: 'high',
      message: `Night work hours (${nightHours.toFixed(1)}h) exceed limit of ${MAX_NIGHT_WORK_HOURS}h`,
      ruleReference: 'Estatuto Art. 36',
      recommendedAction: 'Limit night shift duration or schedule breaks during night hours',
    };
  }

  /**
   * 8. Validate Overtime Tracking (weekly hours 40-48h)
   * Spanish Law: Estatuto Art. 34.1
   */
  validateOvertime(entries: TimeEntry[], targetDate?: Date): ComplianceResult {
    const date = targetDate || new Date();
    const weekEntries = getEntriesForWeek(entries, date);
    const totalHours = calculateTotalHours(weekEntries);

    if (totalHours <= MAX_WEEKLY_HOURS_REGULAR) {
      return {
        pass: true,
        message: `No overtime (${totalHours.toFixed(1)}h <= ${MAX_WEEKLY_HOURS_REGULAR}h)`,
        ruleReference: 'Estatuto Art. 34.1',
      };
    }

    if (totalHours <= MAX_WEEKLY_HOURS_ABSOLUTE) {
      const overtimeHours = totalHours - MAX_WEEKLY_HOURS_REGULAR;
      return {
        pass: true,
        severity: 'low',
        message: `Overtime tracked: ${overtimeHours.toFixed(1)}h (within legal limit)`,
        ruleReference: 'Estatuto Art. 34.1',
        recommendedAction: 'Ensure overtime is compensated or offset with time off',
      };
    }

    const overtimeHours = totalHours - MAX_WEEKLY_HOURS_REGULAR;
    return {
      pass: false,
      severity: 'critical',
      message: `Overtime (${overtimeHours.toFixed(1)}h) causes total to exceed absolute maximum`,
      ruleReference: 'Estatuto Art. 34.1',
      recommendedAction: 'Total weekly hours cannot exceed 48h including overtime',
    };
  }

  /**
   * 9. Validate Maximum Absolute Weekly (48h including overtime)
   * Spanish Law: Estatuto Art. 34.1
   */
  validateAbsoluteWeeklyMax(entries: TimeEntry[], targetDate?: Date): ComplianceResult {
    const date = targetDate || new Date();
    const weekEntries = getEntriesForWeek(entries, date);
    const totalHours = calculateTotalHours(weekEntries);

    if (totalHours <= MAX_WEEKLY_HOURS_ABSOLUTE) {
      return {
        pass: true,
        message: `Weekly hours (${totalHours.toFixed(1)}h) within absolute maximum`,
        ruleReference: 'Estatuto Art. 34.1',
      };
    }

    return {
      pass: false,
      severity: 'critical',
      message: `Weekly hours (${totalHours.toFixed(1)}h) exceed absolute maximum of ${MAX_WEEKLY_HOURS_ABSOLUTE}h`,
      ruleReference: 'Estatuto Art. 34.1',
      recommendedAction: 'Immediate action required - no further work allowed this week',
    };
  }

  /**
   * 10. Validate Adolescent Restrictions (8h/day, 40h/week if under 18)
   * Spanish Law: Estatuto Art. 34.3 (special provisions for minors)
   */
  validateAdolescentRestrictions(entry: TimeEntry, entries: TimeEntry[], userAge?: number): ComplianceResult {
    if (!userAge || userAge >= ADOLESCENT_AGE_THRESHOLD) {
      return {
        pass: true,
        message: 'Not applicable (user is 18 or older)',
        ruleReference: 'Estatuto Art. 34.3',
      };
    }

    // Check daily limit
    if (entry.clock_out) {
      const dailyHours = calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes);

      if (dailyHours > ADOLESCENT_MAX_DAILY_HOURS) {
        return {
          pass: false,
          severity: 'critical',
          message: `Adolescent daily hours (${dailyHours.toFixed(1)}h) exceed limit of ${ADOLESCENT_MAX_DAILY_HOURS}h`,
          ruleReference: 'Estatuto Art. 34.3',
          recommendedAction: 'Adolescent workers (<18) have stricter hour limits',
        };
      }
    }

    // Check weekly limit
    const weekEntries = getEntriesForWeek(entries, entry.clock_in);
    const weeklyHours = calculateTotalHours(weekEntries);

    if (weeklyHours > ADOLESCENT_MAX_WEEKLY_HOURS) {
      return {
        pass: false,
        severity: 'critical',
        message: `Adolescent weekly hours (${weeklyHours.toFixed(1)}h) exceed limit of ${ADOLESCENT_MAX_WEEKLY_HOURS}h`,
        ruleReference: 'Estatuto Art. 34.3',
        recommendedAction: 'Adolescent workers (<18) cannot work more than 40h/week',
      };
    }

    return {
      pass: true,
      message: 'Adolescent restrictions met',
      ruleReference: 'Estatuto Art. 34.3',
    };
  }

  /**
   * 11. Validate Pregnant Worker Restrictions (night shift blocked if applicable)
   * Spanish Law: Ley 31/1995 Art. 26 (Special protection for pregnant workers)
   */
  validatePregnantWorker(entry: TimeEntry, isPregnant?: boolean): ComplianceResult {
    if (!isPregnant) {
      return {
        pass: true,
        message: 'Not applicable',
        ruleReference: 'Ley 31/1995 Art. 26',
      };
    }

    const clockInNight = isNightHours(entry.clock_in);
    const clockOutNight = entry.clock_out ? isNightHours(entry.clock_out) : false;

    if (clockInNight || clockOutNight) {
      return {
        pass: false,
        severity: 'critical',
        message: 'Pregnant workers should not be assigned night shifts',
        ruleReference: 'Ley 31/1995 Art. 26',
        recommendedAction: 'Reassign to daytime shift immediately',
      };
    }

    return {
      pass: true,
      message: 'Pregnant worker protections met',
      ruleReference: 'Ley 31/1995 Art. 26',
    };
  }

  /**
   * 12. Validate Clock-in Geofence (50m radius)
   * Spanish Law: General compliance requirement for location verification
   */
  validateGeofence(userCoords: [number, number], locationCoords: [number, number]): ComplianceResult {
    const distance = calculateDistance(userCoords, locationCoords);

    if (distance <= GEOFENCE_RADIUS_METERS) {
      return {
        pass: true,
        message: `Clock-in location verified (${distance.toFixed(1)}m from site)`,
        ruleReference: 'Organization geofence policy',
      };
    }

    const severity: ComplianceResult['severity'] = distance > GEOFENCE_RADIUS_METERS * 2 ? 'high' : 'medium';

    return {
      pass: false,
      severity,
      message: `Clock-in location (${distance.toFixed(1)}m) exceeds geofence radius (${GEOFENCE_RADIUS_METERS}m)`,
      ruleReference: 'Organization geofence policy',
      recommendedAction: 'Verify employee is at correct work location',
    };
  }

  /**
   * Validate all rules against current context
   */
  validateAll(context: ValidationContext): ComplianceResult[] {
    const results: ComplianceResult[] = [];

    // 1. Daily limit
    results.push(this.validateDailyLimit(context.allEntries, context.currentEntry.clock_in));

    // 2. Weekly limit
    results.push(this.validateWeeklyLimit(context.allEntries, context.currentEntry.clock_in));

    // 3. Rest period
    results.push(this.validateRestPeriod(context.allEntries));

    // 4. Mandatory break
    results.push(this.validateMandatoryBreak(context.currentEntry, context.breaks));

    // 5. Continuous work
    results.push(this.validateContinuousWork(context.currentEntry, context.breaks));

    // 6. Weekly rest
    results.push(this.validateWeeklyRest(context.allEntries, context.currentEntry.clock_in));

    // 7. Night work
    results.push(this.validateNightWork(context.currentEntry));

    // 8. Overtime
    results.push(this.validateOvertime(context.allEntries, context.currentEntry.clock_in));

    // 9. Absolute weekly max
    results.push(this.validateAbsoluteWeeklyMax(context.allEntries, context.currentEntry.clock_in));

    // 10. Adolescent restrictions
    results.push(
      this.validateAdolescentRestrictions(context.currentEntry, context.allEntries, context.userAge)
    );

    // 11. Pregnant worker
    results.push(this.validatePregnantWorker(context.currentEntry, context.isPregnant));

    // 12. Geofence
    results.push(this.validateGeofence(context.userCoords, context.locationCoords));

    return results;
  }
}

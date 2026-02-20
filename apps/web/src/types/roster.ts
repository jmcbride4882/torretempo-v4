// Roster and Shift Types
// Aligned with backend schema from apps/api/src/db/schema.ts

export type ShiftStatus = 'draft' | 'published' | 'acknowledged' | 'completed' | 'cancelled';

export type ComplianceViolationType = '12h_rest' | 'weekly_limit' | 'daily_limit';

export interface ComplianceViolation {
  type: ComplianceViolationType;
  message: string;
  severity: 'error' | 'warning';
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address?: string | null;
  lat?: string | null;
  lng?: string | null;
  geofence_radius?: number | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'owner' | 'admin' | 'member';
}

export interface Shift {
  id: string;
  organization_id: string;
  user_id?: string | null;
  location_id: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  status: ShiftStatus;
  notes?: string | null;
  color?: string | null;
  required_skill_id?: string | null;
  created_by: string;
  published_at?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  location?: Location;
  user?: TeamMember;
  // Compliance warnings (if any)
  compliance_warnings?: ComplianceViolation[];
}

export interface ShiftWithPosition extends Shift {
  // Calculated for grid positioning
  dayIndex: number;
  startMinutes: number;
  durationMinutes: number;
}

export interface RosterFilters {
  locationId?: string;
  startDate: Date;
  endDate: Date;
  userId?: string;
  status?: ShiftStatus;
}

export interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

// API Response types
export interface ShiftsResponse {
  shifts: Shift[];
}

export interface LocationsResponse {
  locations: Location[];
}

// Roster view modes
export type RosterViewMode = 'week' | 'day' | 'month';

// Status color mapping
export const SHIFT_STATUS_COLORS: Record<ShiftStatus, { bg: string; text: string; border: string }> = {
  draft: {
    bg: 'bg-kresna-light',
    text: 'text-kresna-gray-dark',
    border: 'border-kresna-border',
  },
  published: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    border: 'border-primary-200',
  },
  acknowledged: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  completed: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    border: 'border-primary-200',
  },
  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

// Default shift colors for visual distinction
export const SHIFT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#22c55e', // green
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#ef4444', // red
];

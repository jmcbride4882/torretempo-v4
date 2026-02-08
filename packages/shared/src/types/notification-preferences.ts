/**
 * Notification Preference Types
 * 
 * User-specific notification settings including Do Not Disturb (DND).
 * 
 * Spanish law: Right to Disconnect (Ley Orgánica 3/2018)
 * Ensures employees can disconnect during off-hours.
 */

export const DND_DAYS = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
} as const;

export type DndDay = typeof DND_DAYS[keyof typeof DND_DAYS];

/**
 * Notification preferences stored in database
 */
export interface NotificationPreferences {
  id: string;
  user_id: string;

  // Do Not Disturb
  dnd_enabled: boolean;
  dnd_start_time?: string; // "22:00" (HH:mm format)
  dnd_end_time?: string; // "08:00" (HH:mm format)
  dnd_days?: DndDay[]; // Days when DND is active
  dnd_urgent_override: boolean; // Allow urgent notifications during DND

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Create/update notification preferences
 */
export interface UpdateNotificationPreferencesRequest {
  user_id: string;
  dnd_enabled?: boolean;
  dnd_start_time?: string;
  dnd_end_time?: string;
  dnd_days?: DndDay[];
  dnd_urgent_override?: boolean;
}

/**
 * Check if user should receive notification based on preferences
 */
export interface ShouldNotifyResult {
  should_notify: boolean;
  reason?: string; // e.g., "DND active", "Outside DND hours", etc.
}

/**
 * Notification preferences with defaults
 */
export interface NotificationPreferencesWithDefaults extends NotificationPreferences {
  // Helper properties computed from preferences
  is_dnd_active_now: boolean;
  next_dnd_start?: Date;
  next_dnd_end?: Date;
}

/**
 * Default notification preferences (Spanish law compliant)
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  'id' | 'user_id' | 'created_at' | 'updated_at'
> = {
  dnd_enabled: false,
  dnd_start_time: '22:00',
  dnd_end_time: '08:00',
  dnd_days: ['saturday', 'sunday'],
  dnd_urgent_override: true,
};

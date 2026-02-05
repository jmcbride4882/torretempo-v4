export const NOTIFICATION_TYPES = {
  swap_requested: 'swap_requested',
  swap_accepted: 'swap_accepted',
  swap_rejected: 'swap_rejected',
  swap_manager_needed: 'swap_manager_needed',
  swap_approved: 'swap_approved',
  swap_completed: 'swap_completed',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_TYPE_LIST: NotificationType[] = Object.values(NOTIFICATION_TYPES);

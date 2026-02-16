import { inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications, user } from '../db/schema.js';
import { emailQueue, EmailJob } from '../lib/queue.js';
import { NotificationType } from '../lib/notifications.js';
import logger from '../lib/logger.js';

export interface SwapEmailData {
  userName?: string;
  requesterName?: string;
  recipientName?: string;
  managerName?: string;
  offeredShiftDate?: string;
  offeredShiftTime?: string;
  offeredShiftLocation?: string;
  desiredShiftDate?: string;
  desiredShiftTime?: string;
  desiredShiftLocation?: string;
  reason?: string;
  organizationName?: string;
  actionLabel?: string;
}

export interface SwapNotificationPayload {
  organizationId: string;
  swapId: string;
  title: string;
  message: string;
  link?: string;
  emailData?: SwapEmailData;
  channels?: {
    inApp?: boolean;
    email?: boolean;
  };
}

const emailTemplateMap: Record<NotificationType, { subject: string; template: string }> = {
  swap_requested: {
    subject: 'Solicitud de cambio de turno / Shift swap requested',
    template: 'swapRequested.html',
  },
  swap_accepted: {
    subject: 'Cambio de turno aceptado / Shift swap accepted',
    template: 'swapAccepted.html',
  },
  swap_rejected: {
    subject: 'Cambio de turno rechazado / Shift swap rejected',
    template: 'swapRejected.html',
  },
  swap_manager_needed: {
    subject: 'Aprobación requerida / Manager approval needed',
    template: 'swapManagerNeeded.html',
  },
  swap_approved: {
    subject: 'Cambio de turno aprobado / Shift swap approved',
    template: 'swapApproved.html',
  },
  swap_completed: {
    subject: 'Cambio de turno completado / Shift swap completed',
    template: 'swapCompleted.html',
  },
};

const DEFAULT_TEXT = 'No indicado / Not specified';
const DEFAULT_LOCATION = 'Sin ubicación / No location';
const DEFAULT_TIME = '—';
const DEFAULT_REASON = 'No indicado / Not provided';

function buildEmailData(params: {
  userName: string;
  title: string;
  message: string;
  swapId: string;
  swapLink: string;
  emailData?: SwapEmailData;
}): Record<string, unknown> {
  const data = params.emailData ?? {};

  return {
    userName: params.userName,
    title: params.title,
    message: params.message,
    swapId: params.swapId,
    swapLink: params.swapLink,
    requesterName: data.requesterName || DEFAULT_TEXT,
    recipientName: data.recipientName || DEFAULT_TEXT,
    managerName: data.managerName || 'Equipo de gestión / Management',
    offeredShiftDate: data.offeredShiftDate || DEFAULT_TEXT,
    offeredShiftTime: data.offeredShiftTime || DEFAULT_TIME,
    offeredShiftLocation: data.offeredShiftLocation || DEFAULT_LOCATION,
    desiredShiftDate: data.desiredShiftDate || DEFAULT_TEXT,
    desiredShiftTime: data.desiredShiftTime || DEFAULT_TIME,
    desiredShiftLocation: data.desiredShiftLocation || DEFAULT_LOCATION,
    reason: data.reason || DEFAULT_REASON,
    organizationName: data.organizationName || 'Torre Tempo',
    actionLabel: data.actionLabel || 'Ver solicitud / Review request',
  };
}

export async function sendSwapNotification(
  type: NotificationType,
  recipientId: string | string[],
  data: SwapNotificationPayload
): Promise<void> {
  const recipientIds = Array.isArray(recipientId) ? recipientId : [recipientId];
  const uniqueRecipientIds = Array.from(new Set(recipientIds.filter(Boolean)));

  if (uniqueRecipientIds.length === 0) {
    return;
  }

  const { organizationId, swapId, title, message, link, emailData, channels } = data;
  const notificationLink = link || `/app/swaps/${swapId}`;
  const sendInApp = channels?.inApp !== false;
  const sendEmail = channels?.email !== false;
  const templateInfo = emailTemplateMap[type];

  let recipientRows: Array<{ id: string; email: string; name: string | null }> = [];

  try {
    recipientRows = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(inArray(user.id, uniqueRecipientIds));
  } catch (error) {
    logger.error('Failed to load recipients for swap notification:', error);
  }

  const recipientMap = new Map(recipientRows.map((row) => [row.id, row]));

  for (const id of uniqueRecipientIds) {
    try {
      if (sendInApp) {
        await db.insert(notifications).values({
          organization_id: organizationId,
          user_id: id,
          type,
          title,
          message,
          link: notificationLink,
          read: false,
        });
      }
    } catch (error) {
      logger.error('Failed to create in-app notification:', {
        error,
        recipientId: id,
        type,
      });
    }

    if (!sendEmail) {
      continue;
    }

    if (!templateInfo) {
      logger.warn('Missing email template mapping for notification type:', type);
      continue;
    }

    const recipient = recipientMap.get(id);

    if (!recipient?.email) {
      logger.warn('Notification recipient missing email:', { recipientId: id, type });
      continue;
    }

    const recipientName = recipient.name || recipient.email;
    const job: EmailJob = {
      to: recipient.email,
      subject: templateInfo.subject,
      template: templateInfo.template,
      data: buildEmailData({
        userName: recipientName,
        title,
        message,
        swapId,
        swapLink: notificationLink,
        emailData,
      }),
    };

    try {
      await emailQueue.add('send', job);
    } catch (error) {
      logger.error('Failed to enqueue email notification:', {
        error,
        recipientId: id,
        type,
      });
    }
  }
}

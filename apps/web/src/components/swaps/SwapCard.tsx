import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  MapPin,
  User,
  MessageSquare,
  Check,
  X,
  Loader2,
  Hand,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SwapStatusBadge } from './SwapStatusBadge';
import type { SwapRequest, PeerAction, ManagerAction } from '@/types/swaps';

interface SwapCardProps {
  swap: SwapRequest;
  currentUserId: string;
  isManager?: boolean;
  onPeerAction?: (swapId: string, action: PeerAction) => Promise<void>;
  onManagerAction?: (swapId: string, action: ManagerAction) => Promise<void>;
  onClaim?: (swapId: string) => Promise<void>;
  onCancel?: (swapId: string) => Promise<void>;
  className?: string;
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Format time for display
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Format relative time (accepts t function for i18n)
function formatRelativeTime(dateString: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return t('swaps.time.justNow');
  if (diffMins < 60) return t('swaps.time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('swaps.time.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('swaps.time.daysAgo', { count: diffDays });
  return formatDate(dateString);
}

// Shift detail mini-card
function ShiftDetail({
  label,
  shift,
  isOpen,
}: {
  label: string;
  shift?: SwapRequest['offered_shift'];
  isOpen?: boolean;
}) {
  const { t } = useTranslation();

  if (isOpen) {
    return (
      <div className="flex-1 rounded-xl border border-dashed border-kresna-border bg-kresna-light p-3">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-kresna-gray">
          {label}
        </p>
        <div className="flex items-center gap-2 text-kresna-gray">
          <Hand className="h-4 w-4" />
          <span className="text-sm italic">{t('swaps.labels.openRequest')}</span>
        </div>
        <p className="mt-1 text-[10px] text-kresna-gray">
          {t('swaps.labels.anyoneCanClaim')}
        </p>
      </div>
    );
  }

  if (!shift) return null;

  return (
    <div className="flex-1 rounded-xl border border-kresna-border bg-kresna-light p-3">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-kresna-gray">
        {label}
      </p>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-charcoal">
        <Calendar className="h-3.5 w-3.5 text-kresna-gray" />
        <span className="text-sm font-medium">{formatDate(shift.start_time)}</span>
      </div>

      {/* Time */}
      <div className="mt-1.5 flex items-center gap-1.5 text-kresna-gray-dark">
        <Clock className="h-3.5 w-3.5 text-kresna-gray" />
        <span className="text-xs tabular-nums">
          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
        </span>
      </div>

      {/* Location */}
      {shift.location && (
        <div className="mt-1.5 flex items-center gap-1.5 text-kresna-gray">
          <MapPin className="h-3.5 w-3.5 text-kresna-gray" />
          <span className="truncate text-xs">{shift.location.name}</span>
        </div>
      )}
    </div>
  );
}

export function SwapCard({
  swap,
  currentUserId,
  isManager = false,
  onPeerAction,
  onManagerAction,
  onClaim,
  onCancel,
  className,
}: SwapCardProps) {
  const { t } = useTranslation();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Determine user's role in this swap
  const isRequester = swap.requester_id === currentUserId;
  const isRecipient = swap.recipient_id === currentUserId;
  const isOpenRequest = !swap.recipient_id && !swap.desired_shift_id;
  
  // Action handlers with loading state
  const handleAction = async (
    action: string,
    handler?: () => Promise<void>
  ) => {
    if (!handler || loadingAction) return;
    setLoadingAction(action);
    try {
      await handler();
    } finally {
      setLoadingAction(null);
    }
  };

  // Determine available actions
  const canAcceptReject =
    swap.status === 'pending_peer' &&
    isRecipient &&
    !isRequester &&
    onPeerAction;

  const canApproveReject =
    swap.status === 'pending_manager' &&
    isManager &&
    onManagerAction;

  const canClaim =
    swap.status === 'pending_peer' &&
    isOpenRequest &&
    !isRequester &&
    onClaim;

  const canCancel =
    (swap.status === 'pending_peer' || swap.status === 'pending_manager') &&
    isRequester &&
    onCancel;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-kresna-border bg-white shadow-card transition-all duration-300',
        'hover:shadow-kresna',
        className
      )}
    >
      {/* Subtle top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="p-4 sm:p-5">
        {/* Header: Status + Time */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <SwapStatusBadge status={swap.status} size="md" />
          <span className="shrink-0 text-xs text-kresna-gray">
            {formatRelativeTime(swap.created_at, t)}
          </span>
        </div>

        {/* Users involved */}
        <div className="mb-4 flex items-center gap-3">
          {/* Requester */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-medium text-white shadow-sm">
              {swap.requester?.name?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-charcoal">
                {swap.requester?.name || t('swaps.labels.unknown')}
              </p>
              <p className="text-[10px] text-kresna-gray">{t('swaps.labels.requester')}</p>
            </div>
          </div>

          {/* Arrow */}
          <ArrowLeftRight className="mx-1 h-4 w-4 shrink-0 text-kresna-gray" />

          {/* Recipient */}
          <div className="flex items-center gap-2">
            {swap.recipient ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-medium text-white shadow-sm">
                  {swap.recipient.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-charcoal">
                    {swap.recipient.name}
                  </p>
                  <p className="text-[10px] text-kresna-gray">{t('swaps.labels.recipient')}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-kresna-border bg-kresna-light">
                  <User className="h-4 w-4 text-kresna-gray" />
                </div>
                <div>
                  <p className="text-sm italic text-kresna-gray">{t('swaps.labels.open')}</p>
                  <p className="text-[10px] text-kresna-gray">{t('swaps.labels.anyone')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shift details */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <ShiftDetail label={t('swaps.labels.offering')} shift={swap.offered_shift} />
          <ShiftDetail
            label={t('swaps.labels.requesting')}
            shift={swap.desired_shift || undefined}
            isOpen={!swap.desired_shift_id}
          />
        </div>

        {/* Reason/Notes */}
        {swap.reason && (
          <div className="mb-4 rounded-xl border border-kresna-border bg-kresna-light p-3">
            <div className="mb-1 flex items-center gap-1.5 text-kresna-gray">
              <MessageSquare className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {t('swaps.labels.reason')}
              </span>
            </div>
            <p className="text-sm text-kresna-gray-dark">{swap.reason}</p>
          </div>
        )}

        {/* Rejection reason if rejected */}
        {swap.status === 'rejected' && swap.rejection_reason && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-red-600">
              <X className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {t('swaps.labels.rejectionReason')}
              </span>
            </div>
            <p className="text-sm text-red-700">{swap.rejection_reason}</p>
          </div>
        )}

        {/* Actions */}
        {(canAcceptReject || canApproveReject || canClaim || canCancel) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-kresna-border pt-4">
            {/* Peer actions: Accept/Reject */}
            {canAcceptReject && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    handleAction('accept', () => onPeerAction!(swap.id, 'accept'))
                  }
                  disabled={!!loadingAction}
                  className="min-h-touch gap-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                >
                  {loadingAction === 'accept' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {t('swaps.actions.accept')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleAction('reject', () => onPeerAction!(swap.id, 'reject'))
                  }
                  disabled={!!loadingAction}
                  className="min-h-touch gap-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                >
                  {loadingAction === 'reject' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  {t('swaps.actions.reject')}
                </Button>
              </>
            )}

            {/* Manager actions: Approve/Reject */}
            {canApproveReject && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    handleAction('approve', () => onManagerAction!(swap.id, 'approve'))
                  }
                  disabled={!!loadingAction}
                  className="min-h-touch gap-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                >
                  {loadingAction === 'approve' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {t('swaps.actions.approve')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleAction('reject', () => onManagerAction!(swap.id, 'reject'))
                  }
                  disabled={!!loadingAction}
                  className="min-h-touch gap-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                >
                  {loadingAction === 'reject' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  {t('swaps.actions.reject')}
                </Button>
              </>
            )}

            {/* Claim open request */}
            {canClaim && (
              <Button
                size="sm"
                onClick={() => handleAction('claim', () => onClaim!(swap.id))}
                disabled={!!loadingAction}
                className="min-h-touch gap-1.5 rounded-xl bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100"
              >
                {loadingAction === 'claim' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Hand className="h-3.5 w-3.5" />
                )}
                {t('swaps.actions.claimSwap')}
              </Button>
            )}

            {/* Cancel */}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('cancel', () => onCancel!(swap.id))}
                disabled={!!loadingAction}
                className="ml-auto min-h-touch gap-1.5 rounded-xl text-kresna-gray hover:bg-kresna-light hover:text-charcoal"
              >
                {loadingAction === 'cancel' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {t('swaps.actions.cancel')}
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Skeleton loader for swap cards
export function SwapCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-kresna-border bg-white p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="h-6 w-28 rounded-full bg-kresna-border" />
        <div className="h-4 w-16 rounded bg-kresna-border" />
      </div>

      {/* Users */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-kresna-border" />
          <div className="space-y-1">
            <div className="h-4 w-20 rounded bg-kresna-border" />
            <div className="h-3 w-14 rounded bg-kresna-border" />
          </div>
        </div>
        <div className="h-4 w-4 rounded bg-kresna-border" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-kresna-border" />
          <div className="space-y-1">
            <div className="h-4 w-20 rounded bg-kresna-border" />
            <div className="h-3 w-14 rounded bg-kresna-border" />
          </div>
        </div>
      </div>

      {/* Shifts */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-2 rounded-xl border border-kresna-border bg-kresna-light p-3">
          <div className="h-3 w-16 rounded bg-kresna-border" />
          <div className="h-4 w-24 rounded bg-kresna-border" />
          <div className="h-3 w-20 rounded bg-kresna-border" />
        </div>
        <div className="flex-1 space-y-2 rounded-xl border border-kresna-border bg-kresna-light p-3">
          <div className="h-3 w-16 rounded bg-kresna-border" />
          <div className="h-4 w-24 rounded bg-kresna-border" />
          <div className="h-3 w-20 rounded bg-kresna-border" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-kresna-border pt-4">
        <div className="h-8 w-20 rounded-lg bg-kresna-border" />
        <div className="h-8 w-20 rounded-lg bg-kresna-border" />
      </div>
    </div>
  );
}

export default SwapCard;

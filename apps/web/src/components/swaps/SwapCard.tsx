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

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
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
  if (isOpen) {
    return (
      <div className="flex-1 rounded-xl border border-dashed border-neutral-600 bg-neutral-800/30 p-3">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <div className="flex items-center gap-2 text-neutral-400">
          <Hand className="h-4 w-4" />
          <span className="text-sm italic">Open Request</span>
        </div>
        <p className="mt-1 text-[10px] text-neutral-500">
          Anyone can claim this swap
        </p>
      </div>
    );
  }

  if (!shift) return null;

  return (
    <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      
      {/* Date */}
      <div className="flex items-center gap-1.5 text-white">
        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
        <span className="text-sm font-medium">{formatDate(shift.start_time)}</span>
      </div>
      
      {/* Time */}
      <div className="mt-1.5 flex items-center gap-1.5 text-neutral-300">
        <Clock className="h-3.5 w-3.5 text-neutral-500" />
        <span className="text-xs tabular-nums">
          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
        </span>
      </div>
      
      {/* Location */}
      {shift.location && (
        <div className="mt-1.5 flex items-center gap-1.5 text-neutral-400">
          <MapPin className="h-3.5 w-3.5 text-neutral-500" />
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
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300',
        'hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20',
        className
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="p-4 sm:p-5">
        {/* Header: Status + Time */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <SwapStatusBadge status={swap.status} size="md" />
          <span className="shrink-0 text-xs text-neutral-500">
            {formatRelativeTime(swap.created_at)}
          </span>
        </div>

        {/* Users involved */}
        <div className="mb-4 flex items-center gap-3">
          {/* Requester */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/80 to-primary-700/80 text-sm font-medium text-white shadow-lg shadow-primary-500/20">
              {swap.requester?.name?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {swap.requester?.name || 'Unknown'}
              </p>
              <p className="text-[10px] text-neutral-500">Requester</p>
            </div>
          </div>

          {/* Arrow */}
          <ArrowLeftRight className="mx-1 h-4 w-4 shrink-0 text-neutral-500" />

          {/* Recipient */}
          <div className="flex items-center gap-2">
            {swap.recipient ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/80 to-emerald-700/80 text-sm font-medium text-white shadow-lg shadow-emerald-500/20">
                  {swap.recipient.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {swap.recipient.name}
                  </p>
                  <p className="text-[10px] text-neutral-500">Recipient</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-neutral-600 bg-neutral-800/50">
                  <User className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm italic text-neutral-400">Open</p>
                  <p className="text-[10px] text-neutral-500">Anyone</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shift details */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <ShiftDetail label="Offering" shift={swap.offered_shift} />
          <ShiftDetail
            label="Requesting"
            shift={swap.desired_shift || undefined}
            isOpen={!swap.desired_shift_id}
          />
        </div>

        {/* Reason/Notes */}
        {swap.reason && (
          <div className="mb-4 rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-neutral-400">
              <MessageSquare className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">
                Reason
              </span>
            </div>
            <p className="text-sm text-neutral-300">{swap.reason}</p>
          </div>
        )}

        {/* Rejection reason if rejected */}
        {swap.status === 'rejected' && swap.rejection_reason && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-red-400">
              <X className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">
                Rejection Reason
              </span>
            </div>
            <p className="text-sm text-red-300">{swap.rejection_reason}</p>
          </div>
        )}

        {/* Actions */}
        {(canAcceptReject || canApproveReject || canClaim || canCancel) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
            {/* Peer actions: Accept/Reject */}
            {canAcceptReject && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    handleAction('accept', () => onPeerAction!(swap.id, 'accept'))
                  }
                  disabled={!!loadingAction}
                  className="gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {loadingAction === 'accept' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleAction('reject', () => onPeerAction!(swap.id, 'reject'))
                  }
                  disabled={!!loadingAction}
                  className="gap-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  {loadingAction === 'reject' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  Reject
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
                  className="gap-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
                >
                  {loadingAction === 'approve' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleAction('reject', () => onManagerAction!(swap.id, 'reject'))
                  }
                  disabled={!!loadingAction}
                  className="gap-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  {loadingAction === 'reject' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  Reject
                </Button>
              </>
            )}

            {/* Claim open request */}
            {canClaim && (
              <Button
                size="sm"
                onClick={() => handleAction('claim', () => onClaim!(swap.id))}
                disabled={!!loadingAction}
                className="gap-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500"
              >
                {loadingAction === 'claim' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Hand className="h-3.5 w-3.5" />
                )}
                Claim Swap
              </Button>
            )}

            {/* Cancel */}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('cancel', () => onCancel!(swap.id))}
                disabled={!!loadingAction}
                className="ml-auto gap-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                {loadingAction === 'cancel' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Cancel
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
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="h-6 w-28 rounded-full bg-white/10" />
        <div className="h-4 w-16 rounded bg-white/10" />
      </div>

      {/* Users */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="space-y-1">
            <div className="h-4 w-20 rounded bg-white/10" />
            <div className="h-3 w-14 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-4 w-4 rounded bg-white/10" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="space-y-1">
            <div className="h-4 w-20 rounded bg-white/10" />
            <div className="h-3 w-14 rounded bg-white/10" />
          </div>
        </div>
      </div>

      {/* Shifts */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-3 w-20 rounded bg-white/10" />
        </div>
        <div className="flex-1 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-3 w-20 rounded bg-white/10" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-white/5 pt-4">
        <div className="h-8 w-20 rounded-lg bg-white/10" />
        <div className="h-8 w-20 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

export default SwapCard;

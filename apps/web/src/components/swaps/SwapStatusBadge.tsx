import { motion } from 'framer-motion';
import {
  Clock,
  UserCheck,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Timer,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SwapStatus } from '@/types/swaps';

interface SwapStatusBadgeProps {
  status: SwapStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

// Status configuration with icons and styling (labels resolved via i18n)
const statusConfig: Record<SwapStatus, {
  icon: typeof Clock;
  labelKey: string;
  bg: string;
  text: string;
  border: string;
  glow: string;
  pulse?: boolean;
}> = {
  pending_peer: {
    icon: Clock,
    labelKey: 'swaps.statuses.pendingPeer',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    glow: '',
    pulse: true,
  },
  pending_manager: {
    icon: UserCheck,
    labelKey: 'swaps.statuses.pendingManager',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    glow: '',
    pulse: true,
  },
  approved: {
    icon: CheckCircle,
    labelKey: 'swaps.statuses.approved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    glow: '',
  },
  rejected: {
    icon: XCircle,
    labelKey: 'swaps.statuses.rejected',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    glow: '',
  },
  cancelled: {
    icon: Ban,
    labelKey: 'swaps.statuses.cancelled',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    border: 'border-slate-200',
    glow: '',
  },
  completed: {
    icon: CheckCircle2,
    labelKey: 'swaps.statuses.completed',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    glow: '',
  },
  expired: {
    icon: Timer,
    labelKey: 'swaps.statuses.expired',
    bg: 'bg-slate-50',
    text: 'text-slate-400',
    border: 'border-slate-200',
    glow: '',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-1.5 py-0.5 gap-1',
    icon: 'h-3 w-3',
    text: 'text-[10px]',
  },
  md: {
    badge: 'px-2 py-1 gap-1.5',
    icon: 'h-3.5 w-3.5',
    text: 'text-xs',
  },
  lg: {
    badge: 'px-3 py-1.5 gap-2',
    icon: 'h-4 w-4',
    text: 'text-sm',
  },
};

export function SwapStatusBadge({
  status,
  size = 'md',
  showLabel = true,
  animate = true,
  className,
}: SwapStatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const StatusIcon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bg,
        config.text,
        config.border,
        sizes.badge,
        sizes.text,
        config.pulse && 'animate-pulse-subtle',
        className
      )}
    >
      <StatusIcon className={cn(sizes.icon, config.text)} />
      {showLabel && <span>{t(config.labelKey)}</span>}
    </div>
  );

  if (!animate) return badge;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {badge}
    </motion.div>
  );
}

// Icon-only variant for compact spaces
export function SwapStatusIcon({
  status,
  size = 'md',
  className,
}: {
  status: SwapStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        config.bg,
        config.border,
        'border',
        size === 'sm' && 'h-5 w-5',
        size === 'md' && 'h-6 w-6',
        size === 'lg' && 'h-8 w-8',
        className
      )}
    >
      <StatusIcon className={cn(sizes.icon, config.text)} />
    </div>
  );
}

// Tooltip-friendly badge with description
export function SwapStatusBadgeWithTooltip({
  status,
  size = 'md',
  className,
}: {
  status: SwapStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <SwapStatusBadge
      status={status}
      size={size}
      className={cn('cursor-help', className)}
      aria-label={t(config.labelKey)}
    />
  );
}

export default SwapStatusBadge;

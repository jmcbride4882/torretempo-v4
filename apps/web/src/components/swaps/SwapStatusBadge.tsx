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
import { cn } from '@/lib/utils';
import type { SwapStatus } from '@/types/swaps';

interface SwapStatusBadgeProps {
  status: SwapStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

// Status configuration with icons and styling
const statusConfig: Record<SwapStatus, {
  icon: typeof Clock;
  label: string;
  bg: string;
  text: string;
  border: string;
  glow: string;
  pulse?: boolean;
}> = {
  pending_peer: {
    icon: Clock,
    label: 'Pending Peer',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    pulse: true,
  },
  pending_manager: {
    icon: UserCheck,
    label: 'Pending Manager',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    pulse: true,
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
  },
  cancelled: {
    icon: Ban,
    label: 'Cancelled',
    bg: 'bg-neutral-500/15',
    text: 'text-neutral-400',
    border: 'border-neutral-500/30',
    glow: 'shadow-neutral-500/20',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    glow: 'shadow-violet-500/20',
  },
  expired: {
    icon: Timer,
    label: 'Expired',
    bg: 'bg-neutral-600/15',
    text: 'text-neutral-500',
    border: 'border-neutral-600/30',
    glow: 'shadow-neutral-600/20',
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
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const StatusIcon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center rounded-full border backdrop-blur-sm font-medium',
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
      {showLabel && <span>{config.label}</span>}
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
  const config = statusConfig[status];
  
  return (
    <SwapStatusBadge
      status={status}
      size={size}
      className={cn('cursor-help', className)}
      aria-label={config.label}
    />
  );
}

export default SwapStatusBadge;

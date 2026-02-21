import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   Kresna StatCard — Executive KPI display
   Architecture doc: Javier (owner) needs large numbers, trend arrows,
   traffic-light compliance, click-to-drill-down.
   - Metric: 3rem-3.5rem bold mono digits
   - Trend: arrow badge with % and label
   - Icon: 48px container with tinted background
   - Click: optional onClick for drill-down
   ────────────────────────────────────────────────────────────── */

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  compact?: boolean;
}

function TrendBadge({ value, label, inverted }: { value: number; label: string; inverted?: boolean }) {
  const isPositive = value >= 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        inverted
          ? 'bg-white/20 text-white'
          : isPositive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-700'
      )}
    >
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{value}%
      <span className={cn('font-normal', inverted ? 'text-white/70' : 'text-kresna-gray')}>
        {label}
      </span>
    </span>
  );
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, description, icon: Icon, trend, variant = 'default', compact = false, onClick, ...props }, ref) => {
    const isColored = variant !== 'default';

    const variantStyles: Record<string, string> = {
      default: 'bg-white border-kresna-border shadow-card',
      primary: 'bg-gradient-to-br from-primary-500 to-primary-700 border-transparent text-white shadow-glow',
      success: 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-transparent text-white shadow-glow-green',
      warning: 'bg-gradient-to-br from-amber-400 to-amber-600 border-transparent text-white',
      danger: 'bg-gradient-to-br from-red-500 to-red-700 border-transparent text-white',
    };

    const iconBg: Record<string, string> = {
      default: 'bg-primary-50 text-primary-600',
      primary: 'bg-white/20 text-white',
      success: 'bg-white/20 text-white',
      warning: 'bg-white/20 text-white',
      danger: 'bg-white/20 text-white',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl border transition-all duration-300 ease-kresna',
          compact ? 'p-5' : 'p-6 sm:p-8',
          variantStyles[variant],
          onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-kresna active:scale-[0.98]',
          className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        {...props}
      >
        {/* Header: title + icon */}
        <div className="flex items-start justify-between mb-4">
          <span className={cn(
            'text-body-sm font-medium leading-tight',
            isColored ? 'text-white/80' : 'text-kresna-gray'
          )}>
            {title}
          </span>
          {Icon && (
            <div className={cn(
              'h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0',
              iconBg[variant]
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Metric value — large, mono, tight tracking */}
        <div className={cn(
          compact ? 'text-metric' : 'text-metric sm:text-metric-lg',
          'tabular-nums tracking-tighter leading-none mb-2',
          isColored ? 'text-white' : 'text-charcoal'
        )}>
          {value}
        </div>

        {/* Trend badge + description */}
        <div className="flex items-center gap-3 mt-3">
          {trend && <TrendBadge value={trend.value} label={trend.label} inverted={isColored} />}
          {description && (
            <span className={cn(
              'text-caption',
              isColored ? 'text-white/60' : 'text-kresna-gray'
            )}>
              {description}
            </span>
          )}
        </div>
      </div>
    );
  }
);
StatCard.displayName = 'StatCard';

export { StatCard };

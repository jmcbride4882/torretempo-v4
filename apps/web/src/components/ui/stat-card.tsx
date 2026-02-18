import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'primary' | 'accent';
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, description, icon: Icon, trend, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200',
          variant === 'default' && 'bg-white border-slate-200 shadow-card dark:bg-slate-800 dark:border-slate-700',
          variant === 'primary' && 'bg-gradient-to-br from-violet-500 to-indigo-600 border-transparent text-white shadow-glow',
          variant === 'accent' && 'bg-gradient-to-br from-cyan-500 to-blue-600 border-transparent text-white',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-sm font-medium',
            variant === 'default' ? 'text-slate-500 dark:text-slate-400' : 'text-white/80'
          )}>
            {title}
          </span>
          {Icon && (
            <div className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center',
              variant === 'default' ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' : 'bg-white/20'
            )}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex items-end gap-2">
          <span className={cn(
            'text-2xl font-bold tracking-tight',
            variant === 'default' ? 'text-slate-900 dark:text-white' : ''
          )}>
            {value}
          </span>
          {trend && (
            <span className={cn(
              'text-xs font-medium mb-1',
              variant !== 'default'
                ? 'text-white/80'
                : trend.value >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          )}
        </div>
        {description && (
          <p className={cn(
            'text-xs',
            variant === 'default' ? 'text-slate-500 dark:text-slate-400' : 'text-white/70'
          )}>
            {description}
          </p>
        )}
      </div>
    );
  }
);
StatCard.displayName = 'StatCard';

export { StatCard };

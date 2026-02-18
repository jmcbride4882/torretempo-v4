import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const barVariants: Record<string, string> = {
  default: 'bg-slate-600 dark:bg-slate-400',
  primary: 'bg-gradient-to-r from-violet-500 to-indigo-600',
  accent: 'bg-gradient-to-r from-cyan-500 to-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  destructive: 'bg-red-500',
};

const sizeVariants: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'primary', size = 'md', showLabel, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{value} / {max}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={cn(
          'w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden',
          sizeVariants[size]
        )}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              barVariants[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };

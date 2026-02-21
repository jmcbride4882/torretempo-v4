import * as React from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   Kresna EmptyState — Redesigned
   - Larger illustration area (py-24)
   - 80px animated icon container
   - Prominent CTA button
   - Optional secondary action
   - Entrance animation
   ────────────────────────────────────────────────────────────── */

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  compact?: boolean;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, secondaryAction, compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in',
        compact ? 'py-12' : 'py-20 sm:py-24',
        className
      )}
      {...props}
    >
      {Icon && (
        <div className={cn(
          'rounded-3xl bg-primary-50 flex items-center justify-center mb-6 animate-float',
          compact ? 'h-16 w-16' : 'h-20 w-20'
        )}>
          <Icon className={cn(
            'text-primary-500',
            compact ? 'h-8 w-8' : 'h-10 w-10'
          )} />
        </div>
      )}
      <h3 className={cn(
        'font-semibold text-charcoal mb-2',
        compact ? 'text-heading-4' : 'text-heading-3'
      )}>
        {title}
      </h3>
      {description && (
        <p className="text-body-sm text-kresna-gray-dark max-w-md mb-8 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };

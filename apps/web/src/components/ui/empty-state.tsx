import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
      {...props}
    >
      {Icon && (
        <div className="h-16 w-16 rounded-3xl bg-primary-50 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-charcoal mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-kresna-gray-dark max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };

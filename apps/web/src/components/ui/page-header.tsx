import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────
   Kresna PageHeader — Redesigned
   - Breadcrumbs navigation
   - Large heading-2 title with tight letter-spacing
   - Optional live badge / stats row
   - Action buttons area
   - Stagger animation on entrance
   ────────────────────────────────────────────────────────────── */

export interface Breadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  stats?: React.ReactNode;
  icon?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, badge, breadcrumbs, stats, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mb-8 animate-fade-in', className)}
      {...props}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-caption text-kresna-gray mb-3">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-kresna-gray-medium mx-0.5" />}
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="hover:text-charcoal transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? 'text-charcoal font-medium' : ''}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0 text-primary-600">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-heading-2 text-charcoal truncate">
                  {title}
                </h1>
                {badge}
              </div>
              {description && (
                <p className="text-body-sm text-kresna-gray-dark mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Optional stats row below title */}
      {stats && (
        <div className="mt-6 flex flex-wrap items-center gap-6">
          {stats}
        </div>
      )}
    </div>
  )
);
PageHeader.displayName = 'PageHeader';

export { PageHeader };

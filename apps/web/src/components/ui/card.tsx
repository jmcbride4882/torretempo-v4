import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────
   Kresna Card System
   - Default: solid white, kresna multi-layer shadow, 24px radius
   - Glass: frosted glass effect (glassmorphism)
   - Interactive: hover lift + shadow + border glow
   - Elevated: stronger shadow for popovers/modals
   ────────────────────────────────────────────────────────────── */

const cardVariants = cva(
  'rounded-3xl border text-charcoal transition-all duration-300 ease-kresna',
  {
    variants: {
      variant: {
        default: 'bg-white border-kresna-border shadow-card',
        glass: 'backdrop-blur-glass bg-white/80 border-white/20 shadow-card',
        elevated: 'bg-white border-kresna-border shadow-kresna',
        interactive:
          'bg-white border-kresna-border shadow-card hover:shadow-kresna hover:-translate-y-1 hover:border-kresna-gray-medium cursor-pointer',
        ghost: 'bg-transparent border-transparent shadow-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-2 p-6 sm:p-8', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-heading-4 text-charcoal',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-body-sm text-kresna-gray-dark', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 sm:p-8 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-3 p-6 sm:p-8 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };

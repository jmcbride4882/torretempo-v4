import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-300 ease-kresna focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-primary-500 text-white rounded-3xl hover:bg-primary-600 shadow-kresna-btn hover:shadow-glow',
        destructive:
          'bg-red-600 text-white rounded-3xl hover:bg-red-700 shadow-sm hover:shadow-md',
        outline:
          'border-2 border-kresna-border bg-white rounded-3xl hover:bg-kresna-light hover:border-kresna-gray-medium text-charcoal',
        secondary:
          'bg-kresna-light text-charcoal rounded-3xl hover:bg-kresna-border',
        ghost:
          'hover:bg-kresna-light text-kresna-gray-dark rounded-2xl',
        link:
          'text-primary-500 underline-offset-4 hover:underline rounded-none',
        gradient:
          'bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-3xl hover:from-primary-600 hover:to-primary-700 shadow-kresna-btn hover:shadow-glow',
        success:
          'bg-emerald-500 text-white rounded-3xl hover:bg-emerald-600 shadow-sm hover:shadow-glow-green',
      },
      size: {
        default: 'h-11 px-6 py-2.5 text-sm',
        sm: 'h-9 px-4 text-xs rounded-2xl',
        lg: 'h-13 px-8 text-base rounded-3xl',
        xl: 'h-14 px-10 text-base font-semibold rounded-3xl',
        touch: 'min-h-touch px-6 text-sm rounded-3xl',
        'touch-lg': 'min-h-touch-lg px-8 text-base font-semibold rounded-3xl',
        'touch-xl': 'min-h-touch-xl px-10 text-xl font-bold rounded-3xl',
        icon: 'h-10 w-10 rounded-2xl',
        'icon-sm': 'h-8 w-8 rounded-xl',
        'icon-lg': 'h-12 w-12 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

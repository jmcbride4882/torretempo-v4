import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-kresna-border via-kresna-light to-kresna-border dark:from-kresna-gray-dark dark:via-kresna-gray-dark dark:to-kresna-gray-dark bg-[length:200%_100%] animate-shimmer rounded-lg',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

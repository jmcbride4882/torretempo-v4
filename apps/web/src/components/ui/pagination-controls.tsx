/**
 * PaginationControls - Reusable pagination UI component
 * Glass morphism styled pagination with icons and responsive design
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PaginationControlsProps {
  /** Current page number (1-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  total: number;
  /** Number of items per page */
  limit: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Optional class name for container */
  className?: string;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}: PaginationControlsProps) {
  // Don't render if there's only one page or less
  if (totalPages <= 1) return null;

  // Calculate showing range
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 sm:flex-row sm:justify-between',
        className
      )}
    >
      {/* Showing text */}
      <p className="text-sm text-neutral-400 order-2 sm:order-1">
        Showing{' '}
        <span className="font-medium text-neutral-200">{startItem}</span>
        {' - '}
        <span className="font-medium text-neutral-200">{endItem}</span>
        {' of '}
        <span className="font-medium text-neutral-200">{total}</span>
        {' results'}
      </p>

      {/* Navigation controls */}
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {/* Previous button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={isFirstPage}
          className={cn(
            'gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm',
            'text-neutral-400 hover:text-white hover:bg-zinc-800/50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900/50'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page indicator with emerald accent */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <span className="text-sm text-neutral-400">Page</span>
          <span className="min-w-[2ch] text-center text-sm font-semibold text-emerald-400">
            {page}
          </span>
          <span className="text-sm text-neutral-400">of</span>
          <span className="min-w-[2ch] text-center text-sm font-medium text-neutral-200">
            {totalPages}
          </span>
        </div>

        {/* Next button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={isLastPage}
          className={cn(
            'gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm',
            'text-neutral-400 hover:text-white hover:bg-zinc-800/50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900/50'
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

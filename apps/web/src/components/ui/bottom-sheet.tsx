/**
 * Bottom Sheet Component
 * Mobile-first bottom sheet with drag gestures and spring animations
 * Follows iOS/Android native sheet patterns
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[]; // Heights in pixels [min, mid, max]
  initialSnap?: number; // Index of initial snap point (default: last)
  dismissable?: boolean; // Can dismiss by swiping down (default: true)
  showHandle?: boolean; // Show drag handle (default: true)
  className?: string;
}

const DRAG_THRESHOLD = 50; // Pixels to drag before dismissing
const SPRING_CONFIG = { type: 'spring', damping: 30, stiffness: 300 } as const;

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  snapPoints = [600], // Default to 600px height
  initialSnap = snapPoints.length - 1,
  dismissable = true,
  showHandle = true,
  className,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = React.useState(initialSnap);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 200], [1, 0]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Handle drag end
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const dragDistance = info.offset.y;
    const dragVelocity = info.velocity.y;

    // Dismiss if dragged down significantly
    if (dismissable && (dragDistance > DRAG_THRESHOLD || dragVelocity > 500)) {
      onClose();
      return;
    }

    // Snap to nearest point
    if (snapPoints.length > 1) {
      const currentHeight = snapPoints[currentSnap] ?? snapPoints[0] ?? 600;
      const dragOffset = -dragDistance;
      const targetHeight = currentHeight + dragOffset;

      // Find closest snap point
      let closestSnapIndex = 0;
      let minDiff = Math.abs((snapPoints[0] ?? 0) - targetHeight);

      snapPoints.forEach((snap, index) => {
        const diff = Math.abs(snap - targetHeight);
        if (diff < minDiff) {
          minDiff = diff;
          closestSnapIndex = index;
        }
      });

      setCurrentSnap(closestSnapIndex);
    }

    // Reset position
    y.set(0);
  };

  const sheetHeight = snapPoints[currentSnap] ?? snapPoints[0] ?? 600;

  const content = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={dismissable ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            aria-describedby={description ? 'bottom-sheet-description' : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING_CONFIG}
            drag={dismissable ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{ 
              y,
              opacity,
              height: sheetHeight,
              maxHeight: '90vh',
            }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'glass-dark rounded-t-3xl',
              'flex flex-col',
              'touch-pan-y',
              className
            )}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 rounded-full bg-neutral-600" />
              </div>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between px-6 pb-4">
                <div className="flex-1">
                  {title && (
                    <h2
                      id="bottom-sheet-title"
                      className="text-lg font-semibold text-white"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="bottom-sheet-description"
                      className="mt-1 text-sm text-neutral-400"
                    >
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-4 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
              {children}
            </div>

            {/* Safe Area (iOS bottom inset) */}
            <div className="pb-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

// Export a hook for managing bottom sheet state
export function useBottomSheet(initialOpen = false) {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}

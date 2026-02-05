/**
 * OfflineIndicator Component
 * Shows connection status and pending offline actions
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOnline, queueStats, isProcessing } = useOfflineQueue();
  const [showDetails, setShowDetails] = React.useState(false);

  // Show indicator if offline OR if there are pending actions
  const shouldShow = !isOnline || (queueStats && queueStats.pending > 0);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            'fixed top-4 right-4 z-50',
            className
          )}
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl',
              'backdrop-blur-xl shadow-lg transition-all duration-200',
              'border',
              !isOnline
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : isProcessing
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            )}
          >
            {!isOnline ? (
              <WifiOff className="h-4 w-4" />
            ) : isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-xs font-medium">
                {!isOnline
                  ? 'Offline'
                  : isProcessing
                  ? 'Syncing...'
                  : 'Online'}
              </span>
              
              {queueStats && queueStats.pending > 0 && (
                <span className="text-[10px] opacity-75">
                  {queueStats.pending} pending
                </span>
              )}
            </div>
          </button>

          {/* Details dropdown */}
          <AnimatePresence>
            {showDetails && queueStats && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className={cn(
                  'absolute top-full right-0 mt-2 min-w-[200px]',
                  'bg-zinc-900/95 backdrop-blur-xl rounded-xl',
                  'border border-zinc-800 shadow-xl p-3'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Status</span>
                    <span className={cn(
                      'font-medium',
                      isOnline ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="h-px bg-zinc-800" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Pending</span>
                    <span className="text-white font-medium">
                      {queueStats.pending}
                    </span>
                  </div>

                  {queueStats.processing > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Processing</span>
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {queueStats.processing}
                      </span>
                    </div>
                  )}

                  {queueStats.failed > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Failed</span>
                      <span className="text-red-400 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {queueStats.failed}
                      </span>
                    </div>
                  )}

                  {isOnline && queueStats.pending === 0 && queueStats.failed === 0 && (
                    <div className="flex items-center justify-center text-xs text-emerald-400 py-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      All synced
                    </div>
                  )}

                  {!isOnline && queueStats.pending > 0 && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] text-amber-400 text-center">
                        Actions will sync when online
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

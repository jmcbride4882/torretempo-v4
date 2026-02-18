/**
 * OfflineIndicator Component
 * Shows connection status and pending offline actions
 */

import * as React from 'react';
import { WifiOff, Wifi, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useTranslation } from 'react-i18next';

export interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOnline, queueStats, isProcessing } = useOfflineQueue();
  const [showDetails, setShowDetails] = React.useState(false);
  const { t } = useTranslation();

  const shouldShow = !isOnline || (queueStats && queueStats.pending > 0);

  if (!shouldShow) return null;

  return (
    <div className={cn('fixed top-4 right-4 z-50', className)}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl',
          'shadow-md transition-all duration-200',
          'border',
          !isOnline
            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
            : isProcessing
            ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
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
              ? t('offline.offline')
              : isProcessing
              ? t('offline.syncing')
              : t('offline.online')}
          </span>

          {queueStats && queueStats.pending > 0 && (
            <span className="text-[10px] opacity-75">
              {t('offline.pending', { count: queueStats.pending })}
            </span>
          )}
        </div>
      </button>

      {showDetails && queueStats && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 min-w-[200px]',
            'bg-white rounded-xl',
            'border border-slate-200 shadow-lg p-3',
            'dark:bg-slate-800 dark:border-slate-700'
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t('offline.status')}</span>
              <span className={cn(
                'font-medium',
                isOnline ? 'text-emerald-600' : 'text-red-600'
              )}>
                {isOnline ? t('offline.online') : t('offline.offline')}
              </span>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t('common.pending')}</span>
              <span className="text-slate-900 font-medium dark:text-slate-100">
                {queueStats.pending}
              </span>
            </div>

            {queueStats.processing > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t('offline.processing')}</span>
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {queueStats.processing}
                </span>
              </div>
            )}

            {queueStats.failed > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t('offline.failed', { count: queueStats.failed })}</span>
                <span className="text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {queueStats.failed}
                </span>
              </div>
            )}

            {isOnline && queueStats.pending === 0 && queueStats.failed === 0 && (
              <div className="flex items-center justify-center text-xs text-emerald-600 py-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('offline.allSynced')}
              </div>
            )}

            {!isOnline && queueStats.pending > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800">
                <p className="text-[10px] text-amber-700 text-center dark:text-amber-400">
                  {t('offline.willSync')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

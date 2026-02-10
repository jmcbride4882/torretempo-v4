import { useTranslation } from 'react-i18next';
import { Palmtree, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaveBalanceCardProps {
  vacationTotal: number;
  vacationUsed: number;
  sickDaysUsed: number;
  className?: string;
}

export function LeaveBalanceCard({ vacationTotal, vacationUsed, sickDaysUsed, className }: LeaveBalanceCardProps) {
  const { t } = useTranslation();
  const vacationRemaining = vacationTotal - vacationUsed;
  const vacationPercent = vacationTotal > 0 ? (vacationUsed / vacationTotal) * 100 : 0;

  return (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white p-5 space-y-4', className)}>
      <h3 className="text-sm font-medium text-zinc-700">{t('leave.balance')}</h3>

      {/* Vacation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palmtree className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-zinc-700">{t('leave.vacation')}</span>
          </div>
          <span className="text-sm font-medium text-zinc-900">
            {vacationRemaining} {t('leave.daysRemaining')}
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              vacationPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{ width: `${Math.min(vacationPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500">
          {vacationUsed} {t('leave.used')} / {vacationTotal} {t('leave.total')}
        </p>
      </div>

      {/* Sick days */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-zinc-700">{t('leave.sickDays')}</span>
        </div>
        <span className="text-sm font-medium text-zinc-900">
          {sickDaysUsed} {t('leave.daysUsed')}
        </span>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceScoreWidgetProps {
  score: number; // 0-100
  violations?: number;
  className?: string;
}

export function ComplianceScoreWidget({ score, violations = 0, className }: ComplianceScoreWidgetProps) {
  const { t } = useTranslation();

  const getColor = () => {
    if (score >= 90) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', ring: 'ring-emerald-500' };
    if (score >= 70) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', ring: 'ring-amber-500' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', ring: 'ring-red-500' };
  };

  const c = getColor();

  return (
    <div className={cn('rounded-2xl border p-5', c.bg, c.border, className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', c.bg)}>
          <ShieldCheck className={cn('h-5 w-5', c.text)} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-700">{t('dashboard.complianceScore')}</h3>
          <p className="text-xs text-zinc-500">{t('dashboard.spanishLaborLaw')}</p>
        </div>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className={cn('text-4xl font-bold', c.text)}>{score}</span>
        <span className="text-sm text-zinc-500 mb-1">/ 100</span>
      </div>

      {/* Progress ring visual */}
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', c.ring.replace('ring-', 'bg-'))}
          style={{ width: `${score}%` }}
        />
      </div>

      {violations > 0 && (
        <div className="flex items-center gap-2 mt-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-amber-700">
            {t('dashboard.activeViolations', { count: violations })}
          </span>
        </div>
      )}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceScoreWidgetProps {
  score: number; // 0-100
  violations?: number;
  className?: string;
}

function getScoreColors(score: number): {
  text: string;
  stroke: string;
  bgLight: string;
} {
  if (score >= 90) {
    return { text: 'text-emerald-600', stroke: '#059669', bgLight: 'bg-emerald-50' };
  }
  if (score >= 70) {
    return { text: 'text-amber-600', stroke: '#d97706', bgLight: 'bg-amber-50' };
  }
  return { text: 'text-red-600', stroke: '#dc2626', bgLight: 'bg-red-50' };
}

function ScoreRing({ score, strokeColor }: { score: number; strokeColor: string }): React.ReactElement {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg
      width="136"
      height="136"
      viewBox="0 0 136 136"
      className="transform -rotate-90"
    >
      <circle
        cx="68"
        cy="68"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        className="text-kresna-border"
      />
      <circle
        cx="68"
        cy="68"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export function ComplianceScoreWidget({ score, violations = 0, className }: ComplianceScoreWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = getScoreColors(score);

  return (
    <div className={cn('rounded-2xl border border-kresna-border bg-white p-5 shadow-card', className)}>
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors.bgLight)}>
          <ShieldCheck className={cn('h-5 w-5', colors.text)} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-kresna-gray-dark">{t('dashboard.complianceScore')}</h3>
          <p className="text-xs text-kresna-gray">{t('dashboard.spanishLaborLaw')}</p>
        </div>
      </div>

      <div className="flex flex-col items-center py-2">
        <div className="relative">
          <ScoreRing score={score} strokeColor={colors.stroke} />
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <span className={cn('text-5xl font-bold tracking-tight', colors.text)}>
              {score}
            </span>
            <span className="text-xs text-kresna-gray">/ 100</span>
          </div>
        </div>
      </div>

      {violations > 0 && (
        <div className="mt-3 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <span className="font-medium text-red-600">
              {t('dashboard.activeViolations', { count: violations })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

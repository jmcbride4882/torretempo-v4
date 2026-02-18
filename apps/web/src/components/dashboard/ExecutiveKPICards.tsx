import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIData {
  laborCostPercent: number;
  laborCostTrend: number; // positive = up, negative = down
  attendanceRate: number;
  attendanceTrend: number;
  overtimePercent: number;
  overtimeTrend: number;
  complianceScore: number;
  complianceTrend: number;
}

interface ExecutiveKPICardsProps {
  data: KPIData;
  className?: string;
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return <Minus className="h-3 w-3 text-slate-400" />;
  if (value > 0) return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  return <TrendingDown className="h-3 w-3 text-red-600" />;
}

function KPICard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  trendInverted = false, // true means lower is better (e.g., labor cost, overtime)
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  unit: string;
  trend: number;
  trendInverted?: boolean;
}) {
  const trendIsGood = trendInverted ? trend <= 0 : trend >= 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-900">{value}{unit}</span>
        <div className={cn(
          'flex items-center gap-1 text-xs mb-1 px-1.5 py-0.5 rounded-full',
          trendIsGood ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        )}>
          <TrendIndicator value={trendInverted ? -trend : trend} />
          <span>{Math.abs(trend)}{unit}</span>
        </div>
      </div>
    </div>
  );
}

export function ExecutiveKPICards({ data, className }: ExecutiveKPICardsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <KPICard
        icon={DollarSign}
        label={t('dashboard.laborCost')}
        value={data.laborCostPercent}
        unit="%"
        trend={data.laborCostTrend}
        trendInverted
      />
      <KPICard
        icon={Users}
        label={t('dashboard.attendanceRate')}
        value={data.attendanceRate}
        unit="%"
        trend={data.attendanceTrend}
      />
      <KPICard
        icon={Clock}
        label={t('dashboard.overtimeRate')}
        value={data.overtimePercent}
        unit="%"
        trend={data.overtimeTrend}
        trendInverted
      />
      <KPICard
        icon={ShieldCheck}
        label={t('dashboard.complianceScore')}
        value={data.complianceScore}
        unit=""
        trend={data.complianceTrend}
      />
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

function TrendIndicator({ value }: { value: number }): React.ReactElement {
  if (value === 0) return <Minus className="h-3 w-3 text-kresna-gray" />;
  if (value > 0) return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  return <TrendingDown className="h-3 w-3 text-red-600" />;
}

function KPICard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  trendInverted = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  unit: string;
  trend: number;
  trendInverted?: boolean;
}): React.ReactElement {
  const trendIsGood = trendInverted ? trend <= 0 : trend >= 0;

  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl border border-kresna-border bg-white p-5 shadow-card"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
        <span className="text-sm text-kresna-gray">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-charcoal">
          {value}
          {unit}
        </span>
        <div
          className={cn(
            'mb-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            trendIsGood
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-600'
          )}
        >
          <TrendIndicator value={trendInverted ? -trend : trend} />
          <span>
            {Math.abs(trend)}
            {unit}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function ExecutiveKPICards({ data, className }: ExecutiveKPICardsProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}
    >
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
    </motion.div>
  );
}

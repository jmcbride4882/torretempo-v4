/**
 * PayrollBreakdown Component
 * Displays compensation details in a styled table
 * Light theme styling with right-aligned numbers
 */

import { motion } from 'framer-motion';
import {
  Clock,
  DollarSign,
  TrendingUp,
  Receipt,
  Minus,
  Wallet,
  Calculator,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { PayrollReport } from '@/types/reports';

interface PayrollBreakdownProps {
  report: PayrollReport;
  className?: string;
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Format hours
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Table row component
function TableRow({
  label,
  hours,
  amount,
  rate,
  icon: Icon,
  variant = 'default',
  className,
}: {
  label: string;
  hours?: number;
  amount: number;
  rate?: number;
  icon?: typeof Clock;
  variant?: 'default' | 'highlight' | 'deduction' | 'total';
  className?: string;
}) {
  const { t } = useTranslation();
  const rowStyles = {
    default: 'text-slate-700',
    highlight: 'text-amber-700 bg-amber-50',
    deduction: 'text-red-700',
    total: 'text-slate-900 font-semibold text-lg border-t border-slate-200 pt-3 mt-1',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center justify-between py-2.5',
        rowStyles[variant],
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              variant === 'highlight' && 'bg-amber-500/20',
              variant === 'deduction' && 'bg-red-500/20',
              variant === 'total' && 'bg-primary-500/20',
              variant === 'default' && 'bg-slate-50'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                variant === 'highlight' && 'text-amber-400',
                variant === 'deduction' && 'text-red-400',
                variant === 'total' && 'text-primary-400',
                variant === 'default' && 'text-slate-500'
              )}
            />
          </div>
        )}
        <div>
          <p className="text-sm">{label}</p>
          {rate && (
            <p className="text-xs text-slate-500">
              @ {formatCurrency(rate)}/{t('reports.perHour')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-right">
        {hours !== undefined && (
          <span className="min-w-[60px] font-mono text-sm text-slate-500">
            {formatHours(hours)}
          </span>
        )}
        <span
          className={cn(
            'min-w-[100px] font-mono',
            variant === 'deduction' && 'text-red-400',
            variant === 'total' && 'text-emerald-400'
          )}
        >
          {variant === 'deduction' && amount > 0 ? '-' : ''}
          {formatCurrency(amount)}
        </span>
      </div>
    </motion.div>
  );
}

// Section header
function SectionHeader({ title, icon: Icon }: { title: string; icon: typeof Calculator }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
      <Icon className="h-4 w-4 text-slate-500" />
      <h4 className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</h4>
    </div>
  );
}

export function PayrollBreakdown({ report, className }: PayrollBreakdownProps) {
  const { t } = useTranslation();
  const { compensation, deductions, netPay, employee } = report;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6', className)}
    >
      {/* Employee info header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/20 to-violet-600/20">
            <span className="text-lg font-bold text-primary-400">
              {employee.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{employee.name}</h3>
            <p className="text-sm text-slate-500">{employee.email}</p>
            <p className="text-xs text-slate-500 capitalize">{employee.role}</p>
          </div>
        </div>
      </div>

      {/* Earnings section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader title={t('reports.earnings')} icon={DollarSign} />

        <div className="space-y-1">
          <TableRow
            label={t('reports.regularHours')}
            hours={compensation.baseHours}
            amount={compensation.basePay}
            rate={compensation.baseRate}
            icon={Clock}
          />

          {compensation.overtimeHours > 0 && (
            <TableRow
              label={t('reports.overtimeHours')}
              hours={compensation.overtimeHours}
              amount={compensation.overtimePay}
              rate={compensation.overtimeRate}
              icon={TrendingUp}
              variant="highlight"
            />
          )}

          <TableRow
            label={t('reports.grossPay')}
            amount={compensation.totalGrossPay}
            icon={Wallet}
            className="mt-2 border-t border-slate-100 pt-3"
          />
        </div>
      </div>

      {/* Deductions section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader title={t('reports.deductions')} icon={Minus} />

        <div className="space-y-1">
          <TableRow
            label={t('reports.socialSecurity')}
            amount={deductions.socialSecurity}
            icon={Receipt}
            variant="deduction"
          />

          <TableRow
            label={t('reports.incomeTax')}
            amount={deductions.incomeTax}
            icon={Receipt}
            variant="deduction"
          />

          {deductions.otherDeductions > 0 && (
            <TableRow
              label={t('reports.otherDeductions')}
              amount={deductions.otherDeductions}
              icon={Receipt}
              variant="deduction"
            />
          )}

          <TableRow
            label={t('reports.totalDeductions')}
            amount={deductions.totalDeductions}
            icon={Minus}
            variant="deduction"
            className="mt-2 border-t border-slate-100 pt-3 font-medium"
          />
        </div>
      </div>

      {/* Net Pay section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
              <Calculator className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{t('reports.netPay')}</p>
              <p className="text-xs text-slate-500">{t('reports.takeHomeAmount')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(netPay)}</p>
            <p className="text-xs text-slate-500">
              {t('reports.ofGross', { percent: ((netPay / compensation.totalGrossPay) * 100).toFixed(1) })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500">{t('reports.totalHoursSummary')}</p>
          <p className="text-lg font-bold text-slate-900">
            {formatHours(compensation.baseHours + compensation.overtimeHours)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500">{t('reports.overtimeSummary')}</p>
          <p className="text-lg font-bold text-amber-600">
            {formatHours(compensation.overtimeHours)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500">{t('reports.deductionRate')}</p>
          <p className="text-lg font-bold text-red-600">
            {((deductions.totalDeductions / compensation.totalGrossPay) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default PayrollBreakdown;

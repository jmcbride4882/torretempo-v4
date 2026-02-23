/**
 * Report Detail Page
 * View single report with tabs: Summary, Variance, Payroll, Compliance
 * Light theme styling
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  FileText,
  ArrowLeft,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  DollarSign,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VarianceChart } from '@/components/reports/VarianceChart';
import { PayrollBreakdown } from '@/components/reports/PayrollBreakdown';
import { ComplianceStatus } from '@/components/reports/ComplianceStatus';
import { cn } from '@/lib/utils';
import { fetchReport, downloadReportPDF } from '@/lib/api/reports';
import type { ReportResponse, MonthlyReport } from '@/types/reports';

type ReportTab = 'summary' | 'variance' | 'payroll' | 'compliance';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function ReportDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [isDownloading, setIsDownloading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!slug || !id) return;

    setIsLoading(true);
    try {
      const data = await fetchReport(slug, id);
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error(t('reports.toasts.reportLoadFailed'));
      navigate(`/t/${slug}/reports`);
    } finally {
      setIsLoading(false);
    }
  }, [slug, id, navigate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function handleBack(): void {
    navigate(`/t/${slug}/reports`);
  }

  async function handleDownload(): Promise<void> {
    if (!slug || !id) return;

    setIsDownloading(true);
    try {
      const { pdfUrl } = await downloadReportPDF(slug, id);
      window.open(pdfUrl, '_blank');
      toast.success(t('reports.toasts.pdfStarted'));
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(t('reports.toasts.pdfFailed'));
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!reportData) {
    return null;
  }

  const { report: rawReport, variance, payroll, compliance } = reportData;
  // Ensure numeric fields are actually numbers (API may return strings from DB)
  const report = {
    ...rawReport,
    totalHours: Number(rawReport.totalHours) || 0,
    totalDays: Number(rawReport.totalDays) || 0,
    overtimeHours: Number(rawReport.overtimeHours) || 0,
    month: Number(rawReport.month) || 1,
    year: Number(rawReport.year) || new Date().getFullYear(),
  };
  const monthName = t(`common.months.${MONTH_KEYS[report.month - 1]}`) || t('common.unknown');

  const tabItems: { id: ReportTab; labelKey: string; icon: typeof BarChart3 }[] = [
    { id: 'summary', labelKey: 'reports.summary', icon: FileText },
    { id: 'variance', labelKey: 'reports.variance', icon: BarChart3 },
    { id: 'payroll', labelKey: 'reports.payroll', icon: DollarSign },
    { id: 'compliance', labelKey: 'reports.compliance', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 rounded-lg border border-kresna-border bg-white text-kresna-gray-dark hover:bg-kresna-light"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Button>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-charcoal sm:text-2xl">
              {monthName} {report.year}
            </h1>
            <p className="text-sm text-kresna-gray">
              {report.userName || t('reports.monthlyReport')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report.status === 'ready' && (
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t('reports.downloadPdf')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-kresna-border bg-white p-1.5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            const isDisabled =
              (tab.id === 'variance' && !variance) ||
              (tab.id === 'payroll' && !payroll) ||
              (tab.id === 'compliance' && !compliance);

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                    : isDisabled
                    ? 'cursor-not-allowed text-kresna-gray'
                    : 'text-kresna-gray hover:bg-kresna-light hover:text-charcoal'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'summary' && <SummaryTab report={report} />}
        {activeTab === 'variance' && variance && (
          <VarianceChart data={variance.discrepancies} />
        )}
        {activeTab === 'payroll' && payroll && (
          <PayrollBreakdown report={payroll} />
        )}
        {activeTab === 'compliance' && compliance && (
          <ComplianceStatus
            violations={compliance.violations}
            complianceScore={compliance.summary.complianceScore}
          />
        )}
      </div>
    </div>
  );
}

function SummaryTab({ report }: { report: MonthlyReport }) {
  const { t } = useTranslation();
  const monthName = t(`common.months.${MONTH_KEYS[report.month - 1]}`) || t('common.unknown');
  const hasOvertime = report.overtimeHours > 0;
  const weeklyAvg = report.totalHours / 4;
  const weeklyBarWidth = Math.min((weeklyAvg / 40) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Hours */}
        <div className="rounded-xl border border-kresna-border bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-kresna-gray">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('reports.totalHours')}</span>
          </div>
          <p className="text-3xl font-bold text-charcoal">{formatHours(report.totalHours)}</p>
          <p className="mt-1 text-xs text-kresna-gray">
            {t('reports.averagePerDay', { hours: (report.totalHours / report.totalDays).toFixed(1) })}
          </p>
        </div>

        {/* Days Worked */}
        <div className="rounded-xl border border-kresna-border bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-kresna-gray">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('reports.daysWorked')}</span>
          </div>
          <p className="text-3xl font-bold text-charcoal">{report.totalDays}</p>
          <p className="mt-1 text-xs text-kresna-gray">
            {t('reports.inMonth', { month: monthName, year: report.year })}
          </p>
        </div>

        {/* Overtime */}
        <div
          className={cn(
            'rounded-xl border border-kresna-border bg-white p-4',
            hasOvertime && 'border-amber-200 bg-amber-50'
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-kresna-gray">
            <TrendingUp className={cn('h-4 w-4', hasOvertime && 'text-amber-600')} />
            <span className="text-xs font-medium uppercase tracking-wider">{t('reports.overtimeLabel')}</span>
          </div>
          <p className={cn('text-3xl font-bold', hasOvertime ? 'text-amber-600' : 'text-charcoal')}>
            {formatHours(report.overtimeHours)}
          </p>
          <p className="mt-1 text-xs text-kresna-gray">
            {hasOvertime
              ? t('reports.ofTotal', { percent: ((report.overtimeHours / report.totalHours) * 100).toFixed(0) })
              : t('reports.noOvertimeRecorded')}
          </p>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-kresna-border bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-kresna-gray">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('reports.statusLabel')}</span>
          </div>
          <p className="text-lg font-semibold capitalize text-emerald-600">{report.status}</p>
          {report.generatedAt && (
            <p className="mt-1 text-xs text-kresna-gray">
              {t('reports.generated', { date: new Date(report.generatedAt).toLocaleDateString('es-ES') })}
            </p>
          )}
        </div>
      </div>

      {/* Period info */}
      <div className="rounded-xl border border-kresna-border bg-white p-4">
        <h4 className="mb-3 text-sm font-medium text-kresna-gray-dark">{t('reports.reportPeriod')}</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-kresna-border bg-kresna-light p-3">
            <Calendar className="h-5 w-5 text-kresna-gray" />
            <div>
              <p className="text-sm font-medium text-charcoal">{monthName} 1, {report.year}</p>
              <p className="text-xs text-kresna-gray">{t('reports.startPeriod')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-kresna-border bg-kresna-light p-3">
            <Calendar className="h-5 w-5 text-kresna-gray" />
            <div>
              <p className="text-sm font-medium text-charcoal">
                {monthName} {new Date(report.year, report.month, 0).getDate()}, {report.year}
              </p>
              <p className="text-xs text-kresna-gray">{t('reports.endPeriod')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly breakdown */}
      <div className="rounded-xl border border-kresna-border bg-white p-4">
        <h4 className="mb-3 text-sm font-medium text-kresna-gray-dark">{t('reports.weeklyAverage')}</h4>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold text-charcoal">
            {weeklyAvg.toFixed(1)}h
          </p>
          <p className="mb-1 text-sm text-kresna-gray">{t('reports.perWeek')}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-kresna-light">
          <div
            style={{ width: `${weeklyBarWidth}%` }}
            className={cn(
              'h-full rounded-full transition-all duration-700',
              weeklyAvg > 40 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
          />
        </div>
        <p className="mt-2 text-xs text-kresna-gray">
          {weeklyAvg > 40
            ? t('reports.exceeds40h')
            : t('reports.within40h')}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-kresna-light" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-kresna-light" />
        <div className="space-y-1.5">
          <div className="h-6 w-32 animate-pulse rounded bg-kresna-light" />
          <div className="h-4 w-24 animate-pulse rounded bg-kresna-light" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 rounded-xl border border-kresna-border bg-white p-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 flex-1 animate-pulse rounded-lg bg-kresna-light" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-kresna-border bg-kresna-light" />
        ))}
      </div>
    </div>
  );
}

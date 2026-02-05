/**
 * Report Detail Page
 * View single report with tabs: Summary, Variance, Payroll, Compliance
 * Glassmorphism styling with Framer Motion animations
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText,
  ArrowLeft,
  Download,
  Mail,
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
import { fetchReport, downloadReportPDF, emailReport } from '@/lib/api/reports';
import type { ReportResponse, MonthlyReport } from '@/types/reports';

// Tab types
type ReportTab = 'summary' | 'variance' | 'payroll' | 'compliance';

// Tab configuration
const tabs: { id: ReportTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'variance', label: 'Variance', icon: BarChart3 },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
];

// Month names
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Format hours
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function ReportDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();

  // State
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  // Fetch report data
  const loadReport = useCallback(async () => {
    if (!slug || !id) return;

    setIsLoading(true);
    try {
      const data = await fetchReport(slug, id);
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
      navigate(`/t/${slug}/reports`);
    } finally {
      setIsLoading(false);
    }
  }, [slug, id, navigate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Handlers
  const handleBack = () => {
    navigate(`/t/${slug}/reports`);
  };

  const handleDownload = async () => {
    if (!slug || !id) return;

    setIsDownloading(true);
    try {
      const { pdfUrl } = await downloadReportPDF(slug, id);
      window.open(pdfUrl, '_blank');
      toast.success('PDF download started');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmail = async () => {
    if (!slug || !id || !reportData?.report.userEmail) return;

    setIsEmailing(true);
    try {
      await emailReport(slug, id, reportData.report.userEmail);
      toast.success('Report sent via email');
    } catch (error) {
      console.error('Error emailing report:', error);
      toast.error('Failed to send email');
    } finally {
      setIsEmailing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // No data state
  if (!reportData) {
    return null;
  }

  const { report, variance, payroll, compliance } = reportData;
  const monthName = MONTHS[report.month - 1] || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </motion.div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/20 to-violet-600/20 shadow-lg shadow-primary-500/10">
            <FileText className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              {monthName} {report.year}
            </h1>
            <p className="text-sm text-neutral-400">
              {report.userName || 'Monthly Report'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {report.status === 'ready' && (
            <>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEmail}
                  disabled={isEmailing}
                  className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
                >
                  {isEmailing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Email</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="gap-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Download PDF</span>
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-1.5"
      >
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            // Disable tabs without data
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
                    ? 'bg-primary-600/20 text-primary-300'
                    : isDisabled
                    ? 'cursor-not-allowed text-neutral-600'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="report-tab-indicator"
                    className="absolute inset-0 rounded-lg bg-primary-500/10 ring-1 ring-primary-500/30"
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Summary tab component
function SummaryTab({ report }: { report: MonthlyReport }) {
  const monthName = MONTHS[report.month - 1] || 'Unknown';
  const hasOvertime = report.overtimeHours > 0;

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Hours</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatHours(report.totalHours)}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {(report.totalHours / report.totalDays).toFixed(1)}h average per day
          </p>
        </motion.div>

        {/* Days Worked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Days Worked</span>
          </div>
          <p className="text-3xl font-bold text-white">{report.totalDays}</p>
          <p className="mt-1 text-xs text-neutral-500">
            in {monthName} {report.year}
          </p>
        </motion.div>

        {/* Overtime */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'glass-card p-4',
            hasOvertime && 'border-amber-500/20 bg-amber-500/5'
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <TrendingUp className={cn('h-4 w-4', hasOvertime && 'text-amber-500')} />
            <span className="text-xs font-medium uppercase tracking-wider">Overtime</span>
          </div>
          <p className={cn('text-3xl font-bold', hasOvertime ? 'text-amber-400' : 'text-white')}>
            {formatHours(report.overtimeHours)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {hasOvertime
              ? `${((report.overtimeHours / report.totalHours) * 100).toFixed(0)}% of total`
              : 'No overtime recorded'}
          </p>
        </motion.div>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Status</span>
          </div>
          <p className="text-lg font-semibold capitalize text-emerald-400">{report.status}</p>
          {report.generatedAt && (
            <p className="mt-1 text-xs text-neutral-500">
              Generated {new Date(report.generatedAt).toLocaleDateString('es-ES')}
            </p>
          )}
        </motion.div>
      </div>

      {/* Period info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4"
      >
        <h4 className="mb-3 text-sm font-medium text-neutral-300">Report Period</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
            <Calendar className="h-5 w-5 text-neutral-500" />
            <div>
              <p className="text-sm font-medium text-white">{monthName} 1, {report.year}</p>
              <p className="text-xs text-neutral-500">Start of period</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
            <Calendar className="h-5 w-5 text-neutral-500" />
            <div>
              <p className="text-sm font-medium text-white">
                {monthName} {new Date(report.year, report.month, 0).getDate()}, {report.year}
              </p>
              <p className="text-xs text-neutral-500">End of period</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weekly breakdown placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-4"
      >
        <h4 className="mb-3 text-sm font-medium text-neutral-300">Weekly Average</h4>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold text-white">
            {(report.totalHours / 4).toFixed(1)}h
          </p>
          <p className="mb-1 text-sm text-neutral-500">per week (avg)</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((report.totalHours / 4 / 40) * 100, 100)}%` }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              report.totalHours / 4 > 40 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {report.totalHours / 4 > 40
            ? 'Exceeds 40h weekly standard'
            : 'Within 40h weekly standard'}
        </p>
      </motion.div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 flex-1 animate-pulse rounded-lg bg-white/10" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        ))}
      </div>
    </div>
  );
}

/**
 * Generate Report Page
 * Form to generate new monthly reports
 * Glassmorphism styling with preview and validation
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText,
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateReport, fetchTeamMembers } from '@/lib/api/reports';
import { useAuth } from '@/hooks/useAuth';
import { useIsManager } from '@/hooks/useIsManager';
import type { ReportType, ReportGenerationRequest, TeamMember } from '@/types/reports';
import { useEffect, useCallback } from 'react';

// Month options
const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// Report type options
const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'monthly',
    label: 'Monthly Summary',
    description: 'Total hours, days worked, and overtime',
  },
  {
    value: 'variance',
    label: 'Variance Report',
    description: 'Scheduled vs actual hours comparison',
  },
  {
    value: 'payroll',
    label: 'Payroll Report',
    description: 'Compensation breakdown and deductions',
  },
  {
    value: 'compliance',
    label: 'Compliance Report',
    description: 'Labor law violations and audit',
  },
];

// Generate years
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 3 }, (_, i) => currentYear - i);
}

export default function GenerateReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  useAuth();

  // State
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isManager = useIsManager();

  // Year options
  const yearOptions = useMemo(() => getYearOptions(), []);

  // Selected month/year validation
  const selectedDate = useMemo(() => {
    const date = new Date(year, month - 1, 1);
    const now = new Date();
    const isPastOrCurrent = date <= now;
    return { date, isPastOrCurrent };
  }, [year, month]);

  // Load team members
  const loadTeamMembers = useCallback(async () => {
    if (!slug || !isManager) return;

    try {
      const members = await fetchTeamMembers(slug);
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [slug, isManager]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  // Handlers
  const handleBack = () => {
    navigate(`/t/${slug}/reports`);
  };

  const handleSubmit = async () => {
    if (!slug) return;

    setIsSubmitting(true);
    try {
      const data: ReportGenerationRequest = {
        reportType,
        year,
        month,
        userId: userId || undefined,
        deliveryMethod: 'download',
      };

      const response = await generateReport(slug, data);

      setIsSuccess(true);
      toast.success('Report generation started');

      // Navigate to report after short delay
      setTimeout(() => {
        navigate(`/t/${slug}/reports/${response.reportId}`);
      }, 1500);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[50vh] flex-col items-center justify-center text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-600/5"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </motion.div>
        <h2 className="mb-2 text-2xl font-bold text-white">Report Generating</h2>
        <p className="mb-4 text-neutral-400">
          Your report is being generated. Redirecting...
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
      </motion.div>
    );
  }

  const selectedReportType = REPORT_TYPES.find((t) => t.value === reportType);
  const selectedMonth = MONTHS.find((m) => m.value === month);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/20 to-violet-600/20 shadow-lg shadow-primary-500/10">
          <Sparkles className="h-5 w-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Generate Report</h1>
          <p className="text-sm text-neutral-400">Create a new monthly report</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card space-y-6 p-6"
      >
        {/* Report Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Report Type</label>
          <Select
            value={reportType}
            onValueChange={(value) => setReportType(value as ReportType)}
          >
            <SelectTrigger className="glass-card border-white/10 text-white">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-neutral-200">
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-neutral-500">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Year */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Year</label>
            <Select
              value={year.toString()}
              onValueChange={(value) => setYear(parseInt(value, 10))}
            >
              <SelectTrigger className="glass-card border-white/10 text-white">
                <Calendar className="mr-2 h-4 w-4 text-neutral-500" />
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()} className="text-neutral-200">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Month</label>
            <Select
              value={month.toString()}
              onValueChange={(value) => setMonth(parseInt(value, 10))}
            >
              <SelectTrigger className="glass-card border-white/10 text-white">
                <Calendar className="mr-2 h-4 w-4 text-neutral-500" />
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()} className="text-neutral-200">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* User Selection (Managers only) */}
        {isManager && teamMembers.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Team Member (Optional)
            </label>
            <Select
              value={userId || 'all'}
              onValueChange={(value) => setUserId(value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="glass-card border-white/10 text-white">
                <User className="mr-2 h-4 w-4 text-neutral-500" />
                <SelectValue placeholder="All team members" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="all" className="text-neutral-200">
                  All Team Members
                </SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id} className="text-neutral-200">
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-neutral-500">
              Leave empty to generate reports for all team members
            </p>
          </div>
        )}

        {/* Validation warning */}
        {!selectedDate.isPastOrCurrent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">Future period selected</p>
              <p className="text-xs text-amber-400/70">
                You've selected a future month. The report may have incomplete data.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="mb-4 text-sm font-medium text-neutral-300">Report Preview</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Type</span>
            </div>
            <span className="font-medium text-white">{selectedReportType?.label}</span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Period</span>
            </div>
            <span className="font-medium text-white">
              {selectedMonth?.label} {year}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <User className="h-4 w-4" />
              <span className="text-sm">Employee</span>
            </div>
            <span className="font-medium text-white">
              {userId
                ? teamMembers.find((m) => m.id === userId)?.name || 'Selected user'
                : 'All team members'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Estimated Time</span>
            </div>
            <span className="font-medium text-white">~30 seconds</span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-end gap-3"
      >
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isSubmitting}
          className="rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5"
        >
          Cancel
        </Button>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

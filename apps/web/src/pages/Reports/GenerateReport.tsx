/**
 * Generate Report Page
 * Form to generate new monthly reports
 * Light theme styling with preview and validation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 3 }, (_, i) => currentYear - i);
}

export default function GenerateReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  useAuth();

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isManager = useIsManager();

  const yearOptions = useMemo(() => getYearOptions(), []);

  const selectedDate = useMemo(() => {
    const date = new Date(year, month - 1, 1);
    const now = new Date();
    const isPastOrCurrent = date <= now;
    return { date, isPastOrCurrent };
  }, [year, month]);

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

  function handleBack(): void {
    navigate(`/t/${slug}/reports`);
  }

  async function handleSubmit(): Promise<void> {
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

      setTimeout(() => {
        navigate(`/t/${slug}/reports/${response.reportId}`);
      }, 1500);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-charcoal">{t('reports.generating')}</h2>
        <p className="mb-4 text-kresna-gray">
          {t('reports.redirecting')}
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  const reportTypeOptions: { value: ReportType; labelKey: string; descKey: string }[] = [
    { value: 'monthly', labelKey: 'reports.monthly', descKey: 'reports.monthlyDesc' },
    { value: 'variance', labelKey: 'reports.varianceReport', descKey: 'reports.varianceDesc' },
    { value: 'payroll', labelKey: 'reports.payrollReport', descKey: 'reports.payrollDesc' },
    { value: 'compliance', labelKey: 'reports.complianceReport', descKey: 'reports.complianceDesc' },
  ];

  const selectedReportType = reportTypeOptions.find((opt) => opt.value === reportType);
  const selectedMonth = MONTHS.find((m) => m.value === month);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-1.5 rounded-lg border border-kresna-border bg-white text-kresna-gray-dark hover:bg-kresna-light"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <Sparkles className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-charcoal sm:text-2xl">{t('reports.generateTitle')}</h1>
          <p className="text-sm text-kresna-gray">{t('reports.generateSubtitle')}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-xl border border-kresna-border bg-white p-6">
        {/* Report Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-kresna-gray-dark">{t('reports.reportType')}</label>
          <Select
            value={reportType}
            onValueChange={(value) => setReportType(value as ReportType)}
          >
            <SelectTrigger className="rounded-lg border-kresna-border bg-white text-charcoal">
              <SelectValue placeholder={t('reports.reportType')} />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-kresna-border bg-white">
              {reportTypeOptions.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-charcoal">
                  <div className="flex flex-col">
                    <span>{t(type.labelKey)}</span>
                    <span className="text-xs text-kresna-gray">{t(type.descKey)}</span>
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
            <label className="mb-2 block text-sm font-medium text-kresna-gray-dark">{t('reports.year')}</label>
            <Select
              value={year.toString()}
              onValueChange={(value) => setYear(parseInt(value, 10))}
            >
              <SelectTrigger className="rounded-lg border-kresna-border bg-white text-charcoal">
                <Calendar className="mr-2 h-4 w-4 text-kresna-gray" />
                <SelectValue placeholder={t('reports.year')} />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-kresna-border bg-white">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()} className="text-charcoal">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month */}
          <div>
            <label className="mb-2 block text-sm font-medium text-kresna-gray-dark">{t('reports.month')}</label>
            <Select
              value={month.toString()}
              onValueChange={(value) => setMonth(parseInt(value, 10))}
            >
              <SelectTrigger className="rounded-lg border-kresna-border bg-white text-charcoal">
                <Calendar className="mr-2 h-4 w-4 text-kresna-gray" />
                <SelectValue placeholder={t('reports.month')} />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-kresna-border bg-white">
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()} className="text-charcoal">
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
            <label className="mb-2 block text-sm font-medium text-kresna-gray-dark">
              {t('reports.teamMember')}
            </label>
            <Select
              value={userId || 'all'}
              onValueChange={(value) => setUserId(value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="rounded-lg border-kresna-border bg-white text-charcoal">
                <User className="mr-2 h-4 w-4 text-kresna-gray" />
                <SelectValue placeholder={t('reports.allMembers')} />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-kresna-border bg-white">
                <SelectItem value="all" className="text-charcoal">
                  {t('reports.allMembers')}
                </SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id} className="text-charcoal">
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-kresna-gray">
              {t('reports.leaveEmpty')}
            </p>
          </div>
        )}

        {/* Validation warning */}
        {!selectedDate.isPastOrCurrent && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">{t('reports.futureWarning')}</p>
              <p className="text-xs text-amber-600">
                {t('reports.futureWarningDesc')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-kresna-border bg-white p-6">
        <h3 className="mb-4 text-sm font-medium text-kresna-gray-dark">{t('reports.preview')}</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-kresna-border bg-kresna-light p-3">
            <div className="flex items-center gap-2 text-kresna-gray">
              <FileText className="h-4 w-4" />
              <span className="text-sm">{t('reports.type')}</span>
            </div>
            <span className="font-medium text-charcoal">
              {selectedReportType ? t(selectedReportType.labelKey) : ''}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-kresna-border bg-kresna-light p-3">
            <div className="flex items-center gap-2 text-kresna-gray">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{t('reports.period')}</span>
            </div>
            <span className="font-medium text-charcoal">
              {selectedMonth?.label} {year}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-kresna-border bg-kresna-light p-3">
            <div className="flex items-center gap-2 text-kresna-gray">
              <User className="h-4 w-4" />
              <span className="text-sm">{t('reports.employee')}</span>
            </div>
            <span className="font-medium text-charcoal">
              {userId
                ? teamMembers.find((m) => m.id === userId)?.name || 'Selected user'
                : t('reports.allMembers')}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-kresna-border bg-kresna-light p-3">
            <div className="flex items-center gap-2 text-kresna-gray">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{t('reports.estimatedTime')}</span>
            </div>
            <span className="font-medium text-charcoal">~30 seconds</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isSubmitting}
          className="rounded-lg border border-kresna-border text-kresna-gray-dark hover:bg-kresna-light"
        >
          {t('reports.cancel')}
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="gap-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('reports.generating')}...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {t('reports.generate')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

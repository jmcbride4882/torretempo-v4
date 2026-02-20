/**
 * Reports Index Page
 * Lists all reports with filters, light theme styling, and mobile-first design
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReportCard, ReportCardSkeleton } from '@/components/reports/ReportCard';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { useAuth } from '@/hooks/useAuth';
import { useIsManager } from '@/hooks/useIsManager';
import { cn } from '@/lib/utils';
import { fetchReports, downloadReportPDF, fetchTeamMembers } from '@/lib/api/reports';
import type { MonthlyReport, ReportFilter, TeamMember } from '@/types/reports';

export default function ReportsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  useAuth();

  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ReportFilter>({});

  const isManager = useIsManager();

  const fetchData = useCallback(
    async (silent = false) => {
      if (!slug) return;

      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const response = await fetchReports(slug, filters);
        setReports(response.reports || []);

        if (silent) {
          toast.success(t('reports.toasts.reportsRefreshed'));
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error(t('reports.toasts.loadFailed'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [slug, filters]
  );

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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;

    const query = searchQuery.toLowerCase();
    return reports.filter((report) => {
      const monthName = new Date(report.year, report.month - 1).toLocaleString('default', {
        month: 'long',
      });
      return (
        monthName.toLowerCase().includes(query) ||
        report.year.toString().includes(query) ||
        report.userName?.toLowerCase().includes(query)
      );
    });
  }, [reports, searchQuery]);

  function handleRefresh(): void {
    fetchData(true);
  }

  function handleReportClick(id: string): void {
    navigate(`/t/${slug}/reports/${id}`);
  }

  async function handleDownload(id: string): Promise<void> {
    if (!slug) return;

    try {
      const { pdfUrl } = await downloadReportPDF(slug, id);
      window.open(pdfUrl, '_blank');
      toast.success(t('reports.toasts.pdfStarted'));
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(t('reports.toasts.pdfFailed'));
    }
  }

  function handleGenerateReport(): void {
    navigate(`/t/${slug}/reports/generate`);
  }

  function handleFilterChange(newFilters: ReportFilter): void {
    setFilters(newFilters);
  }

  const totalHours = reports.reduce((sum, r) => sum + r.totalHours, 0);
  const totalOvertime = reports.reduce((sum, r) => sum + r.overtimeHours, 0);
  const readyCount = reports.filter((r) => r.status === 'ready').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-charcoal sm:text-2xl">{t('reports.title')}</h1>
            <p className="text-sm text-kresna-gray">{t('reports.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-kresna-border bg-white text-kresna-gray-dark hover:bg-kresna-light"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('reports.refresh')}</span>
          </Button>

          <Button
            onClick={handleGenerateReport}
            size="sm"
            className="gap-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reports.generate')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ReportFilters
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        teamMembers={teamMembers}
        isManager={isManager}
      />

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kresna-gray" />
        <Input
          type="text"
          placeholder={t('reports.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg border-kresna-border bg-white pl-9 text-charcoal placeholder:text-kresna-gray focus:border-primary-500"
        />
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm sm:gap-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary-500" />
          <span className="text-kresna-gray">
            <span className="font-medium text-charcoal">{reports.length}</span> {t('reports.reports')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-kresna-gray">
            <span className="font-medium text-charcoal">{readyCount}</span> {t('reports.ready')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-kresna-gray" />
          <span className="text-kresna-gray">
            <span className="font-medium text-charcoal">{totalHours.toFixed(0)}h</span> {t('reports.total')}
          </span>
        </div>
        {totalOvertime > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-kresna-gray">
              <span className="font-medium text-amber-600">{totalOvertime.toFixed(0)}h</span>{' '}
              {t('reports.overtime').toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Reports grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ReportCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          hasFilters={!!filters.year || !!filters.month || !!filters.userId || !!searchQuery}
          onClearFilters={() => {
            setFilters({});
            setSearchQuery('');
          }}
          onGenerateReport={handleGenerateReport}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={handleReportClick}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onGenerateReport: () => void;
}

function EmptyState({ hasFilters, onClearFilters, onGenerateReport }: EmptyStateProps) {
  const { t } = useTranslation();

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kresna-border bg-kresna-light px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
          <Search className="h-7 w-7 text-kresna-gray" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-charcoal">{t('reports.noMatching')}</h3>
        <p className="mb-4 max-w-sm text-sm text-kresna-gray">
          {t('reports.adjustFilters')}
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-kresna-border text-kresna-gray-dark hover:bg-kresna-light"
        >
          {t('reports.clearFilters')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kresna-border bg-kresna-light px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
        <FileText className="h-8 w-8 text-primary-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-charcoal">{t('reports.noReports')}</h3>
      <p className="mb-6 max-w-sm text-sm text-kresna-gray">
        {t('reports.noReportsDesc')}
      </p>
      <Button
        onClick={onGenerateReport}
        className="gap-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
      >
        <Plus className="h-4 w-4" />
        {t('reports.generate')}
      </Button>
    </div>
  );
}

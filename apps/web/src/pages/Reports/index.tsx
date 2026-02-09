/**
 * Reports Index Page
 * Lists all reports with filters, glassmorphism styling, and mobile-first design
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  useAuth();

  // State
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ReportFilter>({});

  const isManager = useIsManager();

  // Fetch reports
  const fetchData = useCallback(
    async (silent = false) => {
      if (!slug) return;

      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const response = await fetchReports(slug, filters);
        setReports(response.reports || []);

        if (silent) {
          toast.success('Reports refreshed');
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [slug, filters]
  );

  // Fetch team members for filter
  const loadTeamMembers = useCallback(async () => {
    if (!slug || !isManager) return;

    try {
      const members = await fetchTeamMembers(slug);
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [slug, isManager]);

  // Load data on mount and filter change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  // Filter reports by search query
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

  // Handlers
  const handleRefresh = () => fetchData(true);

  const handleReportClick = (id: string) => {
    navigate(`/t/${slug}/reports/${id}`);
  };

  const handleDownload = async (id: string) => {
    if (!slug) return;

    try {
      const { pdfUrl } = await downloadReportPDF(slug, id);
      window.open(pdfUrl, '_blank');
      toast.success('PDF download started');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleGenerateReport = () => {
    navigate(`/t/${slug}/reports/generate`);
  };

  const handleFilterChange = (newFilters: ReportFilter) => {
    setFilters(newFilters);
  };

  // Stats
  const totalHours = reports.reduce((sum, r) => sum + r.totalHours, 0);
  const totalOvertime = reports.reduce((sum, r) => sum + r.overtimeHours, 0);
  const readyCount = reports.filter((r) => r.status === 'ready').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/20 to-violet-600/20 shadow-lg shadow-primary-500/10">
            <FileText className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Reports</h1>
            <p className="text-sm text-neutral-400">Monthly summaries and compliance reports</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleGenerateReport}
              size="sm"
              className="gap-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Generate Report</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ReportFilters
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          teamMembers={teamMembers}
          isManager={isManager}
        />
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          type="text"
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="glass-card border-white/10 pl-9 text-white placeholder:text-neutral-500 focus:border-primary-500"
        />
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{reports.length}</span> reports
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{readyCount}</span> ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{totalHours.toFixed(0)}h</span> total
          </span>
        </div>
        {totalOvertime > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-neutral-400">
              <span className="font-medium text-amber-400">{totalOvertime.toFixed(0)}h</span>{' '}
              overtime
            </span>
          </div>
        )}
      </motion.div>

      {/* Reports grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
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
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={handleReportClick}
                  onDownload={handleDownload}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Empty state component
function EmptyState({
  hasFilters,
  onClearFilters,
  onGenerateReport,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onGenerateReport: () => void;
}) {
  if (hasFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-800/50">
          <Search className="h-7 w-7 text-neutral-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-white">No matching reports</h3>
        <p className="mb-4 max-w-sm text-sm text-neutral-400">
          Try adjusting your filters or search query to find what you're looking for.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5"
        >
          Clear filters
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600/20 to-violet-600/20"
      >
        <FileText className="h-8 w-8 text-primary-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">No reports yet</h3>
      <p className="mb-6 max-w-sm text-sm text-neutral-400">
        Generate your first monthly report to track hours, overtime, and compliance.
      </p>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={onGenerateReport}
          className="gap-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
        >
          <Plus className="h-4 w-4" />
          Generate Report
        </Button>
      </motion.div>
    </motion.div>
  );
}

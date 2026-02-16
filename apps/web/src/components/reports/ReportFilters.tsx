/**
 * ReportFilters Component
 * Date range, user, and report type filters for reports page
 * Mobile-first responsive design with light theme
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Calendar, User, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReportFilter, TeamMember } from '@/types/reports';

interface ReportFiltersProps {
  currentFilters: ReportFilter;
  onFilterChange: (filters: ReportFilter) => void;
  teamMembers?: TeamMember[];
  isManager?: boolean;
  className?: string;
}

// Generate years for dropdown (current year back to 5 years ago)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
}

// Month translation key mapping
const MONTH_KEYS = [
  'common.months.january',
  'common.months.february',
  'common.months.march',
  'common.months.april',
  'common.months.may',
  'common.months.june',
  'common.months.july',
  'common.months.august',
  'common.months.september',
  'common.months.october',
  'common.months.november',
  'common.months.december',
];

export function ReportFilters({
  currentFilters,
  onFilterChange,
  teamMembers = [],
  isManager = false,
  className,
}: ReportFiltersProps) {
  const { t } = useTranslation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const yearOptions = useMemo(() => getYearOptions(), []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(currentFilters.year || currentFilters.month || currentFilters.userId);
  }, [currentFilters]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentFilters.year) count++;
    if (currentFilters.month) count++;
    if (currentFilters.userId) count++;
    return count;
  }, [currentFilters]);

  // Handle filter changes
  const handleYearChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      year: value === 'all' ? undefined : parseInt(value, 10),
    });
  };

  const handleMonthChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      month: value === 'all' ? undefined : parseInt(value, 10),
    });
  };

  const handleUserChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      userId: value === 'all' ? undefined : value,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({});
    setShowMobileFilters(false);
  };

  // Filter dropdown components
  const FilterDropdowns = () => (
    <>
      {/* Year filter */}
      <div className="flex-1 sm:flex-initial">
        <label className="mb-1.5 block text-xs font-medium text-zinc-500 sm:hidden">
          {t('reports.yearLabel')}
        </label>
        <Select
          value={currentFilters.year?.toString() || 'all'}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-full bg-white border-zinc-200 text-zinc-900 sm:w-[120px]">
            <Calendar className="mr-2 h-4 w-4 text-zinc-500 sm:hidden" />
            <SelectValue placeholder={t('reports.yearLabel')} />
          </SelectTrigger>
          <SelectContent className="bg-white border-zinc-200">
            <SelectItem value="all" className="text-zinc-700">
              {t('reports.allYears')}
            </SelectItem>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()} className="text-zinc-700">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Month filter */}
      <div className="flex-1 sm:flex-initial">
        <label className="mb-1.5 block text-xs font-medium text-zinc-500 sm:hidden">
          {t('reports.monthLabel')}
        </label>
        <Select
          value={currentFilters.month?.toString() || 'all'}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-full bg-white border-zinc-200 text-zinc-900 sm:w-[140px]">
            <Calendar className="mr-2 h-4 w-4 text-zinc-500 sm:hidden" />
            <SelectValue placeholder={t('reports.monthLabel')} />
          </SelectTrigger>
          <SelectContent className="bg-white border-zinc-200">
            <SelectItem value="all" className="text-zinc-700">
              {t('reports.allMonths')}
            </SelectItem>
            {MONTH_KEYS.map((key, index) => (
              <SelectItem
                key={index + 1}
                value={(index + 1).toString()}
                className="text-zinc-700"
              >
                {t(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User filter (managers only) */}
      {isManager && teamMembers.length > 0 && (
        <div className="flex-1 sm:flex-initial">
          <label className="mb-1.5 block text-xs font-medium text-zinc-500 sm:hidden">
            {t('reports.teamMemberLabel')}
          </label>
          <Select
            value={currentFilters.userId || 'all'}
            onValueChange={handleUserChange}
          >
            <SelectTrigger className="w-full bg-white border-zinc-200 text-zinc-900 sm:w-[180px]">
              <User className="mr-2 h-4 w-4 text-zinc-500 sm:hidden" />
              <SelectValue placeholder={t('reports.teamMemberLabel')} />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200">
              <SelectItem value="all" className="text-zinc-700">
                {t('reports.allTeamMembers')}
              </SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id} className="text-zinc-700">
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Clear filters button */}
      {hasActiveFilters && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="w-full gap-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 sm:w-auto"
          >
            <X className="h-3.5 w-3.5" />
            {t('common.clear')}
          </Button>
        </motion.div>
      )}
    </>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between sm:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={cn(
            'gap-1.5 rounded-lg border',
            showMobileFilters || hasActiveFilters
              ? 'border-primary-500/30 bg-primary-50 text-primary-600'
              : 'border-zinc-200 bg-white text-zinc-700'
          )}
        >
          <Filter className="h-4 w-4" />
          {t('reports.filters')}
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', showMobileFilters && 'rotate-180')}
          />
        </Button>

        {hasActiveFilters && !showMobileFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-1 rounded-lg text-zinc-500 hover:text-zinc-900"
          >
            <X className="h-3.5 w-3.5" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      {/* Mobile filters panel */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden sm:hidden"
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
              <FilterDropdowns />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop filters */}
      <div className="hidden items-center gap-2 sm:flex">
        <FilterDropdowns />
      </div>
    </div>
  );
}

export default ReportFilters;

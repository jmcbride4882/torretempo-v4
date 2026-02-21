import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Users, Plus, RefreshCw, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffRosterGrid } from '@/components/roster/StaffRosterGrid';
import { WeekSelector, getWeekRange } from '@/components/roster/WeekSelector';
import { LocationFilter } from '@/components/roster/LocationFilter';
import { CreateShiftModal } from '@/components/roster/CreateShiftModal';
import type { Shift, Location, ShiftsResponse, LocationsResponse } from '@/types/roster';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface StaffMember {
  id: string;
  name: string;
  email: string;
}

export default function RosterPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    if (!slug) return;

    setIsLoadingLocations(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/org/${slug}/locations`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data: LocationsResponse = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  }, [slug]);

  // Fetch staff/team members
  const fetchStaff = useCallback(async () => {
    if (!slug) return;

    setIsLoadingStaff(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/org/${slug}/members`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      const staffList: StaffMember[] = (data.members || []).map((member: any) => ({
        id: member.userId,
        name: member.user?.name || member.user?.email || t('common.unknown'),
        email: member.user?.email || '',
      }));
      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setIsLoadingStaff(false);
    }
  }, [slug]);

  // Fetch shifts
  const fetchShifts = useCallback(async (silent = false) => {
    if (!slug) return;

    if (!silent) setIsLoadingShifts(true);
    setIsRefreshing(silent);

    const { start, end } = getWeekRange(currentDate);

    try {
      const params = new URLSearchParams({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });

      if (selectedLocationId) {
        params.append('location_id', selectedLocationId);
      }

      const response = await fetch(
        `${API_URL}/api/v1/org/${slug}/shifts?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }

      const data: ShiftsResponse = await response.json();
      setShifts(data.shifts || []);

      if (silent) {
        toast.success(t('roster.toasts.rosterRefreshed'));
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error(t('roster.toasts.loadShiftsFailed'));
    } finally {
      setIsLoadingShifts(false);
      setIsRefreshing(false);
    }
  }, [slug, currentDate, selectedLocationId]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchLocations();
    fetchStaff();
  }, [fetchLocations, fetchStaff]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Handlers
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleLocationChange = (locationId: string | null) => {
    setSelectedLocationId(locationId);
  };

  const handleRefresh = () => {
    fetchShifts(true);
  };

  const handleShiftClick = (shift: Shift) => {
    toast.info(t('roster.toasts.shiftInfo', { id: shift.id.slice(0, 8) }), {
      description: `${new Date(shift.start_time).toLocaleString()}`,
    });
  };

  const handleCreateShift = () => {
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    fetchShifts(true);
    toast.success(t('roster.toasts.shiftCreated'));
  };

  const handleShiftDrop = async (shiftId: string, newUserId: string, targetDate: Date) => {
    if (!slug) return;

    try {
      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) {
        toast.error(t('roster.toasts.shiftNotFound'));
        return;
      }

      // Calculate new start and end times maintaining duration
      const oldStart = new Date(shift.start_time);
      const oldEnd = new Date(shift.end_time);
      const duration = oldEnd.getTime() - oldStart.getTime();

      const newStart = new Date(targetDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);

      const newEnd = new Date(newStart.getTime() + duration);

      const updateData: any = {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      };

      if (newUserId === 'unassigned') {
        updateData.user_id = null;
      } else {
        updateData.user_id = newUserId;
      }

      const response = await fetch(`${API_URL}/api/v1/org/${slug}/shifts/${shiftId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.violations && Array.isArray(errorData.violations)) {
          const errorMessages = errorData.violations.map((v: any) => v.message).join('\n');
          toast.error(t('roster.toasts.complianceViolation'), {
            description: errorMessages,
            duration: 5000,
          });
          return;
        }

        throw new Error(errorData.message || 'Failed to move shift');
      }

      await fetchShifts(true);
      toast.success(t('roster.toasts.shiftMoved'));
    } catch (error) {
      console.error('Error moving shift:', error);
      if (error instanceof Error && !error.message.includes('Compliance')) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">
              {t('roster.title')}
            </h1>
            <p className="text-sm text-kresna-gray">
              {t('roster.subtitle')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-xl border border-kresna-border bg-white text-kresna-gray-dark hover:bg-kresna-light"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('roster.refresh')}</span>
          </Button>

          <Button
            variant="gradient"
            onClick={handleCreateShift}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('roster.newShift')}</span>
          </Button>
        </div>
      </div>

      {/* Controls bar */}
      <div className="rounded-2xl border border-kresna-border bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Week selector */}
          <WeekSelector
            currentDate={currentDate}
            onDateChange={handleDateChange}
            onToday={handleToday}
          />

          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Mobile filter toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-1.5 rounded-xl border lg:hidden ${
                showFilters || selectedLocationId
                  ? 'border-primary-300 bg-primary-50 text-primary-600'
                  : 'border-kresna-border bg-white text-kresna-gray-dark'
              }`}
            >
              <Filter className="h-4 w-4" />
              {t('common.filters')}
              {selectedLocationId && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white">
                  1
                </span>
              )}
            </Button>

            {/* Desktop filters always visible */}
            <div className="hidden lg:flex lg:items-center lg:gap-2">
              <LocationFilter
                locations={locations}
                selectedLocationId={selectedLocationId}
                onLocationChange={handleLocationChange}
                isLoading={isLoadingLocations}
              />

              {selectedLocationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLocationId(null)}
                  className="gap-1 rounded-xl text-kresna-gray hover:text-charcoal"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('common.clear')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile filters panel */}
        {showFilters && (
          <div className="mt-4 border-t border-kresna-border pt-4 lg:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-kresna-gray">{t('roster.filterBy')}:</span>
              <LocationFilter
                locations={locations}
                selectedLocationId={selectedLocationId}
                onLocationChange={handleLocationChange}
                isLoading={isLoadingLocations}
              />

              {selectedLocationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLocationId(null)}
                  className="gap-1 rounded-xl text-kresna-gray hover:text-charcoal"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('roster.clearAll')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-kresna-border bg-white p-4 text-sm shadow-card">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-kresna-gray">
            <span className="font-medium text-charcoal">
              {shifts.filter((s) => s.status === 'acknowledged').length}
            </span>{' '}
            {t('roster.confirmed')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-500" />
          <span className="text-kresna-gray">
            <span className="font-medium text-charcoal">
              {shifts.filter((s) => s.status === 'published').length}
            </span>{' '}
            {t('roster.published')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-kresna-gray">
            <span className="font-medium text-charcoal">
              {shifts.filter((s) => s.status === 'draft').length}
            </span>{' '}
            {t('roster.drafts')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-kresna-gray" />
          <span className="text-kresna-gray">
            <span className="font-medium text-charcoal">
              {shifts.filter((s) => !s.user_id).length}
            </span>{' '}
            {t('roster.open')}
          </span>
        </div>
      </div>

      {/* Roster grid */}
      <StaffRosterGrid
        shifts={shifts}
        staff={staff}
        currentDate={currentDate}
        isLoading={isLoadingShifts || isLoadingStaff}
        onShiftClick={handleShiftClick}
        onShiftDrop={handleShiftDrop}
      />

      {/* Create shift modal */}
      <CreateShiftModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        locations={locations}
        organizationSlug={slug || ''}
        defaultDate={currentDate}
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Users, Plus, RefreshCw, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RosterGrid } from '@/components/roster/RosterGrid';
import { WeekSelector, getWeekRange } from '@/components/roster/WeekSelector';
import { LocationFilter } from '@/components/roster/LocationFilter';
import { CreateShiftModal } from '@/components/roster/CreateShiftModal';
import type { Shift, Location, ShiftsResponse, LocationsResponse } from '@/types/roster';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RosterPage() {
  const { slug } = useParams<{ slug: string }>();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
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
      // Don't show toast for locations - not critical
    } finally {
      setIsLoadingLocations(false);
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
        toast.success('Roster refreshed');
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to load shifts');
    } finally {
      setIsLoadingShifts(false);
      setIsRefreshing(false);
    }
  }, [slug, currentDate, selectedLocationId]);
  
  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);
  
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
    // TODO: Open shift detail modal
    toast.info(`Shift: ${shift.id.slice(0, 8)}...`, {
      description: `${new Date(shift.start_time).toLocaleString()}`,
    });
  };
  
  const handleCreateShift = () => {
    setShowCreateModal(true);
  };
  
  const handleCreateSuccess = () => {
    fetchShifts(true);
    toast.success('Shift created successfully');
  };
  
  const handleShiftDrop = async (shiftId: string, targetDate: Date) => {
    if (!slug) return;
    
    try {
      // Get the shift being moved
      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) {
        toast.error('Shift not found');
        return;
      }
      
      // Calculate new start and end times maintaining duration
      const oldStart = new Date(shift.start_time);
      const oldEnd = new Date(shift.end_time);
      const duration = oldEnd.getTime() - oldStart.getTime();
      
      const newStart = new Date(targetDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
      
      const newEnd = new Date(newStart.getTime() + duration);
      
      // Update shift via API
      const response = await fetch(`${API_URL}/api/v1/org/${slug}/shifts/${shiftId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle compliance violations specifically
        if (errorData.violations && Array.isArray(errorData.violations)) {
          const errorMessages = errorData.violations.map((v: any) => v.message).join('\n');
          toast.error('Compliance Violation', {
            description: errorMessages,
            duration: 5000,
          });
          return;
        }
        
        throw new Error(errorData.message || 'Failed to move shift');
      }
      
      // Refresh shifts
      await fetchShifts(true);
      toast.success('Shift moved successfully');
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600/20">
            <Users className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Roster</h1>
            <p className="text-sm text-neutral-400">
              Manage team schedules and shifts
            </p>
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
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleCreateShift}
              size="sm"
              className="gap-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Shift</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Controls bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
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
              className={`gap-1.5 rounded-lg border lg:hidden ${
                showFilters || selectedLocationId
                  ? 'border-primary-500/30 bg-primary-500/10 text-primary-300'
                  : 'border-white/5 bg-white/5 text-neutral-300'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {selectedLocationId && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white">
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
              
              {/* Clear filters */}
              {selectedLocationId && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLocationId(null)}
                    className="gap-1 rounded-lg text-neutral-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 border-t border-white/5 pt-4 lg:hidden"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">Filter by:</span>
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
                  className="gap-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-6 text-sm"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">
              {shifts.filter((s) => s.status === 'acknowledged').length}
            </span>{' '}
            confirmed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">
              {shifts.filter((s) => s.status === 'published').length}
            </span>{' '}
            published
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">
              {shifts.filter((s) => s.status === 'draft').length}
            </span>{' '}
            drafts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-neutral-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">
              {shifts.filter((s) => !s.user_id).length}
            </span>{' '}
            open
          </span>
        </div>
      </motion.div>
      
      {/* Roster grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <RosterGrid
          shifts={shifts}
          currentDate={currentDate}
          isLoading={isLoadingShifts}
          onShiftClick={handleShiftClick}
          onShiftDrop={handleShiftDrop}
        />
      </motion.div>
      
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

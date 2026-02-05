import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Store, RefreshCw, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Shift, ShiftsResponse } from '@/types/roster';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function OpenShiftsPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claimingShiftId, setClaimingShiftId] = useState<string | null>(null);
  
  // Fetch open shifts
  const fetchOpenShifts = useCallback(async (silent = false) => {
    if (!slug) return;
    
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);
    
    try {
      const response = await fetch(
        `${API_URL}/api/v1/org/${slug}/shifts/open`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch open shifts');
      }
      
      const data: ShiftsResponse = await response.json();
      setOpenShifts(data.shifts || []);
      
      if (silent) {
        toast.success('Open shifts refreshed');
      }
    } catch (error) {
      console.error('Error fetching open shifts:', error);
      toast.error('Failed to load open shifts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [slug]);
  
  // Load data on mount
  useEffect(() => {
    fetchOpenShifts();
  }, [fetchOpenShifts]);
  
  // Claim shift handler
  const handleClaimShift = async (shiftId: string) => {
    if (!slug) return;
    
    setClaimingShiftId(shiftId);
    
    try {
      const response = await fetch(
        `${API_URL}/api/v1/org/${slug}/shifts/${shiftId}/claim`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle compliance violations
        if (errorData.violations && Array.isArray(errorData.violations)) {
          const violationMessages = errorData.violations
            .map((v: any) => v.message)
            .join('\n');
          toast.error('Cannot claim shift', {
            description: violationMessages,
            duration: 5000,
          });
          return;
        }
        
        throw new Error(errorData.message || 'Failed to claim shift');
      }
      
      toast.success('Shift claimed successfully!');
      
      // Refresh the list
      await fetchOpenShifts(true);
    } catch (error) {
      console.error('Error claiming shift:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to claim shift');
    } finally {
      setClaimingShiftId(null);
    }
  };
  
  // Group shifts by date
  const shiftsByDate = openShifts.reduce((acc, shift) => {
    const dateKey = new Date(shift.start_time).toISOString().split('T')[0] ?? '';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey]?.push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);
  
  const sortedDates = Object.keys(shiftsByDate).sort();
  
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-neutral-400">Loading open shifts...</p>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20">
            <Store className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Open Shifts</h1>
            <p className="text-sm text-neutral-400">
              Browse and claim available shifts
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchOpenShifts(true)}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>
      </motion.div>
      
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-emerald-500" />
          <span className="text-sm text-neutral-400">
            <span className="font-medium text-neutral-200">{openShifts.length}</span>{' '}
            open shift{openShifts.length !== 1 ? 's' : ''} available
          </span>
        </div>
      </motion.div>
      
      {/* Shifts list */}
      {sortedDates.length > 0 ? (
        <div className="space-y-6">
          {sortedDates.map((dateKey, dateIndex) => {
            const date = new Date(dateKey);
            const shifts = shiftsByDate[dateKey] ?? [];
            
            return (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dateIndex * 0.05 }}
                className="space-y-3"
              >
                {/* Date header */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-neutral-500" />
                  <h3 className="font-semibold text-neutral-200">
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <span className="text-neutral-500">
                    ({shifts.length} shift{shifts.length !== 1 ? 's' : ''})
                  </span>
                </div>
                
                {/* Shifts grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {shifts.map((shift, shiftIndex) => (
                    <motion.div
                      key={shift.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: dateIndex * 0.05 + shiftIndex * 0.02 }}
                      className="glass-card overflow-hidden rounded-lg border border-white/5"
                    >
                      <div className="p-4">
                        {/* Shift details */}
                        <div className="space-y-3">
                          {/* Time */}
                          <div className="flex items-center gap-2 text-primary-400">
                            <Clock className="h-4 w-4" />
                            <span className="font-semibold tabular-nums">
                              {new Date(shift.start_time).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(shift.end_time).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          
                          {/* Location */}
                          {shift.location && (
                            <div className="flex items-center gap-2 text-neutral-400">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{shift.location.name}</span>
                            </div>
                          )}
                          
                          {/* Duration */}
                          <div className="flex items-center gap-2">
                            <div className="rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-neutral-400">
                              {(() => {
                                const start = new Date(shift.start_time);
                                const end = new Date(shift.end_time);
                                const diffMs = end.getTime() - start.getTime();
                                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                return `${hours}h ${minutes}m`;
                              })()}
                            </div>
                            {shift.break_minutes && shift.break_minutes > 0 && (
                              <span className="text-xs text-neutral-500">
                                +{shift.break_minutes}m break
                              </span>
                            )}
                          </div>
                          
                          {/* Notes */}
                          {shift.notes && (
                            <p className="text-xs text-neutral-400 italic line-clamp-2">
                              "{shift.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Claim button */}
                      <div className="border-t border-white/5 bg-white/[0.01] p-3">
                        <Button
                          onClick={() => handleClaimShift(shift.id)}
                          disabled={claimingShiftId === shift.id}
                          className="w-full gap-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          {claimingShiftId === shift.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Claim This Shift
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/50">
            <Store className="h-8 w-8 text-neutral-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-neutral-200">No open shifts</h3>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            There are no open shifts available at the moment. Check back later for new opportunities!
          </p>
        </motion.div>
      )}
    </div>
  );
}

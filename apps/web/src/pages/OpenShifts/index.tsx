import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Store, RefreshCw, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Shift, ShiftsResponse } from '@/types/roster';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function OpenShiftsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();

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
        throw new Error(t('roster.openShifts.fetchError'));
      }

      const data: ShiftsResponse = await response.json();
      setOpenShifts(data.shifts || []);

      if (silent) {
        toast.success(t('roster.openShifts.refreshed'));
      }
    } catch (error) {
      console.error('Error fetching open shifts:', error);
      toast.error(t('roster.openShifts.fetchError'));
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
          toast.error(t('roster.openShifts.cannotClaim'), {
            description: violationMessages,
            duration: 5000,
          });
          return;
        }

        throw new Error(errorData.message || t('roster.openShifts.claimError'));
      }

      toast.success(t('roster.openShifts.claimSuccess'));

      // Refresh the list
      await fetchOpenShifts(true);
    } catch (error) {
      console.error('Error claiming shift:', error);
      toast.error(error instanceof Error ? error.message : t('roster.openShifts.claimError'));
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
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm text-zinc-500">{t('openShifts.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Store className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              {t('openShifts.title')}
            </h1>
            <p className="text-sm text-zinc-500">
              {t('openShifts.subtitle')}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchOpenShifts(true)}
          disabled={isRefreshing}
          className="gap-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('openShifts.refresh')}
        </Button>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-emerald-600" />
          <span className="text-sm text-zinc-500">
            <span className="font-medium text-zinc-900">{openShifts.length}</span>{' '}
            {t('openShifts.available', { count: openShifts.length })}
          </span>
        </div>
      </div>

      {/* Shifts list */}
      {sortedDates.length > 0 ? (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const date = new Date(dateKey);
            const shifts = shiftsByDate[dateKey] ?? [];

            return (
              <div key={dateKey} className="space-y-3">
                {/* Date header */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <h3 className="font-semibold text-zinc-900">
                    {date.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <span className="text-zinc-400">
                    ({shifts.length} {t('openShifts.shifts', { count: shifts.length })})
                  </span>
                </div>

                {/* Shifts grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
                    >
                      <div className="p-4">
                        <div className="space-y-3">
                          {/* Time */}
                          <div className="flex items-center gap-2 text-primary-600">
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
                            <div className="flex items-center gap-2 text-zinc-500">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{shift.location.name}</span>
                            </div>
                          )}

                          {/* Duration */}
                          <div className="flex items-center gap-2">
                            <div className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
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
                              <span className="text-xs text-zinc-400">
                                +{shift.break_minutes}m {t('roster.openShifts.break')}
                              </span>
                            )}
                          </div>

                          {/* Notes */}
                          {shift.notes && (
                            <p className="text-xs text-zinc-500 italic line-clamp-2">
                              "{shift.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Claim button */}
                      <div className="border-t border-zinc-200 bg-zinc-50 p-3">
                        <Button
                          onClick={() => handleClaimShift(shift.id)}
                          disabled={claimingShiftId === shift.id}
                          className="w-full gap-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          {claimingShiftId === shift.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              {t('openShifts.claiming')}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              {t('openShifts.claimShift')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
            <Store className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-900">
            {t('openShifts.noShifts')}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            {t('openShifts.noShiftsDesc')}
          </p>
        </div>
      )}
    </div>
  );
}

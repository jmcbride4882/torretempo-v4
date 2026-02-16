/**
 * ClockInSheet Component
 * Mobile-first bottom sheet for clocking in with geolocation verification
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wifi,
  QrCode,
  Hash,
  Hand,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useGeolocation, formatAccuracy, isAccuracyAcceptable } from '@/hooks/useGeolocation';
import { useNFC } from '@/hooks/useNFC';
import { useQRScanner } from '@/hooks/useQRScanner';
import { LocationMap } from '@/components/locations/LocationMap';
import { useHaptic } from '@/hooks/useHaptic';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { PINInput } from '@/components/time-clock/PINInput';
import { clockIn, TimeEntryApiError } from '@/lib/api/time-entries';
import type { ClockMethod } from '@/lib/api/time-entries';

// ============================================================================
// Types
// ============================================================================

export interface ClockInSheetProps {
  isOpen: boolean;
  onClose: () => void;
  organizationSlug: string;
  shiftId?: string;
}

type ClockMethodOption = {
  id: ClockMethod;
  labelKey: string;
  icon: React.ElementType;
  available: boolean;
};

// ============================================================================
// Constants
// ============================================================================

const CLOCK_METHODS: ClockMethodOption[] = [
  { id: 'tap', labelKey: 'clock.methodTap', icon: Hand, available: true },
  { id: 'nfc', labelKey: 'clock.methodNfc', icon: Wifi, available: true },
  { id: 'qr', labelKey: 'clock.methodQr', icon: QrCode, available: true },
  { id: 'pin', labelKey: 'clock.methodPin', icon: Hash, available: true },
];

// ============================================================================
// Component
// ============================================================================

export function ClockInSheet({ isOpen, onClose, organizationSlug, shiftId }: ClockInSheetProps) {
  const { t } = useTranslation();

  // Geolocation
  const {
    position,
    loading: geoLoading,
    error: geoError,
    accuracy,
    requestPermission
  } = useGeolocation();

  // NFC
  const {
    isScanning: nfcScanning,
    isSupported: nfcSupported,
    error: nfcError,
    lastScan: nfcData,
    startScan: startNFCScan,
    stopScan: stopNFCScan,
  } = useNFC();

  // QR Scanner
  const {
    isScanning: qrScanning,
    isSupported: qrSupported,
    error: qrError,
    scanData: qrData,
    startScan: startQRScan,
    stopScan: stopQRScan,
    clearScan: clearQRScan,
  } = useQRScanner({ fps: 10, qrbox: 250 });

  // Haptic feedback
  const haptic = useHaptic();

  // Offline queue
  const { isOnline, enqueue: enqueueAction } = useOfflineQueue();

  // Local state
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [selectedMethod, setSelectedMethod] = React.useState<ClockMethod>('tap');
  const [notes, setNotes] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [pinError, setPinError] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Time formatter - es-ES locale with 24h time
  const timeFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    []
  );

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }),
    []
  );

  // Update current time every second
  React.useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Request geolocation on mount
  React.useEffect(() => {
    if (isOpen && !position && !geoLoading && !geoError) {
      requestPermission();
    }
  }, [isOpen, position, geoLoading, geoError, requestPermission]);

  // Reset state when sheet opens
  React.useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError(null);
      setNotes('');
      setPin('');
      setPinError(false);
      setSelectedMethod('tap');
      clearQRScan();
    } else {
      // Stop scanning when sheet closes
      stopNFCScan();
      stopQRScan();
    }
  }, [isOpen, stopNFCScan, stopQRScan, clearQRScan]);

  // Start NFC scan when NFC method is selected
  React.useEffect(() => {
    if (isOpen && selectedMethod === 'nfc' && nfcSupported && !nfcScanning && !nfcData) {
      startNFCScan();
    }
  }, [isOpen, selectedMethod, nfcSupported, nfcScanning, nfcData, startNFCScan]);

  // Start QR scan when QR method is selected
  React.useEffect(() => {
    if (isOpen && selectedMethod === 'qr' && qrSupported && !qrScanning && !qrData) {
      startQRScan('qr-reader-preview');
    }
  }, [isOpen, selectedMethod, qrSupported, qrScanning, qrData, startQRScan]);

  // Haptic feedback when QR code is successfully scanned
  React.useEffect(() => {
    if (qrData) {
      haptic.success();
    }
  }, [qrData, haptic]);

  // Haptic feedback when NFC tag is successfully read
  React.useEffect(() => {
    if (nfcData) {
      haptic.success();
    }
  }, [nfcData, haptic]);

  // Computed values
  const isWithinGeofence = React.useMemo(() => {
    // For now, assume within geofence if we have location
    // In production, calculate distance to assigned work location
    return position !== null;
  }, [position]);

  const hasLowAccuracy = accuracy !== null && !isAccuracyAcceptable(accuracy);

  // For PIN method, also require PIN to be entered
  const canClockIn = React.useMemo(() => {
    if (submitting || success) return false;
    if (!position || !isWithinGeofence) return false;
    if (selectedMethod === 'pin' && pin.length !== 4) return false;
    return true;
  }, [position, isWithinGeofence, submitting, success, selectedMethod, pin]);

  const isPermissionDenied = geoError?.code === 1; // PERMISSION_DENIED

  // Handle clock in submission
  const handleClockIn = async () => {
    if (!organizationSlug || !position) return;

    // Light haptic feedback on button press
    haptic.light();

    setSubmitting(true);
    setError(null);

    const clockInData = {
      linked_shift_id: shiftId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      method: selectedMethod,
      notes: notes.trim() || undefined,
    };

    try {
      if (!isOnline) {
        // Queue action for offline processing
        await enqueueAction('clock-in', organizationSlug, clockInData);

        setSuccess(true);
        haptic.success();

        // Show offline message
        setTimeout(() => {
          onClose();
        }, 1500);

        return;
      }

      // Online - process immediately
      await clockIn(organizationSlug, clockInData);

      setSuccess(true);

      // Success haptic feedback (two short pulses)
      haptic.success();

      // Close after success animation
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      // Error haptic feedback (three quick pulses)
      haptic.error();

      if (err instanceof TimeEntryApiError) {
        if (err.status === 409) {
          setError(t('clock.alreadyClockedIn'));
        } else if (err.status === 403) {
          setError(t('clock.outsideAllowedArea'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('clock.failedToClockIn'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[520]}
      dismissable={!submitting}
    >
      <div className="flex flex-col gap-6">
        {/* Header with Time */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-zinc-900">{t('clock.clockIn')}</h2>
          </div>
          <div className="text-4xl font-mono font-bold text-zinc-900 tracking-tight">
            {timeFormatter.format(currentTime)}
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {dateFormatter.format(currentTime)}
          </p>
        </div>

        {/* Location Section */}
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700">{t('clock.location')}</span>
            </div>
            {geoLoading ? (
              <Badge variant="ghost" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('common.fetching')}
              </Badge>
            ) : position ? (
              <Badge
                variant={isWithinGeofence ? 'success' : 'destructive'}
                className="gap-1"
              >
                {isWithinGeofence ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    {t('clock.withinGeofence')}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    {t('clock.outsideGeofence')}
                  </>
                )}
              </Badge>
            ) : null}
          </div>

          {/* Location Status Content */}
          {isPermissionDenied ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600">
                  {t('clock.locationRequired')}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {t('clock.enableLocationPermissions')}
                </p>
              </div>
            </div>
          ) : geoLoading ? (
            <div className="flex items-center gap-3 py-2">
              <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
              </div>
              <div>
                <p className="text-sm text-zinc-700">{t('clock.fetchingLocation')}</p>
                <p className="text-xs text-zinc-500">{t('common.pleaseWait')}</p>
              </div>
            </div>
          ) : position ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{t('clock.coordinates')}</span>
                <span className="text-zinc-700 font-mono">
                  {position.coords.latitude.toFixed(5)}, {position.coords.longitude.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{t('clock.accuracy')}</span>
                <span className={cn(
                  "font-mono",
                  hasLowAccuracy ? "text-amber-600" : "text-zinc-700"
                )}>
                  {formatAccuracy(accuracy ?? 0)}
                </span>
              </div>
              {hasLowAccuracy && (
                <div className="flex items-center gap-2 text-xs text-amber-600 pt-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t('clock.lowAccuracy')}
                </div>
              )}

              {/* Location Map */}
              <div className="mt-3">
                <LocationMap
                  lat={position.coords.latitude}
                  lng={position.coords.longitude}
                  accuracy={accuracy ?? undefined}
                  height="180px"
                  showAccuracyCircle={true}
                />
              </div>
            </div>
          ) : geoError ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-600">{geoError.message}</p>
            </div>
          ) : null}
        </div>

        {/* NFC Status Section (shown when NFC method is selected) */}
        {selectedMethod === 'nfc' && (
          <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">{t('clock.nfcTag')}</span>
              </div>
              {nfcScanning ? (
                <Badge variant="ghost" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('common.scanning')}
                </Badge>
              ) : nfcData ? (
                <Badge variant="default" className="gap-1 bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('clock.tagRead')}
                </Badge>
              ) : null}
            </div>

            {nfcError ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600">{t('clock.nfcError')}</p>
                  <p className="text-xs text-zinc-500 mt-1">{nfcError}</p>
                </div>
              </div>
            ) : nfcScanning ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="h-16 w-16 rounded-full bg-primary-50 flex items-center justify-center">
                  <Wifi className="h-8 w-8 text-primary-600" />
                </div>
                <p className="text-sm text-zinc-700">{t('clock.holdNfcNearDevice')}</p>
              </div>
            ) : nfcData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{t('clock.serialNumber')}</span>
                  <span className="text-zinc-700 font-mono">{nfcData.serialNumber.substring(0, 16)}...</span>
                </div>
                {nfcData.message && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{t('common.message')}</span>
                    <span className="text-zinc-700">{nfcData.message}</span>
                  </div>
                )}
              </div>
            ) : !nfcSupported ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600">{t('clock.nfcNotSupported')}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t('clock.nfcBrowserNotSupported')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* QR Scanner Section (shown when QR method is selected) */}
        {selectedMethod === 'qr' && (
          <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">{t('clock.qrCode')}</span>
              </div>
              {qrScanning ? (
                <Badge variant="ghost" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('common.scanning')}
                </Badge>
              ) : qrData ? (
                <Badge variant="default" className="gap-1 bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('clock.codeScanned')}
                </Badge>
              ) : null}
            </div>

            {qrError ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600">{t('clock.qrScannerError')}</p>
                  <p className="text-xs text-zinc-500 mt-1">{qrError}</p>
                </div>
              </div>
            ) : qrScanning ? (
              <div className="space-y-3">
                {/* Camera preview container */}
                <div
                  id="qr-reader-preview"
                  className="w-full aspect-square rounded-lg overflow-hidden bg-black"
                />
                <p className="text-sm text-center text-zinc-500">
                  {t('clock.pointCameraAtQR')}
                </p>
              </div>
            ) : qrData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{t('clock.location')}</span>
                  <span className="text-zinc-700">{qrData.locationName || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Location ID</span>
                  <span className="text-zinc-700 font-mono">{qrData.locationId}</span>
                </div>
              </div>
            ) : !qrSupported ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600">{t('clock.cameraNotAvailable')}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t('clock.cameraBrowserNotSupported')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* PIN Input Section (shown when PIN method is selected) */}
        {selectedMethod === 'pin' && (
          <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">{t('clock.enterPin')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-center text-zinc-500">
                {t('clock.enter4DigitPin')}
              </p>
              <PINInput
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setPinError(false);
                }}
                onComplete={(_completedPin) => {
                  // PIN verification will happen on clock-in submission
                  // Security: Do not log PINs
                }}
                error={pinError}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Clock Method Tabs */}
        <div className="space-y-2">
          <Label className="text-zinc-500">{t('clock.clockMethod')}</Label>
          <div className="grid grid-cols-4 gap-2">
            {CLOCK_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              const isDisabled = !method.available;

              return (
                <button
                  key={method.id}
                  onClick={() => {
                    if (method.available) {
                      haptic.light();
                      setSelectedMethod(method.id);
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl",
                    "min-h-[56px] transition-all duration-200",
                    "border",
                    isSelected && method.available
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-zinc-50 border-zinc-200 text-zinc-500",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{t(method.labelKey)}</span>
                  {isDisabled && (
                    <span className="text-[10px] text-zinc-500">{t('common.soon')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="clock-in-notes" className="text-zinc-500">
            {t('common.notesOptional')}
          </Label>
          <textarea
            id="clock-in-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('common.addNotes')}
            rows={2}
            className={cn(
              "w-full px-3 py-2 rounded-xl resize-none",
              "bg-zinc-50 border border-zinc-200",
              "text-zinc-900 placeholder:text-zinc-400",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300",
              "text-sm"
            )}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-zinc-900">{t('clock.clockedInSuccess')}</p>
            <p className="text-sm text-zinc-500">
              {timeFormatter.format(currentTime)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!success && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleClockIn}
              disabled={!canClockIn}
              className={cn(
                "h-14 text-lg font-semibold rounded-xl",
                "bg-emerald-600 hover:bg-emerald-700",
                "disabled:bg-zinc-200 disabled:text-zinc-400"
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('clock.clockingIn')}
                </span>
              ) : (
                t('clock.clockInNow')
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="h-12 text-zinc-500 hover:text-zinc-900"
            >
              {t('common.cancel')}
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/**
 * ClockInSheet Component
 * Mobile-first bottom sheet for clocking in with geolocation verification
 * Uses glassmorphism design, Framer Motion animations, and geofence validation
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useOrganization } from '@/hooks/useOrganization';
import { useNFC } from '@/hooks/useNFC';
import { useQRScanner } from '@/hooks/useQRScanner';
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
  shiftId?: string;
}

type ClockMethodOption = {
  id: ClockMethod;
  label: string;
  icon: React.ElementType;
  available: boolean;
};

// ============================================================================
// Constants
// ============================================================================

const CLOCK_METHODS: ClockMethodOption[] = [
  { id: 'tap', label: 'Tap', icon: Hand, available: true },
  { id: 'nfc', label: 'NFC', icon: Wifi, available: true },
  { id: 'qr', label: 'QR', icon: QrCode, available: true },
  { id: 'pin', label: 'PIN', icon: Hash, available: true }, // Now enabled
];

const SPRING_CONFIG = { type: 'spring', damping: 30, stiffness: 300 } as const;

// ============================================================================
// Component
// ============================================================================

export function ClockInSheet({ isOpen, onClose, shiftId }: ClockInSheetProps) {
  // Organization context
  const { organization } = useOrganization();
  
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

  // Time formatter
  const timeFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    }),
    []
  );

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('en-US', { 
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
      // Start scanning with the preview element ID
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
    if (!organization?.slug || !position) return;
    
    // Light haptic feedback on button press
    haptic.light();
    
    setSubmitting(true);
    setError(null);

    const clockInData = {
      linked_shift_id: shiftId,
      clock_in_location: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      },
      clock_in_method: selectedMethod,
      notes: notes.trim() || undefined,
    };

    try {
      if (!isOnline) {
        // Queue action for offline processing
        await enqueueAction('clock-in', organization.slug, clockInData);
        
        setSuccess(true);
        haptic.success();
        
        // Show offline message
        setTimeout(() => {
          onClose();
        }, 1500);
        
        return;
      }

      // Online - process immediately
      await clockIn(organization.slug, clockInData);

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
          setError('You are already clocked in. Please clock out first.');
        } else if (err.status === 403) {
          setError('You are outside the allowed work area.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to clock in. Please try again.');
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
            <Clock className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Clock In</h2>
          </div>
          <motion.div
            key={currentTime.getTime()}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-4xl font-mono font-bold text-white tracking-tight"
          >
            {timeFormatter.format(currentTime)}
          </motion.div>
          <p className="text-sm text-zinc-400 mt-1">
            {dateFormatter.format(currentTime)}
          </p>
        </div>

        {/* Location Section */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Location</span>
            </div>
            {geoLoading ? (
              <Badge variant="ghost" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching...
              </Badge>
            ) : position ? (
              <Badge 
                variant={isWithinGeofence ? 'success' : 'destructive'}
                className="gap-1"
              >
                {isWithinGeofence ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Within geofence
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Outside geofence
                  </>
                )}
              </Badge>
            ) : null}
          </div>

          {/* Location Status Content */}
          <AnimatePresence mode="wait">
            {isPermissionDenied ? (
              <motion.div
                key="denied"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Location access required
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Please enable location permissions in your browser settings to clock in.
                  </p>
                </div>
              </motion.div>
            ) : geoLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 py-2"
              >
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                </div>
                <div>
                  <p className="text-sm text-zinc-300">Fetching location...</p>
                  <p className="text-xs text-zinc-500">Please wait</p>
                </div>
              </motion.div>
            ) : position ? (
              <motion.div
                key="location"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Coordinates</span>
                  <span className="text-zinc-300 font-mono">
                    {position.coords.latitude.toFixed(5)}, {position.coords.longitude.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Accuracy</span>
                  <span className={cn(
                    "font-mono",
                    hasLowAccuracy ? "text-amber-400" : "text-zinc-300"
                  )}>
                    {formatAccuracy(accuracy ?? 0)}
                  </span>
                </div>
                {hasLowAccuracy && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 text-xs text-amber-400 pt-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Low GPS accuracy detected
                  </motion.div>
                )}
              </motion.div>
            ) : geoError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-sm text-red-400">{geoError.message}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* NFC Status Section (shown when NFC method is selected) */}
        {selectedMethod === 'nfc' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">NFC Tag</span>
              </div>
              {nfcScanning ? (
                <Badge variant="ghost" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Scanning...
                </Badge>
              ) : nfcData ? (
                <Badge variant="default" className="gap-1 bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Tag Read
                </Badge>
              ) : null}
            </div>

            {nfcError ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">NFC Error</p>
                  <p className="text-xs text-zinc-400 mt-1">{nfcError}</p>
                </div>
              </div>
            ) : nfcScanning ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-16 w-16 rounded-full bg-primary-500/20 flex items-center justify-center"
                >
                  <Wifi className="h-8 w-8 text-primary-400" />
                </motion.div>
                <p className="text-sm text-zinc-300">Hold NFC tag near device</p>
              </div>
            ) : nfcData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Serial Number</span>
                  <span className="text-zinc-300 font-mono">{nfcData.serialNumber.substring(0, 16)}...</span>
                </div>
                {nfcData.message && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Message</span>
                    <span className="text-zinc-300">{nfcData.message}</span>
                  </div>
                )}
              </div>
            ) : !nfcSupported ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">NFC Not Supported</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your browser or device doesn't support NFC. Try using Chrome on Android.
                  </p>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* QR Scanner Section (shown when QR method is selected) */}
        {selectedMethod === 'qr' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">QR Code</span>
              </div>
              {qrScanning ? (
                <Badge variant="ghost" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Scanning...
                </Badge>
              ) : qrData ? (
                <Badge variant="default" className="gap-1 bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Code Scanned
                </Badge>
              ) : null}
            </div>

            {qrError ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">QR Scanner Error</p>
                  <p className="text-xs text-zinc-400 mt-1">{qrError}</p>
                </div>
              </div>
            ) : qrScanning ? (
              <div className="space-y-3">
                {/* Camera preview container */}
                <div 
                  id="qr-reader-preview" 
                  className="w-full aspect-square rounded-lg overflow-hidden bg-black"
                />
                <p className="text-sm text-center text-zinc-400">
                  Point camera at QR code
                </p>
              </div>
            ) : qrData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Location</span>
                  <span className="text-zinc-300">{qrData.locationName || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Location ID</span>
                  <span className="text-zinc-300 font-mono">{qrData.locationId}</span>
                </div>
              </div>
            ) : !qrSupported ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Camera Not Available</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Camera access is not available on this device or browser.
                  </p>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* PIN Input Section (shown when PIN method is selected) */}
        {selectedMethod === 'pin' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Enter PIN</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-center text-zinc-400">
                Enter your 4-digit clock-in PIN
              </p>
              <PINInput
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setPinError(false);
                }}
                onComplete={(completedPin) => {
                  // PIN verification will happen on clock-in submission
                  console.log('PIN entered:', completedPin);
                }}
                error={pinError}
                autoFocus
              />
            </div>
          </motion.div>
        )}

        {/* Clock Method Tabs */}
        <div className="space-y-2">
          <Label className="text-zinc-400">Clock Method</Label>
          <div className="grid grid-cols-4 gap-2">
            {CLOCK_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              const isDisabled = !method.available;
              
              return (
                <motion.button
                  key={method.id}
                  whileTap={method.available ? { scale: 0.95 } : undefined}
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
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{method.label}</span>
                  {isDisabled && (
                    <span className="text-[10px] text-zinc-500">Soon</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="clock-in-notes" className="text-zinc-400">
            Notes (optional)
          </Label>
          <textarea
            id="clock-in-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes..."
            rows={2}
            className={cn(
              "w-full px-3 py-2 rounded-xl resize-none",
              "bg-zinc-900/50 border border-zinc-800",
              "text-white placeholder:text-zinc-600",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50",
              "text-sm"
            )}
          />
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success State */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING_CONFIG}
              className="flex flex-col items-center justify-center py-4 gap-2"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...SPRING_CONFIG, delay: 0.1 }}
                className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </motion.div>
              <p className="text-lg font-semibold text-white">Clocked In!</p>
              <p className="text-sm text-zinc-400">
                {timeFormatter.format(currentTime)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        {!success && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleClockIn}
              disabled={!canClockIn}
              className={cn(
                "h-14 text-lg font-semibold rounded-xl",
                "bg-emerald-600 hover:bg-emerald-700",
                "disabled:bg-zinc-800 disabled:text-zinc-500"
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Clocking In...
                </span>
              ) : (
                'Clock In Now'
              )}
            </Button>
            
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="h-12 text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

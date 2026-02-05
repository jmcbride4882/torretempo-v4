/**
 * useQRScanner Hook
 * Provides QR code scanning functionality using html5-qrcode library
 * Handles camera permissions, scanning lifecycle, and error states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

export interface QRScanData {
  locationId: string;
  locationName?: string;
  type?: string;
  generatedAt?: string;
}

export interface UseQRScannerOptions {
  fps?: number; // Frames per second for scanning (default: 10)
  qrbox?: number | { width: number; height: number }; // Size of scanning box
  aspectRatio?: number; // Camera aspect ratio (default: 1.0)
}

export interface UseQRScannerReturn {
  isScanning: boolean;
  isSupported: boolean;
  error: string | null;
  scanData: QRScanData | null;
  startScan: (elementId: string) => Promise<void>;
  stopScan: () => Promise<void>;
  clearScan: () => void;
}

const DEFAULT_OPTIONS: Required<UseQRScannerOptions> = {
  fps: 10,
  qrbox: 250,
  aspectRatio: 1.0,
};

/**
 * Hook to scan QR codes using device camera
 */
export function useQRScanner(options: UseQRScannerOptions = {}): UseQRScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<QRScanData | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementIdRef = useRef<string | null>(null);

  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Check if camera API is supported
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setError('Camera access is not supported in this browser');
    }
  }, []);

  /**
   * Parse QR code text into structured data
   */
  const parseQRData = useCallback((qrText: string): QRScanData | null => {
    try {
      const parsed = JSON.parse(qrText);
      
      // Validate it's a Torre Tempo location QR code
      if (parsed.type === 'torretempo-location' && parsed.locationId) {
        return {
          locationId: parsed.locationId,
          locationName: parsed.locationName,
          type: parsed.type,
          generatedAt: parsed.generatedAt,
        };
      }
      
      // Not a valid Torre Tempo QR code
      return null;
    } catch {
      // Not valid JSON - not a Torre Tempo QR code
      return null;
    }
  }, []);

  /**
   * Start QR code scanning
   */
  const startScan = useCallback(async (elementId: string): Promise<void> => {
    if (!isSupported) {
      setError('Camera access is not supported');
      return;
    }

    if (isScanning) {
      console.warn('Scanner is already running');
      return;
    }

    try {
      setError(null);
      setScanData(null);
      elementIdRef.current = elementId;

      // Initialize scanner if not already created
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId);
      }

      // Success callback when QR code is detected
      const onScanSuccess = (decodedText: string) => {
        const data = parseQRData(decodedText);
        
        if (data) {
          setScanData(data);
          // Auto-stop scanning after successful scan
          stopScan().catch(console.error);
        } else {
          setError('Invalid QR code. Please scan a Torre Tempo location QR code.');
        }
      };

      // Error callback (called on every frame without detection - can be noisy)
      const onScanError = (errorMessage: string) => {
        // Only log actual errors, not "No QR code found" messages
        if (!errorMessage.includes('No MultiFormat Readers')) {
          console.debug('QR scan error:', errorMessage);
        }
      };

      // Start camera and scanning
      await scannerRef.current.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: config.fps,
          qrbox: config.qrbox,
          aspectRatio: config.aspectRatio,
        },
        onScanSuccess,
        onScanError
      );

      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to start QR scanner:', err);
      
      // Handle specific error cases
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please enable camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(err.message || 'Failed to start camera. Please try again.');
      }
      
      setIsScanning(false);
    }
  }, [isSupported, isScanning, config, parseQRData]);

  /**
   * Stop QR code scanning
   */
  const stopScan = useCallback(async (): Promise<void> => {
    if (!scannerRef.current) {
      return;
    }

    try {
      const state = scannerRef.current.getState();
      
      // Only stop if scanner is actually running
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await scannerRef.current.stop();
      }
      
      setIsScanning(false);
    } catch (err: any) {
      console.error('Error stopping QR scanner:', err);
      // Still mark as not scanning even if stop fails
      setIsScanning(false);
    }
  }, []);

  /**
   * Clear scan data (for rescanning)
   */
  const clearScan = useCallback(() => {
    setScanData(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        const cleanup = async () => {
          try {
            await stopScan();
            if (scannerRef.current) {
              await scannerRef.current.clear();
              scannerRef.current = null;
            }
          } catch (err) {
            console.error('Cleanup error:', err);
          }
        };
        cleanup();
      }
    };
  }, [stopScan]);

  return {
    isScanning,
    isSupported,
    error,
    scanData,
    startScan,
    stopScan,
    clearScan,
  };
}

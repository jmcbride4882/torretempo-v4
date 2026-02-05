/**
 * useNFC Hook
 * Provides NFC reading capabilities using Web NFC API
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
 */

import { useState, useCallback, useEffect } from 'react';

export interface NFCData {
  serialNumber: string;
  message?: string;
  timestamp: number;
}

export interface UseNFCReturn {
  isScanning: boolean;
  isSupported: boolean;
  error: string | null;
  lastScan: NFCData | null;
  startScan: () => Promise<void>;
  stopScan: () => void;
}

export function useNFC(): UseNFCReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<NFCData | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Check NFC support on mount
  useEffect(() => {
    if ('NDEFReader' in window) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setError('NFC is not supported on this device or browser');
    }
  }, []);

  const startScan = useCallback(async () => {
    if (!isSupported) {
      setError('NFC is not supported');
      return;
    }

    if (isScanning) {
      return; // Already scanning
    }

    try {
      setError(null);
      setIsScanning(true);

      // Create new AbortController for this scan session
      const controller = new AbortController();
      setAbortController(controller);

      // @ts-ignore - NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader();

      // Request permission and start scanning
      await ndef.scan({ signal: controller.signal });

      // Listen for NFC tags
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        console.log('NFC tag detected:', serialNumber);

        // Extract text from NDEF message if available
        let text: string | undefined;
        if (message?.records?.length > 0) {
          const textRecord = message.records.find((record: any) => record.recordType === 'text');
          if (textRecord) {
            const textDecoder = new TextDecoder(textRecord.encoding || 'utf-8');
            text = textDecoder.decode(textRecord.data);
          }
        }

        setLastScan({
          serialNumber,
          message: text,
          timestamp: Date.now(),
        });

        setIsScanning(false);
      });

      ndef.addEventListener('readingerror', () => {
        setError('Failed to read NFC tag');
        setIsScanning(false);
      });
    } catch (err: any) {
      console.error('NFC scan error:', err);
      
      if (err.name === 'AbortError') {
        setError(null); // User cancelled, not an error
      } else if (err.name === 'NotAllowedError') {
        setError('NFC permission denied. Please allow NFC access in your browser settings.');
      } else if (err.name === 'NotSupportedError') {
        setError('NFC is not supported on this device');
      } else {
        setError(err.message || 'Failed to start NFC scan');
      }
      
      setIsScanning(false);
    }
  }, [isSupported, isScanning]);

  const stopScan = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsScanning(false);
  }, [abortController]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  return {
    isScanning,
    isSupported,
    error,
    lastScan,
    startScan,
    stopScan,
  };
}

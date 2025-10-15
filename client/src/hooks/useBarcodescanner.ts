import { useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function useBarcodeScanner({ onScan, onError }: UseBarcodeScannerOptions) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializedRef = useRef(false);

  const startScanning = useCallback(async (elementId: string) => {
    if (isInitializedRef.current && scannerRef.current) {
      return; // Already scanning
    }

    try {
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;
      isInitializedRef.current = true;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // Silent error for continuous scanning attempts
        }
      );
    } catch (err: any) {
      console.error("Scanner start error:", err);
      isInitializedRef.current = false;
      scannerRef.current = null;
      onError?.(err.message || "Failed to access camera. Please check permissions.");
    }
  }, [onScan, onError]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isInitializedRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        isInitializedRef.current = false;
      } catch (err) {
        console.error("Error stopping scanner:", err);
        // Force cleanup even if stop fails
        scannerRef.current = null;
        isInitializedRef.current = false;
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    startScanning,
    stopScanning,
  };
}

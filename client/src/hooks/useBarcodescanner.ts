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
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to start barcode scanner.";
      
      if (err?.message) {
        const errorString = err.message.toLowerCase();
        
        if (errorString.includes("permission") || errorString.includes("denied")) {
          errorMessage = "Camera permission denied. Please allow camera access in your browser settings to scan barcodes.";
        } else if (errorString.includes("not found") || errorString.includes("no camera")) {
          errorMessage = "No camera found. Please ensure your device has a working camera.";
        } else if (errorString.includes("secure") || errorString.includes("https")) {
          errorMessage = "Camera access requires a secure connection (HTTPS). Please use a secure URL.";
        } else if (errorString.includes("busy") || errorString.includes("in use")) {
          errorMessage = "Camera is already in use by another application. Please close other apps using the camera.";
        } else if (errorString.includes("constraint") || errorString.includes("facing mode")) {
          errorMessage = "Unable to access rear camera. Switching to front camera or trying again may help.";
        } else {
          // Use the original error message if it's descriptive enough
          errorMessage = err.message;
        }
      }
      
      if (onError && typeof onError === 'function') {
        onError(errorMessage);
      }
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

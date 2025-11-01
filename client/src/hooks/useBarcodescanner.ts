/**
 * useBarcodeScanner Hook
 *
 * Barcode/QR code scanning using device camera + html5-qrcode library.
 * Designed for ingredient lookup and product identification.
 *
 * Returns:
 * - startScanning: Function to activate camera and begin scanning
 * - stopScanning: Function to deactivate camera and cleanup
 *
 * Options:
 * - onScan: Callback when barcode is successfully decoded (receives barcode string)
 * - onError: Optional callback for scanner errors (camera access, initialization)
 *
 * Flow:
 * 1. Component calls startScanning(elementId)
 * 2. Hook dynamically imports html5-qrcode library (code splitting)
 * 3. Request camera permission from browser
 * 4. Initialize Html5Qrcode scanner on specified DOM element
 * 5. Start continuous scanning with environment-facing camera
 * 6. When barcode detected → call onScan callback with decoded text
 * 7. Component can process barcode (e.g., call API for product lookup)
 * 8. On unmount or stopScanning → cleanup camera and scanner
 *
 * Technical Details:
 * - Library: html5-qrcode (dynamic import for code splitting)
 * - Camera Selection: { facingMode: "environment" } (back camera on mobile)
 * - Scan Rate: 10 FPS (frames per second)
 * - Scan Region: 250x250px box overlay
 * - Continuous Mode: Scans continuously until stopped
 * - Error Suppression: Silent errors during scanning attempts (avoids spam)
 *
 * Supported Formats:
 * - QR Code
 * - UPC-A, UPC-E (product barcodes)
 * - EAN-8, EAN-13 (international product codes)
 * - Code 128, Code 39, Code 93
 * - ITF, Codabar
 * - All formats supported by html5-qrcode
 *
 * Error Handling:
 * - Camera permission denied → onError callback with descriptive message
 * - No camera available → onError callback
 * - Scanner initialization failure → automatic cleanup and error callback
 * - Scanner already running → gracefully ignores duplicate start calls
 * - Stop failure → force cleanup to prevent resource leaks
 *
 * State Management:
 * - scannerRef: Reference to Html5Qrcode instance
 * - isInitializedRef: Prevents duplicate scanner initialization
 * - Cleanup: Automatically stops scanner on component unmount
 *
 * Camera Selection Logic:
 * - Mobile devices: Attempts to use back/environment camera
 * - Desktop: Uses first available camera
 * - Fallback: If environment camera unavailable, uses default camera
 *
 * Usage:
 * ```tsx
 * const [scannedCode, setScannedCode] = useState<string>('');
 * const [isScanning, setIsScanning] = useState(false);
 *
 * const { startScanning, stopScanning } = useBarcodeScanner({
 *   onScan: async (barcode) => {
 *     setScannedCode(barcode);
 *     setIsScanning(false);
 *     await stopScanning();
 *     
 *     // Look up product by barcode
 *     const product = await fetch(`/api/barcode/${barcode}`).then(r => r.json());
 *     // console.log('Product found:', product);
 *   },
 *   onError: (error) => {
 *     console.error('Scanner error:', error);
 *     setIsScanning(false);
 *   }
 * });
 *
 * const handleStartScan = () => {
 *   setIsScanning(true);
 *   startScanning('scanner-container');
 * };
 *
 * return (
 *   <div>
 *     {isScanning ? (
 *       <div>
 *         <div id="scanner-container" />
 *         <Button onClick={stopScanning}>Cancel</Button>
 *       </div>
 *     ) : (
 *       <Button onClick={handleStartScan}>Scan Barcode</Button>
 *     )}
 *     {scannedCode && <p>Scanned: {scannedCode}</p>}
 *   </div>
 * );
 * ```
 *
 * Performance:
 * - Dynamic import reduces initial bundle size
 * - Scanner only loaded when actually needed
 * - Automatic cleanup prevents memory leaks
 * - 10 FPS scan rate balances accuracy and performance
 *
 * Browser Compatibility:
 * - Chrome/Edge: Full support
 * - Safari: Requires HTTPS or localhost
 * - Firefox: Full support
 * - Mobile browsers: Full support (iOS Safari, Chrome Mobile)
 * - Requires: getUserMedia API support
 */

import { useRef, useCallback, useEffect } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function useBarcodeScanner({ onScan, onError }: UseBarcodeScannerOptions) {
  const scannerRef = useRef<any | null>(null); // Type resolved at runtime
  const isInitializedRef = useRef(false);

  const startScanning = useCallback(async (elementId: string) => {
    if (isInitializedRef.current && scannerRef.current) {
      return; // Already scanning
    }

    try {
      // Dynamically import Html5Qrcode when needed
      const { Html5Qrcode } = await import("html5-qrcode");
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
    } catch (err: Error | unknown) {
      console.error("Scanner start error:", err);
      isInitializedRef.current = false;
      scannerRef.current = null;
      onError?.(err instanceof Error ? err.message : "Failed to access camera. Please check permissions.");
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

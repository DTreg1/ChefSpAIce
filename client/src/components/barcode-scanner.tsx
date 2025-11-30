import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScanLine, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScanner({ onScanSuccess }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any | null>(null); // Type resolved at runtime
  const { toast } = useToast();

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          void stopScanning();
          onScanSuccess(decodedText);
          setIsOpen(false);
          toast({
            title: "Barcode scanned",
            description: `Successfully scanned: ${decodedText}`,
          });
        },
        (errorMessage) => {
          // Silent error for continuous scanning attempts
        }
      );

      setIsScanning(true);
    } catch (err: Error | unknown) {
      console.error("Scanner start error:", err);
      // Only try to clear if scanner was actually created
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (clearErr) {
          console.error("Error clearing scanner:", clearErr);
        }
        scannerRef.current = null;
      }
      toast({
        title: "Camera error",
        description:
          err instanceof Error ? err.message : "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsOpen(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTimeout(() => void startScanning(), 100);
    } else {
      void stopScanning();
    }
  };

  useEffect(() => {
    return () => {
      void stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        data-testid="button-scan-barcode"
      >
        <ScanLine className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md bg-muted">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Position the barcode within the camera view to scan
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <div
              id="barcode-reader"
              className="w-full min-h-[300px] rounded-md overflow-hidden bg-black"
              data-testid="barcode-reader"
            />
            {!!isScanning && (
              <div className="absolute top-2 right-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-scanner"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {!isScanning && (
            <p className="text-sm text-muted-foreground text-center">
              Initializing camera...
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

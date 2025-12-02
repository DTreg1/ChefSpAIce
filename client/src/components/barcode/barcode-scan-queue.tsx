import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLine, X, Plus, Trash2, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

interface ScannedItem {
  barcode: string;
  scannedAt: Date;
  imageUrl?: string;
  title?: string;
  brand?: string;
  isEnriching: boolean;
}

interface BarcodeScanQueueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitQueue: (items: ScannedItem[]) => void;
}

export function BarcodeScanQueue({
  open,
  onOpenChange,
  onSubmitQueue,
}: BarcodeScanQueueProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const scannerRef = useRef<any | null>(null);
  const { toast } = useToast();

  const enrichBarcode = async (barcode: string, index: number) => {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.barcode.search}/${barcode}`,
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setScannedItems((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  imageUrl: data.images?.[0],
                  title: data.title,
                  brand: data.brand || data.manufacturer,
                  isEnriching: false,
                }
              : item,
          ),
        );
      } else {
        setScannedItems((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, isEnriching: false } : item,
          ),
        );
      }
    } catch (error) {
      console.error("Enrichment error:", error);
      setScannedItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, isEnriching: false } : item,
        ),
      );
    }
  };

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("barcode-queue-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setScannedItems((prev) => {
            if (prev.some((item) => item.barcode === decodedText)) {
              toast({
                title: "Duplicate barcode",
                description: "This item is already in the queue",
                variant: "default",
              });
              return prev;
            }

            const newItem: ScannedItem = {
              barcode: decodedText,
              scannedAt: new Date(),
              isEnriching: true,
            };

            const newIndex = prev.length;
            enrichBarcode(decodedText, newIndex);

            toast({
              title: "Item scanned",
              description: `Added ${decodedText} to queue`,
            });

            return [...prev, newItem];
          });
        },
        () => {
          // Silent error for continuous scanning
        },
      );

      setIsScanning(true);
    } catch (err: Error | unknown) {
      console.error("Scanner start error:", err);
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
          err instanceof Error
            ? err.message
            : "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      stopScanning();
    }
    onOpenChange(newOpen);
  };

  const removeItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setScannedItems([]);
  };

  const handleSubmit = () => {
    if (scannedItems.length === 0) {
      toast({
        title: "Queue empty",
        description: "Scan some items before submitting",
        variant: "default",
      });
      return;
    }

    onSubmitQueue(scannedItems);
    setScannedItems([]);
    stopScanning();
    onOpenChange(false);
  };

  useEffect(() => {
    if (open && !isScanning) {
      setTimeout(() => startScanning(), 100);
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Rapid Barcode Scan
            <Badge variant="secondary" className="ml-auto">
              {scannedItems.length} items
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Point your camera at barcodes to add items to the queue. Each scan
            will be saved for batch submission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          <div className="flex-1 flex flex-col gap-4">
            <div
              id="barcode-queue-reader"
              className="w-full aspect-video bg-background border border-border rounded-lg overflow-hidden"
              data-testid="barcode-scanner-camera"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={scannedItems.length === 0}
                className="flex-1"
                data-testid="button-submit-queue"
              >
                <Package className="h-4 w-4 mr-2" />
                Add {scannedItems.length} to Inventory
              </Button>
              <Button
                onClick={clearQueue}
                variant="outline"
                disabled={scannedItems.length === 0}
                data-testid="button-clear-queue"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          <div className="w-80 border-l border-border pl-4 overflow-y-auto">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Scanned Items Queue
              </div>

              {scannedItems.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Queue is empty
                    <br />
                    Start scanning items
                  </CardContent>
                </Card>
              )}

              {scannedItems.map((item, index) => (
                <Card
                  key={`${item.barcode}-${index}`}
                  className="relative"
                  data-testid={`queue-item-${index}`}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.isEnriching ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title || item.barcode}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.title || item.barcode}
                        </div>
                        {item.brand && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.brand}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.barcode}
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        className="flex-shrink-0"
                        data-testid={`button-remove-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  ScanLine,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";

export default function CameraTest() {
  const { toast } = useToast();
  const [cameraPermission, setCameraPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [isHttps, setIsHttps] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<string>("");
  const [cameraList, setCameraList] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Check HTTPS
    setIsHttps(window.location.protocol === "https:");

    // Get browser info
    setBrowserInfo(navigator.userAgent);

    // Auto-check camera permission on load
    checkCameraPermission();

    // Cleanup on unmount
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const addError = (error: string) => {
    setErrors((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${error}`,
    ]);
  };

  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      setCameraPermission(result.state as "granted" | "denied");
      addError(`Permission state: ${result.state}`);
    } catch (err: any) {
      addError(`Permission check failed: ${err.message}`);
      // Fallback: try to access camera directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setCameraPermission("granted");
        addError("Camera access granted (fallback check)");
      } catch (mediaErr: any) {
        setCameraPermission("denied");
        addError(`Camera access denied: ${mediaErr.message}`);
      }
    }
  };

  const getCameraList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          id: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 8)}...`,
        }));
      setCameraList(cameras);
      addError(`Found ${cameras.length} camera(s)`);
    } catch (err: any) {
      addError(`Failed to enumerate devices: ${err.message}`);
    }
  };

  const testBasicCamera = async () => {
    try {
      // Stop any existing stream
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoStream(stream);
        addError("Camera stream started successfully");
      }
    } catch (err: any) {
      addError(`Camera stream failed: ${err.message}`);
      toast({
        title: "Camera Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const stopBasicCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      addError("Camera stream stopped");
    }
  };

  const startBarcodeScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader-test");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setScanResult(decodedText);
          addError(`Scanned: ${decodedText}`);
          toast({
            title: "Barcode Scanned!",
            description: decodedText,
          });
        },
        () => {
          // Silent error for continuous scanning
        },
      );

      setIsScanning(true);
      addError("Barcode scanner started");
    } catch (err: any) {
      addError(`Scanner start error: ${err.message}`);
      toast({
        title: "Scanner Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const stopBarcodeScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
        addError("Barcode scanner stopped");
      } catch (err: any) {
        addError(`Scanner stop error: ${err.message}`);
      }
    }
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Camera & Barcode Scanner Test
        </h1>
        <p className="text-muted-foreground">
          Diagnostic page to troubleshoot camera and barcode scanning issues
        </p>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">HTTPS:</span>
            {isHttps ? (
              <Badge className="gap-1">
                <CheckCircle className="w-3 h-3" /> Enabled
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> Disabled (Required!)
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Camera Permission:</span>
              {cameraPermission === "granted" && (
                <Badge className="gap-1">
                  <CheckCircle className="w-3 h-3" /> Granted
                </Badge>
              )}
              {cameraPermission === "denied" && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="w-3 h-3" /> Denied
                </Badge>
              )}
              {cameraPermission === "unknown" && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="w-3 h-3" /> Unknown
                </Badge>
              )}
            </div>
            {cameraPermission === "unknown" && (
              <p className="text-xs text-muted-foreground">
                Note: "Unknown" is normal after page refresh. The browser still
                remembers your permission - the API just hasn't checked yet. The
                camera will work without asking again.
              </p>
            )}
          </div>
          <div>
            <span className="font-medium">Browser:</span>
            <p className="text-sm text-muted-foreground mt-1 break-all">
              {browserInfo}
            </p>
          </div>
          <div>
            <span className="font-medium">Available Cameras:</span>
            {cameraList.length > 0 ? (
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                {cameraList.map((camera, idx) => (
                  <li key={camera.id}>
                    {idx + 1}. {camera.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Click "Get Camera List" to enumerate
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Tests</CardTitle>
          <CardDescription>
            Run these tests to identify camera issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={checkCameraPermission}
              data-testid="button-check-permission"
            >
              Check Permission
            </Button>
            <Button onClick={getCameraList} data-testid="button-get-cameras">
              Get Camera List
            </Button>
            <Button
              onClick={videoStream ? stopBasicCamera : testBasicCamera}
              variant={videoStream ? "destructive" : "default"}
              data-testid="button-test-camera"
            >
              <Camera className="w-4 h-4 mr-2" />
              {videoStream ? "Stop Camera" : "Test Camera"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Camera Test */}
      {videoStream && (
        <Card>
          <CardHeader>
            <CardTitle>Camera Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-md bg-black"
              data-testid="video-preview"
            />
          </CardContent>
        </Card>
      )}

      {/* Barcode Scanner Test */}
      <Card>
        <CardHeader>
          <CardTitle>Barcode Scanner Test</CardTitle>
          <CardDescription>Test html5-qrcode barcode scanning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={isScanning ? stopBarcodeScanner : startBarcodeScanner}
            variant={isScanning ? "destructive" : "default"}
            data-testid="button-test-scanner"
          >
            <ScanLine className="w-4 h-4 mr-2" />
            {isScanning ? "Stop Scanner" : "Start Scanner"}
          </Button>

          <div
            id="qr-reader-test"
            className="w-full"
            data-testid="qr-reader-test"
          />

          {scanResult && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
              <p className="font-medium text-green-600 dark:text-green-400">
                Last Scan Result:
              </p>
              <p className="text-sm mt-1 break-all">{scanResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Diagnostic Log</CardTitle>
            <CardDescription>
              Real-time error and status messages
            </CardDescription>
          </div>
          <Button onClick={clearErrors} variant="outline" size="sm">
            Clear Log
          </Button>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Run tests above to see diagnostics.
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
              {errors.map((error, idx) => (
                <div key={idx} className="p-2 bg-muted rounded">
                  {error}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
            <div>
              <p className="font-medium">HTTPS Required</p>
              <p className="text-muted-foreground">
                Camera access requires HTTPS on most browsers. HTTP only works
                on localhost.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
            <div>
              <p className="font-medium">Permission Denied</p>
              <p className="text-muted-foreground">
                Check browser settings and site permissions. On iOS, check
                Settings → Safari → Camera.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
            <div>
              <p className="font-medium">Safari iOS Issues</p>
              <p className="text-muted-foreground">
                Safari on iOS can be restrictive. Try Chrome or Firefox on iOS,
                or test in a different browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

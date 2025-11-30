import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, CheckCircle, XCircle, AlertCircle, ScanLine, Package, Loader2, Image, ShoppingCart } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

// Common test barcodes for groceries and household items
const COMMON_TEST_BARCODES = {
  single: [
    { code: '07827404', name: 'Sunkist Orange Soda (Your can!)' },
    { code: '049000028904', name: 'Coca-Cola Classic 12oz' },
    { code: '036000291452', name: 'Honey Nut Cheerios' },
    { code: '041380000000', name: 'Lay\'s Classic Potato Chips' },
    { code: '070470003078', name: 'Oreo Cookies' },
    { code: '041000326165', name: 'Dove Beauty Bar Soap' },
  ],
  batch: [
    { code: '07827404', name: 'Sunkist Orange Soda' },
    { code: '049000028904', name: 'Coca-Cola Classic 12oz' },
    { code: '036000291452', name: 'Honey Nut Cheerios' },
    { code: '041380000000', name: 'Lay\'s Classic Potato Chips' },
    { code: '070470003078', name: 'Oreo Cookies' },
    { code: '041000326165', name: 'Dove Beauty Bar Soap' },
    { code: '038100361006', name: 'Kellogg\'s Corn Flakes' },
    { code: '014100072331', name: 'Pepsi Cola 12oz Can' },
    { code: '030000064405', name: 'Quaker Instant Oatmeal' },
    { code: '041318110029', name: 'Campbell\'s Tomato Soup' },
  ]
};

export default function CameraTest() {
  const { toast } = useToast();
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isHttps, setIsHttps] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<string>('');
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // API test state
  const [singleBarcode, setSingleBarcode] = useState<string>('');
  const [singleApiLoading, setSingleApiLoading] = useState(false);
  const [singleApiResult, setSingleApiResult] = useState<any>(null);
  const [batchApiLoading, setBatchApiLoading] = useState(false);
  const [batchApiResult, setBatchApiResult] = useState<any>(null);

  useEffect(() => {
    // Check HTTPS
    setIsHttps(window.location.protocol === 'https:');
    
    // Get browser info
    setBrowserInfo(navigator.userAgent);

    // Cleanup on unmount
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  useEffect(() => {
    // Auto-check camera permission on load
    checkCameraPermission();
  }, []);

  const addError = (error: string) => {
    setErrors(prev => [...prev, `${new Date().toLocaleTimeString()}: ${error}`]);
  };

  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(result.state as 'granted' | 'denied');
      addError(`Permission state: ${result.state}`);
    } catch (err: unknown) {
      addError(`Permission check failed: ${err instanceof Error ? err.message : String(err)}`);
      // Fallback: try to access camera directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setCameraPermission('granted');
        addError('Camera access granted (fallback check)');
      } catch (mediaErr: unknown) {
        setCameraPermission('denied');
        addError(`Camera access denied: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`);
      }
    }
  };

  const getCameraList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 8)}...`
        }));
      setCameraList(cameras);
      addError(`Found ${cameras.length} camera(s)`);
    } catch (err: unknown) {
      addError(`Failed to enumerate devices: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const testBasicCamera = async () => {
    try {
      // Stop any existing stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoStream(stream);
        addError('Camera stream started successfully');
      }
    } catch (err: unknown) {
      addError(`Camera stream failed: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Camera Error",
        description: (err instanceof Error ? err.message : String(err)),
        variant: "destructive"
      });
    }
  };

  const stopBasicCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      addError('Camera stream stopped');
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
            description: decodedText
          });
        },
        () => {
          // Silent error for continuous scanning
        }
      );

      setIsScanning(true);
      addError('Barcode scanner started');
    } catch (err: unknown) {
      addError(`Scanner start error: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Scanner Error",
        description: (err instanceof Error ? err.message : String(err)),
        variant: "destructive"
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
        addError('Barcode scanner stopped');
      } catch (err: unknown) {
        addError(`Scanner stop error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const clearErrors = () => {
    setErrors([]);
  };

  // API Test Functions
  const testSingleBarcode = async (barcode: string) => {
    setSingleApiLoading(true);
    setSingleApiResult(null);
    addError(`Testing single barcode API call for: ${barcode}`);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.barcode.search}/product/${barcode}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      setSingleApiResult(data);
      addError(`Single API call successful: ${data.name || 'Product found'}`);
      toast({
        title: "API Call Successful",
        description: `Found: ${data.name || 'Unknown Product'}`,
      });
    } catch (error: Error | unknown) {
      const errorMsg = (error instanceof Error ? error.message : String(error)) || 'Unknown error';
      addError(`Single API call failed: ${errorMsg}`);
      toast({
        title: "API Call Failed",
        description: errorMsg,
        variant: "destructive"
      });
      setSingleApiResult({ error: errorMsg });
    } finally {
      setSingleApiLoading(false);
    }
  };

  const testBatchBarcodes = async () => {
    setBatchApiLoading(true);
    setBatchApiResult(null);
    const barcodesToTest = COMMON_TEST_BARCODES.batch.slice(0, 10).map(b => b.code);
    addError(`Testing batch API call with ${barcodesToTest.length} barcodes`);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.barcode.search}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcodes: barcodesToTest })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      setBatchApiResult(data);
      addError(`Batch API call successful: Found ${data.count} of ${data.requested} products`);
      toast({
        title: "Batch API Call Successful",
        description: `Found ${data.count} products. Saved ${data.apiCallsSaved} API calls!`,
      });
    } catch (error: Error | unknown) {
      const errorMsg = (error instanceof Error ? error.message : String(error)) || 'Unknown error';
      addError(`Batch API call failed: ${errorMsg}`);
      toast({
        title: "Batch API Call Failed",
        description: errorMsg,
        variant: "destructive"
      });
      setBatchApiResult({ error: errorMsg });
    } finally {
      setBatchApiLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Camera & Barcode Scanner Test</h1>
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
              <Badge className="gap-1"><CheckCircle className="w-3 h-3" /> Enabled</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Disabled (Required!)</Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Camera Permission:</span>
              {cameraPermission === 'granted' && (
                <Badge className="gap-1"><CheckCircle className="w-3 h-3" /> Granted</Badge>
              )}
              {cameraPermission === 'denied' && (
                <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Denied</Badge>
              )}
              {cameraPermission === 'unknown' && (
                <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" /> Unknown</Badge>
              )}
            </div>
            {cameraPermission === 'unknown' && (
              <p className="text-xs text-muted-foreground">
                Note: "Unknown" is normal after page refresh. The browser still remembers your permission - the API just hasn't checked yet. The camera will work without asking again.
              </p>
            )}
          </div>
          <div>
            <span className="font-medium">Browser:</span>
            <p className="text-sm text-muted-foreground mt-1 break-all">{browserInfo}</p>
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
              <p className="text-sm text-muted-foreground mt-1">Click "Get Camera List" to enumerate</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Tests</CardTitle>
          <CardDescription>Run these tests to identify camera issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={checkCameraPermission} data-testid="button-check-permission">
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

          <div id="qr-reader-test" className="w-full" data-testid="qr-reader-test" />

          {scanResult && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
              <p className="font-medium text-green-600 dark:text-green-400">Last Scan Result:</p>
              <p className="text-sm mt-1 break-all">{scanResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Barcode API Test */}
      <Card>
        <CardHeader>
          <CardTitle>Single Barcode API Test</CardTitle>
          <CardDescription>Test individual barcode lookups using common product barcodes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="single-barcode">Enter or select a barcode</Label>
            <div className="flex gap-2">
              <Input
                id="single-barcode"
                placeholder="e.g., 049000028904"
                value={singleBarcode}
                onChange={(e) => setSingleBarcode(e.target.value)}
                data-testid="input-single-barcode"
              />
              <Button
                onClick={() => testSingleBarcode(singleBarcode)}
                disabled={!singleBarcode || singleApiLoading}
                data-testid="button-test-single"
              >
                {singleApiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Test API
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick test products:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_TEST_BARCODES.single.map((item) => (
                <Button
                  key={item.code}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSingleBarcode(item.code);
                    testSingleBarcode(item.code);
                  }}
                  disabled={singleApiLoading}
                  data-testid={`button-quick-${item.code}`}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </div>

          {singleApiResult && (
            <div className={`p-3 rounded-md border ${singleApiResult.error ? 'border-red-500/20 bg-red-500/10' : 'border-green-500/20 bg-green-500/10'}`}>
              {singleApiResult.error ? (
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">Error:</p>
                  <p className="text-sm mt-1">{singleApiResult.error}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-green-600 dark:text-green-400">Product Found!</p>
                    <div className="flex items-center gap-2">
                      {singleApiResult.cached && (
                        <Badge variant="outline" className="text-blue-600">
                          Cached
                        </Badge>
                      )}
                      {singleApiResult.source && (
                        <Badge variant={singleApiResult.source === 'barcode_lookup' ? 'default' : 'secondary'}>
                          {singleApiResult.source === 'barcode_lookup' ? 'Barcode Lookup' : 'Open Food Facts'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {singleApiResult.name}</p>
                    <p><strong>Brand:</strong> {singleApiResult.brand || 'N/A'}</p>
                    <p><strong>Code:</strong> {singleApiResult.code}</p>
                    {singleApiResult.imageUrl && (
                      <div>
                        <p><strong>Image URL:</strong></p>
                        <a href={singleApiResult.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                          {singleApiResult.imageUrl.substring(0, 100)}...
                        </a>
                        <div className="mt-2 p-2 bg-background rounded">
                          <img 
                            src={singleApiResult.imageUrl} 
                            alt={singleApiResult.name}
                            className="max-w-[200px] max-h-[200px] object-contain mx-auto"
                          />
                        </div>
                      </div>
                    )}
                    {singleApiResult.description && (
                      <p className="text-xs"><strong>Description:</strong> {singleApiResult.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Barcode API Test */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Barcode API Test (10 Items)</CardTitle>
          <CardDescription>Test the efficiency of batch barcode lookups - get 10 products in 1 API call!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-sm">
              <strong>Efficiency Gain:</strong> Querying 10 barcodes individually = 10 API calls. 
              With batch API = 1 call. <strong>That's 90% fewer API calls!</strong>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Products to test (10 common items):</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {COMMON_TEST_BARCODES.batch.map((item, idx) => (
                <div key={item.code} className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{idx + 1}</Badge>
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={testBatchBarcodes}
            disabled={batchApiLoading}
            className="w-full"
            data-testid="button-test-batch"
          >
            {batchApiLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Batch API...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Test Batch API (10 Products)
              </>
            )}
          </Button>

          {batchApiResult && (
            <div className={`p-3 rounded-md border ${batchApiResult.error ? 'border-red-500/20 bg-red-500/10' : 'border-green-500/20 bg-green-500/10'}`}>
              {batchApiResult.error ? (
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">Error:</p>
                  <p className="text-sm mt-1">{batchApiResult.error}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-green-600 dark:text-green-400">Batch Result</p>
                    <Badge className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Saved {batchApiResult.apiCallsSaved} API calls!
                    </Badge>
                  </div>
                  
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Products Requested:</span>
                      <strong>{batchApiResult.requested}</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Products Found:</span>
                      <strong>{batchApiResult.count}</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>API Calls Used:</span>
                      <strong>1</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-green-500/10 rounded">
                      <span>API Calls Saved:</span>
                      <strong className="text-green-600 dark:text-green-400">{batchApiResult.apiCallsSaved}</strong>
                    </div>
                  </div>

                  {batchApiResult.sources && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Sources:</span>
                      <Badge>{batchApiResult.sources.barcode_lookup} from Barcode Lookup</Badge>
                      <Badge variant="secondary">{batchApiResult.sources.openfoodfacts} from Open Food Facts</Badge>
                    </div>
                  )}

                  {batchApiResult.cacheInfo && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-blue-500/10 rounded">
                      <span className="font-medium">Cache Performance:</span>
                      <Badge variant="outline" className="text-blue-600">
                        {batchApiResult.cacheInfo.hits} hits
                      </Badge>
                      <Badge variant="outline" className="text-orange-600">
                        {batchApiResult.cacheInfo.misses} misses
                      </Badge>
                      {batchApiResult.cacheInfo.apiCallsSaved > 0 && (
                        <Badge variant="outline" className="text-green-600">
                          {batchApiResult.cacheInfo.apiCallsSaved} API call saved!
                        </Badge>
                      )}
                    </div>
                  )}

                  {batchApiResult.products && batchApiResult.products.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Found Products:</p>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {batchApiResult.products.map((product: any, idx: number) => (
                          <div key={idx} className="p-2 bg-muted rounded text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                              <strong className="truncate">{product.name}</strong>
                            </div>
                            <div className="pl-8 grid grid-cols-2 gap-x-4 text-muted-foreground">
                              <span>Brand: {product.brand || 'N/A'}</span>
                              <span>Code: {product.code}</span>
                            </div>
                            <div className="pl-8 flex items-center gap-2">
                              {product.imageUrl && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Image className="w-3 h-3" />
                                  <span>Has image</span>
                                </div>
                              )}
                              {product.cached && (
                                <Badge variant="outline" className="text-xs text-blue-600">
                                  Cached
                                </Badge>
                              )}
                              {product.source && (
                                <Badge variant={product.source === 'barcode_lookup' ? 'outline' : 'secondary'} className="text-xs">
                                  {product.source === 'barcode_lookup' ? 'BL' : 'OFF'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Diagnostic Log</CardTitle>
            <CardDescription>Real-time error and status messages</CardDescription>
          </div>
          <Button onClick={clearErrors} variant="outline" size="sm">
            Clear Log
          </Button>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Run tests above to see diagnostics.</p>
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
              <p className="text-muted-foreground">Camera access requires HTTPS on most browsers. HTTP only works on localhost.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
            <div>
              <p className="font-medium">Permission Denied</p>
              <p className="text-muted-foreground">Check browser settings and site permissions. On iOS, check Settings → Safari → Camera.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
            <div>
              <p className="font-medium">Safari iOS Issues</p>
              <p className="text-muted-foreground">Safari on iOS can be restrictive. Try Chrome or Firefox on iOS, or test in a different browser.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

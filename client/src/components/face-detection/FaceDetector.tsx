/**
 * FaceDetector Component
 * 
 * Main component for face detection functionality.
 * Displays uploaded images with face bounding boxes and detection results.
 */

import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, AlertCircle, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface FaceDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  probability: number;
  landmarks?: any[];
}

interface DetectionResponse {
  success: boolean;
  detectionId: string;
  faceCount: number;
  detections: FaceDetection[];
}

export function FaceDetector() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [detections, setDetections] = useState<FaceDetection[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Mutation for detecting faces
  const detectFacesMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/faces/detect', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to detect faces');
      }
      
      return response.json() as Promise<DetectionResponse>;
    },
    onSuccess: (data) => {
      setDetections(data.detections);
      toast({
        title: 'Face Detection Complete',
        description: `Detected ${data.faceCount} face${data.faceCount !== 1 ? 's' : ''} in the image`,
      });
      drawBoundingBoxes();
    },
    onError: (error: any) => {
      toast({
        title: 'Detection Failed',
        description: error.message || 'Failed to detect faces',
        variant: 'destructive',
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setImageLoaded(false);
        setDetections([]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Draw bounding boxes on canvas
  const drawBoundingBoxes = () => {
    if (!imageRef.current || !canvasRef.current || detections.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    // Set canvas dimensions to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes for each face
    detections.forEach((face, index) => {
      const { x, y, width, height } = face.boundingBox;
      
      // Draw rectangle
      ctx.strokeStyle = '#10b981'; // Green color
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw face number label
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x, y - 25, 80, 25);
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Face ${index + 1}`, x + 5, y - 7);

      // Draw confidence score
      const confidence = (face.probability * 100).toFixed(1);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x, y + height, 100, 20);
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${confidence}% conf`, x + 5, y + height + 15);
    });
  };

  // Redraw bounding boxes when image loads or detections change
  useEffect(() => {
    if (imageLoaded && detections.length > 0) {
      drawBoundingBoxes();
    }
  }, [imageLoaded, detections]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    if (detections.length > 0) {
      drawBoundingBoxes();
    }
  };

  // Trigger detection when image is selected
  const handleDetectFaces = () => {
    if (imageFile) {
      detectFacesMutation.mutate(imageFile);
    }
  };

  return (
    <Card className="w-full max-w-4xl" data-testid="card-face-detector">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Face Detection
        </CardTitle>
        <CardDescription>
          Upload an image to detect faces using TensorFlow.js BlazeFace model
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1"
            data-testid="button-upload"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose Image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file"
          />
          {imageFile && (
            <Button
              onClick={handleDetectFaces}
              disabled={detectFacesMutation.isPending}
              data-testid="button-detect"
            >
              {detectFacesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Detect Faces
                </>
              )}
            </Button>
          )}
        </div>

        {/* Image Display Section */}
        {selectedImage && (
          <div className="relative">
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Selected"
              onLoad={handleImageLoad}
              className="w-full rounded-lg shadow-lg"
              data-testid="img-selected"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ maxWidth: '100%', height: 'auto' }}
              data-testid="canvas-overlay"
            />
          </div>
        )}

        {/* Detection Results */}
        {detections.length > 0 && (
          <Alert data-testid="alert-results">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{detections.length} face{detections.length !== 1 ? 's' : ''} detected</strong>
              <div className="mt-2 space-y-1 text-sm">
                {detections.map((face, index) => (
                  <div key={index} data-testid={`text-face-${index}`}>
                    Face {index + 1}: {(face.probability * 100).toFixed(1)}% confidence
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        {!selectedImage && (
          <Alert data-testid="alert-instructions">
            <AlertDescription>
              <div className="space-y-2">
                <p>📸 Select an image to begin face detection</p>
                <p className="text-sm text-muted-foreground">
                  Supported formats: JPEG, PNG, WebP (max 10MB)
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
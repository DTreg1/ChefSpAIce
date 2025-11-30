/**
 * Face Detection Demo Page
 * 
 * Main page showcasing all face detection features including:
 * - Face detection with bounding boxes
 * - Privacy blur controls
 * - Face cropping for avatars
 * - Face counting
 */

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FaceDetector } from '@/components/face-detection/face-detector';
import { PrivacyBlur, AnonymizeToggle } from '@/components/face-detection/privacy-blur';
import { FaceCropper } from '@/components/face-detection/face-cropper';
import { FaceCounter } from '@/components/face-detection/face-counter';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FaceDetectionDemo() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [autoAnonymize, setAutoAnonymize] = useState(false);

  // Handle image upload from FaceDetector
  const handleImageUpload = (file: File, detectedFaces: number) => {
    setImageFile(file);
    setFaceCount(detectedFaces);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Face Detection Demo</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Advanced face detection powered by TensorFlow.js BlazeFace model
        </p>
      </div>

      {/* Welcome Alert */}
      <Alert className="mb-6" data-testid="alert-welcome">
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Welcome to the Face Detection Demo!</p>
            <p>This demo showcases advanced face detection capabilities including:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Real-time face detection with bounding boxes</li>
              <li>Privacy protection through face blurring</li>
              <li>Automatic avatar extraction from group photos</li>
              <li>Face counting for group photo analysis</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Auto-Anonymize Toggle */}
      <div className="mb-6">
        <AnonymizeToggle 
          enabled={autoAnonymize}
          onToggle={setAutoAnonymize}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="detect" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="detect" data-testid="tab-detect">
            Detect Faces
          </TabsTrigger>
          <TabsTrigger value="blur" data-testid="tab-blur">
            Privacy Blur
          </TabsTrigger>
          <TabsTrigger value="crop" data-testid="tab-crop">
            Crop Faces
          </TabsTrigger>
          <TabsTrigger value="count" data-testid="tab-count">
            Count Faces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detect" className="space-y-4">
          <FaceDetector />
        </TabsContent>

        <TabsContent value="blur" className="space-y-4">
          <PrivacyBlur 
            imageFile={imageFile}
            faceCount={faceCount}
          />
        </TabsContent>

        <TabsContent value="crop" className="space-y-4">
          <FaceCropper 
            imageFile={imageFile}
            faceCount={faceCount}
          />
        </TabsContent>

        <TabsContent value="count" className="space-y-4">
          <FaceCounter 
            imageFile={imageFile}
            onCountComplete={setFaceCount}
          />
        </TabsContent>
      </Tabs>

      {/* Features Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">🎯 Accurate Detection</h3>
          <p className="text-sm text-muted-foreground">
            BlazeFace model provides fast and accurate face detection
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">🔒 Privacy First</h3>
          <p className="text-sm text-muted-foreground">
            Automatic face blurring for privacy protection
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">✂️ Smart Cropping</h3>
          <p className="text-sm text-muted-foreground">
            Extract individual faces for avatar creation
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">📊 Group Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Count faces in group photos for attendance tracking
          </p>
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">Technical Details</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Model: TensorFlow.js BlazeFace</li>
          <li>• Supported formats: JPEG, PNG, WebP</li>
          <li>• Max file size: 10MB</li>
          <li>• Processing: Client-side and server-side</li>
          <li>• Privacy: Optional data retention control</li>
        </ul>
      </div>
    </div>
  );
}
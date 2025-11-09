/**
 * FaceCropper Component
 * 
 * Component for cropping individual faces from group photos.
 * Useful for extracting avatar images from group photos.
 */

import { useState } from 'react';
import { Crop, Download, UserSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface FaceCropperProps {
  imageFile: File | null;
  faceCount: number;
}

interface CroppedFace {
  index: number;
  imageUrl: string;
  width: number;
  height: number;
}

interface CropResponse {
  success: boolean;
  faceCount: number;
  croppedFaces: CroppedFace[];
}

export function FaceCropper({ imageFile, faceCount }: FaceCropperProps) {
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [padding, setPadding] = useState(20);
  const [croppedFaces, setCroppedFaces] = useState<CroppedFace[]>([]);
  const { toast } = useToast();

  // Mutation for cropping faces
  const cropFacesMutation = useMutation({
    mutationFn: async (faceIndex?: number) => {
      if (!imageFile) throw new Error('No image file provided');
      
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('padding', padding.toString());
      if (faceIndex !== undefined) {
        formData.append('faceIndex', faceIndex.toString());
      }
      
      return apiRequest('/api/faces/crop', 'POST', formData) as Promise<CropResponse>;
    },
    onSuccess: (data) => {
      setCroppedFaces(data.croppedFaces);
      toast({
        title: 'Faces Cropped Successfully',
        description: `Extracted ${data.faceCount} face${data.faceCount !== 1 ? 's' : ''} from the image`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Crop Failed',
        description: error.message || 'Failed to crop faces',
        variant: 'destructive',
      });
    },
  });

  // Crop specific face
  const handleCropFace = (faceIndex?: number) => {
    if (imageFile) {
      cropFacesMutation.mutate(faceIndex);
    }
  };

  // Download cropped face
  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `face-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full" data-testid="card-face-cropper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crop className="h-5 w-5" />
          Face Cropper
        </CardTitle>
        <CardDescription>
          Extract individual face images for avatars
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Padding Control */}
        <div className="space-y-2">
          <Label htmlFor="crop-padding">
            Crop Padding: {padding}px
          </Label>
          <Slider
            id="crop-padding"
            min={0}
            max={50}
            step={5}
            value={[padding]}
            onValueChange={(value) => setPadding(value[0])}
            className="w-full"
            data-testid="slider-padding"
          />
          <p className="text-sm text-muted-foreground">
            Add padding around faces for better framing
          </p>
        </div>

        {/* Face Selection */}
        {faceCount > 0 && (
          <div className="space-y-2">
            <Label>Select Face to Crop</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleCropFace()}
                disabled={!imageFile || cropFacesMutation.isPending}
                className="w-full"
                data-testid="button-crop-all"
              >
                <UserSquare className="mr-2 h-4 w-4" />
                Crop All Faces
              </Button>
              {Array.from({ length: faceCount }, (_, index) => (
                <Button
                  key={index}
                  variant={selectedFaceIndex === index ? "default" : "outline"}
                  onClick={() => {
                    setSelectedFaceIndex(index);
                    handleCropFace(index);
                  }}
                  disabled={!imageFile || cropFacesMutation.isPending}
                  data-testid={`button-crop-face-${index}`}
                >
                  Face {index + 1}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Crop Button */}
        {cropFacesMutation.isPending && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Processing...</span>
          </div>
        )}

        {/* Cropped Faces Grid */}
        {croppedFaces.length > 0 && (
          <div className="space-y-2">
            <Label>Cropped Faces</Label>
            <div className="grid grid-cols-3 gap-4">
              {croppedFaces.map((face, index) => (
                <div 
                  key={index} 
                  className="relative group"
                  data-testid={`div-cropped-face-${index}`}
                >
                  <img
                    src={face.imageUrl}
                    alt={`Face ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg shadow-md"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(face.imageUrl, index)}
                      data-testid={`button-download-${index}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-center text-sm mt-1">Face {index + 1}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!imageFile && (
          <div className="text-center py-8 text-muted-foreground">
            <UserSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select an image to begin cropping faces</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
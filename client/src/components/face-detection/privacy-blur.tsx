/**
 * PrivacyBlur Component
 * 
 * Component for blurring faces in images for privacy protection.
 * Allows users to select which faces to blur and adjust blur intensity.
 */

import { useState } from 'react';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface PrivacyBlurProps {
  imageFile: File | null;
  faceCount: number;
  onBlurComplete?: (blurredImageUrl: string) => void;
}

interface BlurResponse {
  success: boolean;
  detectionId: string;
  blurredImageUrl: string;
  blurIntensity: number;
  excludedFaces: number[];
}

export function PrivacyBlur({ imageFile, faceCount, onBlurComplete }: PrivacyBlurProps) {
  const [blurIntensity, setBlurIntensity] = useState(10);
  const [excludedFaces, setExcludedFaces] = useState<Set<number>>(new Set());
  const [blurredImage, setBlurredImage] = useState<string | null>(null);
  const { toast } = useToast();

  // Mutation for blurring faces
  const blurFacesMutation = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error('No image file provided');
      
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('blurIntensity', blurIntensity.toString());
      formData.append('excludeIndexes', JSON.stringify(Array.from(excludedFaces)));
      
      return apiRequest(API_ENDPOINTS.ai.media.vision.faces.blur, 'POST', formData) as Promise<BlurResponse>;
    },
    onSuccess: (data) => {
      setBlurredImage(data.blurredImageUrl);
      onBlurComplete?.(data.blurredImageUrl);
      toast({
        title: 'Privacy Blur Applied',
        description: `Faces blurred successfully with intensity ${data.blurIntensity}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Blur Failed',
        description: error.message || 'Failed to blur faces',
        variant: 'destructive',
      });
    },
  });

  // Toggle face exclusion
  const toggleFaceExclusion = (faceIndex: number) => {
    const newExcluded = new Set(excludedFaces);
    if (newExcluded.has(faceIndex)) {
      newExcluded.delete(faceIndex);
    } else {
      newExcluded.add(faceIndex);
    }
    setExcludedFaces(newExcluded);
  };

  // Apply blur
  const handleApplyBlur = () => {
    if (imageFile) {
      blurFacesMutation.mutate();
    }
  };

  return (
    <Card className="w-full" data-testid="card-privacy-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Blur
        </CardTitle>
        <CardDescription>
          Protect privacy by blurring faces in your images
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Blur Intensity Control */}
        <div className="space-y-2">
          <Label htmlFor="blur-intensity">
            Blur Intensity: {blurIntensity}
          </Label>
          <Slider
            id="blur-intensity"
            min={1}
            max={20}
            step={1}
            value={[blurIntensity]}
            onValueChange={(value) => setBlurIntensity(value[0])}
            className="w-full"
            data-testid="slider-blur-intensity"
          />
          <p className="text-sm text-muted-foreground">
            Higher values create stronger blur effect
          </p>
        </div>

        {/* Face Selection */}
        {faceCount > 0 && (
          <div className="space-y-2">
            <Label>Select Faces to Keep Visible</Label>
            <div className="space-y-2">
              {Array.from({ length: faceCount }, (_, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`face-${index}`}
                    checked={excludedFaces.has(index)}
                    onCheckedChange={() => toggleFaceExclusion(index)}
                    data-testid={`checkbox-face-${index}`}
                  />
                  <Label
                    htmlFor={`face-${index}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    Face {index + 1} - Keep visible
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Unchecked faces will be blurred for privacy
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleApplyBlur}
            disabled={!imageFile || blurFacesMutation.isPending}
            className="flex-1"
            data-testid="button-apply-blur"
          >
            {blurFacesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying Blur...
              </>
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Apply Privacy Blur
              </>
            )}
          </Button>
          {blurredImage && (
            <Button
              variant="outline"
              onClick={() => setBlurredImage(null)}
              data-testid="button-show-original"
            >
              <Eye className="mr-2 h-4 w-4" />
              Show Original
            </Button>
          )}
        </div>

        {/* Blurred Image Display */}
        {blurredImage && (
          <div className="mt-4">
            <Label className="mb-2 block">Blurred Image</Label>
            <img
              src={blurredImage}
              alt="Blurred"
              className="w-full rounded-lg shadow-lg"
              data-testid="img-blurred"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * AnonymizeToggle Component
 * 
 * Simple toggle component for enabling/disabling automatic face anonymization.
 */

interface AnonymizeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function AnonymizeToggle({ enabled, onToggle }: AnonymizeToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg" data-testid="div-anonymize-toggle">
      <div className="space-y-0.5">
        <Label htmlFor="anonymize-toggle" className="text-base cursor-pointer">
          Auto-Anonymize Faces
        </Label>
        <p className="text-sm text-muted-foreground">
          Automatically blur all detected faces for privacy
        </p>
      </div>
      <Button
        id="anonymize-toggle"
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle(!enabled)}
        data-testid="button-anonymize-toggle"
      >
        {enabled ? (
          <>
            <Shield className="mr-2 h-4 w-4" />
            Enabled
          </>
        ) : (
          <>
            <Eye className="mr-2 h-4 w-4" />
            Disabled
          </>
        )}
      </Button>
    </div>
  );
}
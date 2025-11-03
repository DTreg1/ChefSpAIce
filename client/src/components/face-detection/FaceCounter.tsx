/**
 * FaceCounter Component
 * 
 * Component for counting faces in images.
 * Useful for group photo analysis and attendance tracking.
 */

import { useState } from 'react';
import { Users, Hash, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface FaceCounterProps {
  imageFile: File | null;
  onCountComplete?: (count: number) => void;
}

interface CountResponse {
  success: boolean;
  detectionId: string;
  faceCount: number;
  message: string;
}

interface CountResult {
  count: number;
  timestamp: Date;
  filename: string;
}

export function FaceCounter({ imageFile, onCountComplete }: FaceCounterProps) {
  const [countHistory, setCountHistory] = useState<CountResult[]>([]);
  const [currentCount, setCurrentCount] = useState<number | null>(null);
  const { toast } = useToast();

  // Mutation for counting faces
  const countFacesMutation = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error('No image file provided');
      
      const formData = new FormData();
      formData.append('image', imageFile);
      
      return apiRequest('/api/faces/count', {
        method: 'POST',
        body: formData,
      }) as Promise<CountResponse>;
    },
    onSuccess: (data) => {
      setCurrentCount(data.faceCount);
      onCountComplete?.(data.faceCount);
      
      // Add to history
      const result: CountResult = {
        count: data.faceCount,
        timestamp: new Date(),
        filename: imageFile?.name || 'Unknown',
      };
      setCountHistory(prev => [result, ...prev].slice(0, 5)); // Keep last 5
      
      toast({
        title: 'Count Complete',
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Count Failed',
        description: error.message || 'Failed to count faces',
        variant: 'destructive',
      });
    },
  });

  // Handle count faces
  const handleCountFaces = () => {
    if (imageFile) {
      countFacesMutation.mutate();
    }
  };

  // Get count badge variant
  const getCountBadgeVariant = (count: number) => {
    if (count === 0) return 'destructive';
    if (count === 1) return 'secondary';
    if (count <= 5) return 'default';
    return 'outline';
  };

  // Get count message
  const getCountMessage = (count: number) => {
    if (count === 0) return 'No faces detected in the image';
    if (count === 1) return 'Perfect for a profile photo!';
    if (count <= 3) return 'Small group detected';
    if (count <= 10) return 'Medium-sized group';
    return 'Large group photo!';
  };

  return (
    <Card className="w-full" data-testid="card-face-counter">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Face Counter
        </CardTitle>
        <CardDescription>
          Count the number of faces in group photos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Count Button */}
        <Button
          onClick={handleCountFaces}
          disabled={!imageFile || countFacesMutation.isPending}
          className="w-full"
          size="lg"
          data-testid="button-count-faces"
        >
          {countFacesMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Counting Faces...
            </>
          ) : (
            <>
              <Hash className="mr-2 h-5 w-5" />
              Count Faces
            </>
          )}
        </Button>

        {/* Current Count Display */}
        {currentCount !== null && (
          <div className="text-center py-6" data-testid="div-current-count">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
              <span className="text-4xl font-bold text-primary">
                {currentCount}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                {currentCount} {currentCount === 1 ? 'Face' : 'Faces'} Detected
              </p>
              <Badge 
                variant={getCountBadgeVariant(currentCount)}
                className="mx-auto"
                data-testid="badge-count-status"
              >
                {getCountMessage(currentCount)}
              </Badge>
            </div>
          </div>
        )}

        {/* Statistics Alert */}
        {currentCount !== null && currentCount > 0 && (
          <Alert data-testid="alert-statistics">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Detection Statistics</p>
                <ul className="text-sm space-y-1">
                  <li>• Total faces: {currentCount}</li>
                  <li>• Image: {imageFile?.name}</li>
                  <li>• Size: {((imageFile?.size || 0) / 1024).toFixed(1)} KB</li>
                  <li>• Time: {new Date().toLocaleTimeString()}</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Count History */}
        {countHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Recent Counts</h3>
            <div className="space-y-2">
              {countHistory.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  data-testid={`div-history-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="min-w-[2rem] text-center">
                      {result.count}
                    </Badge>
                    <span className="text-sm truncate max-w-[150px]">
                      {result.filename}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!imageFile && (
          <Alert data-testid="alert-instructions">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Select an image to count the number of faces
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
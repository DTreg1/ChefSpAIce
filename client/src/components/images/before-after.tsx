/**
 * Before/After Image Comparison Component
 *
 * Interactive slider to compare original and processed images.
 */

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeAfterProps {
  originalUrl: string;
  processedUrl: string;
  originalSize?: number;
  processedSize?: number;
  processingTime?: number;
}

export function BeforeAfter({
  originalUrl,
  processedUrl,
  originalSize,
  processedSize,
  processingTime,
}: BeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate compression ratio
  const compressionRatio =
    originalSize && processedSize
      ? ((1 - processedSize / originalSize) * 100).toFixed(1)
      : null;

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle ESC key for fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Before & After Comparison</CardTitle>
            <CardDescription>
              Slide to compare original and processed images
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {compressionRatio && (
              <Badge variant="secondary">{compressionRatio}% smaller</Badge>
            )}

            {processingTime && (
              <Badge variant="outline">{processingTime}ms</Badge>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFullscreen}
              data-testid="fullscreen-toggle"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative aspect-square rounded-lg overflow-hidden bg-muted"
          data-testid="comparison-container"
        >
          {/* Original Image (Background) */}
          <div className="absolute inset-0">
            <img
              src={originalUrl}
              alt="Original"
              className="w-full h-full object-contain"
            />

            {/* Label */}
            <div className="absolute top-4 left-4">
              <Badge variant="secondary">Original</Badge>
            </div>
          </div>

          {/* Processed Image (Overlay) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={processedUrl}
              alt="Processed"
              className="w-full h-full object-contain"
            />

            {/* Label */}
            <div className="absolute top-4 right-4">
              <Badge>Processed</Badge>
            </div>
          </div>

          {/* Slider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Slider Handle */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-primary rounded-full border-2 border-background shadow-lg flex items-center justify-center">
              <div className="w-0.5 h-4 bg-background" />
              <div className="w-0.5 h-4 bg-background ml-1" />
            </div>
          </div>
        </div>

        {/* Slider Control */}
        <div className="mt-4">
          <Slider
            value={[sliderPosition]}
            onValueChange={([value]) => setSliderPosition(value)}
            min={0}
            max={100}
            step={1}
            className="w-full"
            data-testid="comparison-slider"
          />

          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Original</span>
            <span>{sliderPosition}%</span>
            <span>Processed</span>
          </div>
        </div>

        {/* File Size Comparison */}
        {originalSize && processedSize && (
          <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Original Size</p>
              <p className="font-medium">
                {(originalSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processed Size</p>
              <p className="font-medium">
                {(processedSize / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

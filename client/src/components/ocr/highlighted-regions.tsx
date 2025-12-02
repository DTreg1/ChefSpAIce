/**
 * Highlighted Regions Component
 *
 * Displays image with highlighted text regions detected by OCR
 */

import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BoundingBox {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

interface HighlightedRegionsProps {
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  showConfidence?: boolean;
  highlightColor?: string;
  className?: string;
}

export function HighlightedRegions({
  imageUrl,
  boundingBoxes,
  showConfidence = true,
  highlightColor = "rgba(59, 130, 246, 0.3)",
  className,
}: HighlightedRegionsProps) {
  const [showHighlights, setShowHighlights] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [hoveredBox, setHoveredBox] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getBoxStyle = (box: BoundingBox, index: number) => {
    const isHovered = hoveredBox === index;
    return {
      position: "absolute" as const,
      left: `${(box.bbox.x0 / imageDimensions.width) * 100}%`,
      top: `${(box.bbox.y0 / imageDimensions.height) * 100}%`,
      width: `${((box.bbox.x1 - box.bbox.x0) / imageDimensions.width) * 100}%`,
      height: `${((box.bbox.y1 - box.bbox.y0) / imageDimensions.height) * 100}%`,
      backgroundColor: isHovered ? "rgba(34, 197, 94, 0.4)" : highlightColor,
      border: isHovered
        ? "2px solid rgb(34, 197, 94)"
        : "1px solid rgba(59, 130, 246, 0.5)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      zIndex: isHovered ? 10 : 1,
    };
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  return (
    <Card
      className={cn("w-full", className)}
      data-testid="highlighted-regions-card"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Document Regions</CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-highlights"
              checked={showHighlights}
              onCheckedChange={setShowHighlights}
              data-testid="switch-highlights"
            />
            <Label htmlFor="show-highlights" className="text-sm">
              {showHighlights ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span
              className="mx-2 text-sm font-medium"
              data-testid="text-zoom-level"
            >
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm">Zoom</Label>
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={50}
              max={200}
              step={25}
              className="flex-1"
              data-testid="slider-zoom"
            />
          </div>

          <div
            ref={containerRef}
            className="relative overflow-auto rounded-lg border bg-muted/30"
            style={{ maxHeight: "600px" }}
            data-testid="image-container"
          >
            <div
              className="relative inline-block"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left",
              }}
            >
              <img
                src={imageUrl}
                alt="Document with OCR regions"
                className="block"
                data-testid="ocr-image"
              />
              {showHighlights &&
                imageDimensions.width > 0 &&
                boundingBoxes.map((box, index) => (
                  <div
                    key={index}
                    style={getBoxStyle(box, index)}
                    onMouseEnter={() => setHoveredBox(index)}
                    onMouseLeave={() => setHoveredBox(null)}
                    title={`${box.text} (${box.confidence.toFixed(1)}% confidence)`}
                    data-testid={`region-${index}`}
                  >
                    {hoveredBox === index && showConfidence && (
                      <div className="absolute -top-6 left-0 z-20 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white">
                        {box.text.substring(0, 20)}
                        {box.text.length > 20 && "..."} (
                        {box.confidence.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {boundingBoxes.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3">
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-regions-count"
              >
                <strong>{boundingBoxes.length}</strong> text regions detected
              </p>
              {showConfidence && (
                <p
                  className="mt-1 text-sm text-muted-foreground"
                  data-testid="text-avg-confidence"
                >
                  Average confidence:{" "}
                  <strong>
                    {(
                      boundingBoxes.reduce(
                        (acc, box) => acc + box.confidence,
                        0,
                      ) / boundingBoxes.length
                    ).toFixed(1)}
                    %
                  </strong>
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

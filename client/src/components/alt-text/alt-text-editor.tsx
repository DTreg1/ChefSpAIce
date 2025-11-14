/**
 * Alt Text Editor Component
 * 
 * Allows manual editing of alt text with real-time quality scoring
 * and suggestions for improvement.
 */

import { useState, useEffect } from "react";
import { Check, AlertCircle, Wand2, RotateCw } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { ImageMetadata, AltTextQuality } from "@shared/schema";

interface AltTextEditorProps {
  imageId: string;
  imageUrl: string;
  initialAltText?: string;
  initialIsDecorative?: boolean;
  onSave?: (altText: string, isDecorative: boolean) => void;
}

export function AltTextEditor({ 
  imageId, 
  imageUrl, 
  initialAltText = "", 
  initialIsDecorative = false,
  onSave 
}: AltTextEditorProps) {
  const [altText, setAltText] = useState(initialAltText);
  const [isDecorative, setIsDecorative] = useState(initialIsDecorative);
  const [quality, setQuality] = useState<Partial<AltTextQuality> | null>(null);
  const { toast } = useToast();

  // Get suggestions
  const suggestionsQuery = useQuery<{ suggestions: string[] }>({
    queryKey: [`/api/images/${imageId}/suggestions`],
    enabled: !!imageId,
  });

  // Update alt text mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { altText: string; isDecorative: boolean }) => {
      const res = await apiRequest("PUT", `/api/images/${imageId}/alt-text`, data);
      return res.json();
    },
    onSuccess: (response) => {
      setQuality(response.data?.quality);
      toast({
        title: "Alt text updated",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/images/${imageId}`] });
      onSave?.(altText, isDecorative);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update alt text. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Regenerate alt text mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/images/alt-text", { imageUrl });
      return res.json();
    },
    onSuccess: (response) => {
      setAltText(response.data?.altText);
      toast({
        title: "Alt text regenerated",
        description: "A new alt text has been generated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate alt text.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ altText, isDecorative });
  };

  const handleApplySuggestion = (suggestion: string) => {
    setAltText(suggestion);
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getWCAGBadgeVariant = (level: string | null | undefined) => {
    switch (level) {
      case "AAA": return "default";
      case "AA": return "secondary";
      case "A": return "outline";
      default: return "destructive";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Alt Text Editor</span>
          {quality && (
            <div className="flex items-center gap-2">
              <Badge variant={getWCAGBadgeVariant(quality.wcagLevel)}>
                WCAG {quality.wcagLevel || "N/A"}
              </Badge>
              <span className={`text-sm font-medium ${getQualityColor(quality.qualityScore || 0)}`}>
                Quality: {quality.qualityScore || 0}%
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Decorative toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="decorative"
            checked={isDecorative}
            onCheckedChange={setIsDecorative}
            data-testid="switch-decorative"
          />
          <Label htmlFor="decorative" className="cursor-pointer">
            Mark as decorative (no alt text needed)
          </Label>
        </div>

        {/* Alt text editor */}
        <div className={`space-y-2 ${isDecorative ? "opacity-50 pointer-events-none" : ""}`}>
          <Label htmlFor="alt-text">Alt Text</Label>
          <Textarea
            id="alt-text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image for screen readers..."
            className="min-h-[120px]"
            disabled={isDecorative}
            data-testid="input-alt-text"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{altText.length} characters</span>
            <span className={altText.length > 125 ? "text-destructive" : ""}>
              {altText.length > 125 && "⚠ "} 
              Recommended: 80-125 characters
            </span>
          </div>
        </div>

        {/* Quality metrics */}
        {quality && !isDecorative && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold">Quality Metrics</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Length Score</span>
                <span>{quality.lengthScore}%</span>
              </div>
              <Progress value={quality.lengthScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Descriptiveness</span>
                <span>{quality.descriptiveScore}%</span>
              </div>
              <Progress value={quality.descriptiveScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Screen Reader Compatibility</span>
                <span>{quality.screenReaderScore}%</span>
              </div>
              <Progress value={quality.screenReaderScore} className="h-2" />
            </div>

            {quality.issues && quality.issues.length > 0 && (
              <div className="mt-3 space-y-1">
                <h5 className="text-sm font-medium text-destructive">Issues:</h5>
                {quality.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-3 h-3 mt-0.5 text-destructive" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {suggestionsQuery.data?.suggestions && !isDecorative && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Suggestions</Label>
            <div className="space-y-2">
              {suggestionsQuery.data.suggestions.map((suggestion: string, idx: number) => (
                <div 
                  key={idx}
                  className="p-3 bg-muted/30 rounded-lg hover-elevate cursor-pointer"
                  onClick={() => handleApplySuggestion(suggestion)}
                  data-testid={`suggestion-${idx}`}
                >
                  <p className="text-sm">{suggestion}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplySuggestion(suggestion);
                    }}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save"
          >
            {updateMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || isDecorative}
            data-testid="button-regenerate"
          >
            {regenerateMutation.isPending ? (
              <>Generating...</>
            ) : (
              <>
                <RotateCw className="w-4 h-4 mr-1" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
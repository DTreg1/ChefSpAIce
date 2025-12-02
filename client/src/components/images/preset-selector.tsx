/**
 * Preset Selector Component
 *
 * Quick selection of predefined enhancement presets.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  User,
  Mountain,
  FileText,
  Share2,
  Settings,
} from "lucide-react";

interface Preset {
  id: string;
  name: string;
  description: string;
  category: string;
  operations: any;
  usageCount: number;
  isPublic: boolean;
  thumbnailUrl?: string;
}

interface PresetSelectorProps {
  onSelect: (preset: Preset) => void;
  selectedId?: string;
}

export function PresetSelector({ onSelect, selectedId }: PresetSelectorProps) {
  const [category, setCategory] = useState<string>("all");

  // Fetch presets
  const { data: presets, isLoading } = useQuery<Preset[]>({
    queryKey: ["/api/images/presets", category],
    queryFn: async () => {
      const params = category !== "all" ? `?category=${category}` : "";
      const response = await fetch(`/api/images/presets${params}`);
      if (!response.ok) throw new Error("Failed to fetch presets");
      return response.json();
    },
  });

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "portrait":
        return <User className="h-4 w-4" />;
      case "landscape":
        return <Mountain className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "social_media":
        return <Share2 className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enhancement Presets</CardTitle>
        <CardDescription>
          Quick presets for common enhancement needs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={category === "all" ? "default" : "outline"}
            onClick={() => setCategory("all")}
            data-testid="category-all"
          >
            All
          </Button>
          {["product", "portrait", "landscape", "social_media", "custom"].map(
            (cat) => (
              <Button
                key={cat}
                size="sm"
                variant={category === cat ? "default" : "outline"}
                onClick={() => setCategory(cat)}
                className="gap-1"
                data-testid={`category-${cat}`}
              >
                {getCategoryIcon(cat)}
                {cat.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </Button>
            ),
          )}
        </div>

        {/* Presets List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <RadioGroup
            value={selectedId}
            onValueChange={(value) => {
              const preset = presets?.find((p) => p.id === value);
              if (preset) onSelect(preset);
            }}
          >
            <div className="space-y-3">
              {presets?.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover-elevate cursor-pointer"
                  data-testid={`preset-${preset.id}`}
                >
                  <RadioGroupItem value={preset.id} id={preset.id} />

                  {preset.thumbnailUrl && (
                    <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={preset.thumbnailUrl}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <Label htmlFor={preset.id} className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        {getCategoryIcon(preset.category)}
                        <span className="font-medium">{preset.name}</span>
                        {preset.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            Public
                          </Badge>
                        )}
                        {preset.usageCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {preset.usageCount} uses
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {preset.description}
                      </p>

                      {/* Operations Summary */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {preset.operations.backgroundRemoval && (
                          <Badge variant="outline" className="text-xs">
                            BG Removal
                          </Badge>
                        )}
                        {preset.operations.autoCrop && (
                          <Badge variant="outline" className="text-xs">
                            Auto Crop
                          </Badge>
                        )}
                        {preset.operations.qualityEnhancement && (
                          <Badge variant="outline" className="text-xs">
                            Enhanced
                          </Badge>
                        )}
                        {preset.operations.filters?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {preset.operations.filters.length} Filters
                          </Badge>
                        )}
                        {preset.operations.resize && (
                          <Badge variant="outline" className="text-xs">
                            Resized
                          </Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                </div>
              ))}

              {presets?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No presets available for this category
                </div>
              )}
            </div>
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}

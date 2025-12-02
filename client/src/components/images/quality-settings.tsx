/**
 * Quality Settings Component
 *
 * Advanced quality and output configuration options.
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings2,
  Zap,
  HardDrive,
  Sparkles,
  Info,
  Save,
  RefreshCw,
} from "lucide-react";

interface QualityConfig {
  outputFormat: "jpeg" | "png" | "webp" | "avif";
  quality: number;
  compression: "none" | "low" | "medium" | "high" | "maximum";
  colorSpace: "srgb" | "adobergb" | "prophoto";
  bitDepth: 8 | 16;
  metadata: {
    preserveExif: boolean;
    preserveICC: boolean;
    addWatermark: boolean;
    watermarkText?: string;
  };
  dimensions: {
    resize: boolean;
    width?: number;
    height?: number;
    maintainAspect: boolean;
    upscale: boolean;
  };
  optimization: {
    progressive: boolean;
    lossless: boolean;
    chromaSubsampling: boolean;
    stripAlpha: boolean;
  };
  enhancement: {
    denoise: boolean;
    denoiseLevel: number;
    sharpen: boolean;
    sharpenAmount: number;
    autoColor: boolean;
    autoContrast: boolean;
    autoExposure: boolean;
  };
}

interface QualitySettingsProps {
  config?: Partial<QualityConfig>;
  onChange?: (config: QualityConfig) => void;
  onSavePreset?: (name: string, config: QualityConfig) => void;
}

export function QualitySettings({
  config: initialConfig,
  onChange,
  onSavePreset,
}: QualitySettingsProps) {
  const [config, setConfig] = useState<QualityConfig>({
    outputFormat: "jpeg",
    quality: 85,
    compression: "medium",
    colorSpace: "srgb",
    bitDepth: 8,
    metadata: {
      preserveExif: false,
      preserveICC: true,
      addWatermark: false,
    },
    dimensions: {
      resize: false,
      maintainAspect: true,
      upscale: false,
    },
    optimization: {
      progressive: true,
      lossless: false,
      chromaSubsampling: true,
      stripAlpha: false,
    },
    enhancement: {
      denoise: false,
      denoiseLevel: 30,
      sharpen: false,
      sharpenAmount: 50,
      autoColor: false,
      autoContrast: false,
      autoExposure: false,
    },
    ...initialConfig,
  });

  const [presetName, setPresetName] = useState("");

  // Update parent when config changes
  useEffect(() => {
    if (onChange) {
      onChange(config);
    }
  }, [config, onChange]);

  // Update specific config property
  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      const keys = path.split(".");
      let current: any = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  // Calculate estimated file size
  const estimateFileSize = () => {
    const baseSize = 1000; // 1MB base
    let multiplier = 1;

    switch (config.outputFormat) {
      case "png":
        multiplier = 1.5;
        break;
      case "webp":
        multiplier = 0.7;
        break;
      case "avif":
        multiplier = 0.5;
        break;
    }

    multiplier *= config.quality / 100;

    if (config.optimization.lossless) multiplier *= 2;
    if (config.bitDepth === 16) multiplier *= 1.5;

    return (baseSize * multiplier).toFixed(0);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setConfig({
      outputFormat: "jpeg",
      quality: 85,
      compression: "medium",
      colorSpace: "srgb",
      bitDepth: 8,
      metadata: {
        preserveExif: false,
        preserveICC: true,
        addWatermark: false,
      },
      dimensions: {
        resize: false,
        maintainAspect: true,
        upscale: false,
      },
      optimization: {
        progressive: true,
        lossless: false,
        chromaSubsampling: true,
        stripAlpha: false,
      },
      enhancement: {
        denoise: false,
        denoiseLevel: 30,
        sharpen: false,
        sharpenAmount: 50,
        autoColor: false,
        autoContrast: false,
        autoExposure: false,
      },
    });
  };

  // Save as preset
  const handleSavePreset = () => {
    if (presetName && onSavePreset) {
      onSavePreset(presetName, config);
      setPresetName("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quality Settings</CardTitle>
            <CardDescription>
              Advanced output and processing configuration
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">~{estimateFileSize()} KB</Badge>

            <Button
              size="sm"
              variant="outline"
              onClick={resetToDefaults}
              data-testid="reset-settings"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="output" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="output">
              <HardDrive className="h-4 w-4 mr-1" />
              Output
            </TabsTrigger>
            <TabsTrigger value="dimensions">
              <Settings2 className="h-4 w-4 mr-1" />
              Dimensions
            </TabsTrigger>
            <TabsTrigger value="optimization">
              <Zap className="h-4 w-4 mr-1" />
              Optimize
            </TabsTrigger>
            <TabsTrigger value="enhancement">
              <Sparkles className="h-4 w-4 mr-1" />
              Enhance
            </TabsTrigger>
          </TabsList>

          {/* Output Settings */}
          <TabsContent value="output" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select
                  value={config.outputFormat}
                  onValueChange={(value) => updateConfig("outputFormat", value)}
                >
                  <SelectTrigger id="format" data-testid="select-output-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                    <SelectItem value="avif">AVIF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color-space">Color Space</Label>
                <Select
                  value={config.colorSpace}
                  onValueChange={(value) => updateConfig("colorSpace", value)}
                >
                  <SelectTrigger
                    id="color-space"
                    data-testid="select-color-space"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="srgb">sRGB</SelectItem>
                    <SelectItem value="adobergb">Adobe RGB</SelectItem>
                    <SelectItem value="prophoto">ProPhoto RGB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quality: {config.quality}%</Label>
              <Slider
                value={[config.quality]}
                onValueChange={([value]) => updateConfig("quality", value)}
                min={10}
                max={100}
                step={5}
                data-testid="slider-output-quality"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="preserve-exif">Preserve EXIF Data</Label>
                <Switch
                  id="preserve-exif"
                  checked={config.metadata.preserveExif}
                  onCheckedChange={(checked) =>
                    updateConfig("metadata.preserveExif", checked)
                  }
                  data-testid="switch-preserve-exif"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="preserve-icc">Preserve Color Profile</Label>
                <Switch
                  id="preserve-icc"
                  checked={config.metadata.preserveICC}
                  onCheckedChange={(checked) =>
                    updateConfig("metadata.preserveICC", checked)
                  }
                  data-testid="switch-preserve-icc"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="watermark">Add Watermark</Label>
                <Switch
                  id="watermark"
                  checked={config.metadata.addWatermark}
                  onCheckedChange={(checked) =>
                    updateConfig("metadata.addWatermark", checked)
                  }
                  data-testid="switch-watermark"
                />
              </div>

              {config.metadata.addWatermark && (
                <Input
                  placeholder="Watermark text"
                  value={config.metadata.watermarkText || ""}
                  onChange={(e) =>
                    updateConfig("metadata.watermarkText", e.target.value)
                  }
                  data-testid="input-watermark-text"
                />
              )}
            </div>
          </TabsContent>

          {/* Dimension Settings */}
          <TabsContent value="dimensions" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="resize">Resize Image</Label>
              <Switch
                id="resize"
                checked={config.dimensions.resize}
                onCheckedChange={(checked) =>
                  updateConfig("dimensions.resize", checked)
                }
                data-testid="switch-resize"
              />
            </div>

            {config.dimensions.resize && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={config.dimensions.width || ""}
                      onChange={(e) =>
                        updateConfig(
                          "dimensions.width",
                          parseInt(e.target.value),
                        )
                      }
                      data-testid="input-width"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={config.dimensions.height || ""}
                      onChange={(e) =>
                        updateConfig(
                          "dimensions.height",
                          parseInt(e.target.value),
                        )
                      }
                      data-testid="input-height"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maintain-aspect">
                      Maintain Aspect Ratio
                    </Label>
                    <Switch
                      id="maintain-aspect"
                      checked={config.dimensions.maintainAspect}
                      onCheckedChange={(checked) =>
                        updateConfig("dimensions.maintainAspect", checked)
                      }
                      data-testid="switch-aspect"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="upscale">Allow Upscaling</Label>
                    <Switch
                      id="upscale"
                      checked={config.dimensions.upscale}
                      onCheckedChange={(checked) =>
                        updateConfig("dimensions.upscale", checked)
                      }
                      data-testid="switch-upscale"
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Leave width or height empty to auto-calculate based on
                    aspect ratio
                  </AlertDescription>
                </Alert>
              </>
            )}
          </TabsContent>

          {/* Optimization Settings */}
          <TabsContent value="optimization" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="progressive">Progressive Loading</Label>
                  <p className="text-xs text-muted-foreground">
                    Load image in multiple passes
                  </p>
                </div>
                <Switch
                  id="progressive"
                  checked={config.optimization.progressive}
                  onCheckedChange={(checked) =>
                    updateConfig("optimization.progressive", checked)
                  }
                  data-testid="switch-progressive"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="lossless">Lossless Compression</Label>
                  <p className="text-xs text-muted-foreground">
                    Preserve all image data
                  </p>
                </div>
                <Switch
                  id="lossless"
                  checked={config.optimization.lossless}
                  onCheckedChange={(checked) =>
                    updateConfig("optimization.lossless", checked)
                  }
                  data-testid="switch-lossless"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="chroma">Chroma Subsampling</Label>
                  <p className="text-xs text-muted-foreground">
                    Reduce color information
                  </p>
                </div>
                <Switch
                  id="chroma"
                  checked={config.optimization.chromaSubsampling}
                  onCheckedChange={(checked) =>
                    updateConfig("optimization.chromaSubsampling", checked)
                  }
                  data-testid="switch-chroma"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="strip-alpha">Strip Alpha Channel</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove transparency
                  </p>
                </div>
                <Switch
                  id="strip-alpha"
                  checked={config.optimization.stripAlpha}
                  onCheckedChange={(checked) =>
                    updateConfig("optimization.stripAlpha", checked)
                  }
                  data-testid="switch-strip-alpha"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Compression Level</Label>
              <Select
                value={config.compression}
                onValueChange={(value) => updateConfig("compression", value)}
              >
                <SelectTrigger data-testid="select-compression">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="maximum">Maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Enhancement Settings */}
          <TabsContent value="enhancement" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="denoise">Noise Reduction</Label>
                <Switch
                  id="denoise"
                  checked={config.enhancement.denoise}
                  onCheckedChange={(checked) =>
                    updateConfig("enhancement.denoise", checked)
                  }
                  data-testid="switch-denoise"
                />
              </div>

              {config.enhancement.denoise && (
                <div className="space-y-2">
                  <Label>
                    Denoise Level: {config.enhancement.denoiseLevel}%
                  </Label>
                  <Slider
                    value={[config.enhancement.denoiseLevel]}
                    onValueChange={([value]) =>
                      updateConfig("enhancement.denoiseLevel", value)
                    }
                    min={0}
                    max={100}
                    step={10}
                    data-testid="slider-denoise"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="sharpen">Sharpening</Label>
                <Switch
                  id="sharpen"
                  checked={config.enhancement.sharpen}
                  onCheckedChange={(checked) =>
                    updateConfig("enhancement.sharpen", checked)
                  }
                  data-testid="switch-sharpen"
                />
              </div>

              {config.enhancement.sharpen && (
                <div className="space-y-2">
                  <Label>
                    Sharpen Amount: {config.enhancement.sharpenAmount}%
                  </Label>
                  <Slider
                    value={[config.enhancement.sharpenAmount]}
                    onValueChange={([value]) =>
                      updateConfig("enhancement.sharpenAmount", value)
                    }
                    min={0}
                    max={100}
                    step={10}
                    data-testid="slider-sharpen"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-color">Auto Color Correction</Label>
                <Switch
                  id="auto-color"
                  checked={config.enhancement.autoColor}
                  onCheckedChange={(checked) =>
                    updateConfig("enhancement.autoColor", checked)
                  }
                  data-testid="switch-auto-color"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-contrast">Auto Contrast</Label>
                <Switch
                  id="auto-contrast"
                  checked={config.enhancement.autoContrast}
                  onCheckedChange={(checked) =>
                    updateConfig("enhancement.autoContrast", checked)
                  }
                  data-testid="switch-auto-contrast"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-exposure">Auto Exposure</Label>
                <Switch
                  id="auto-exposure"
                  checked={config.enhancement.autoExposure}
                  onCheckedChange={(checked) =>
                    updateConfig("enhancement.autoExposure", checked)
                  }
                  data-testid="switch-auto-exposure"
                />
              </div>
            </div>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Auto adjustments use AI to analyze and improve image quality
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Save as Preset */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              data-testid="input-preset-name"
            />
            <Button
              onClick={handleSavePreset}
              disabled={!presetName}
              data-testid="save-preset-button"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Preset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

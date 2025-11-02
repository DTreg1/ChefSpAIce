/**
 * ExcerptEditor Component
 * 
 * Provides an editor interface for creating and editing excerpts with
 * real-time preview and character counting.
 * 
 * @module client/src/components/excerpt-editor
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Sparkles, Save, X, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExcerptPreview } from "./excerpt-preview";
import { SocialPreview } from "./social-preview";
import type { Excerpt } from "@shared/schema";

interface ExcerptEditorProps {
  initialContent?: string;
  initialExcerpt?: Excerpt;
  onSave?: (data: ExcerptEditorData) => void;
  onCancel?: () => void;
  onGenerate?: (data: ExcerptGenerationOptions) => void;
  isGenerating?: boolean;
}

export interface ExcerptEditorData {
  excerptText: string;
  targetPlatform: string;
  excerptType: string;
  characterCount: number;
  wordCount: number;
  generationParams?: any;
}

export interface ExcerptGenerationOptions {
  content: string;
  targetPlatform: string;
  excerptType: string;
  tone: string;
  style: string;
  targetAudience: string;
  callToAction: boolean;
  hashtags: boolean;
  emojis: boolean;
  maxCharacters: number;
  temperature: number;
  variantCount: number;
}

const PLATFORM_LIMITS = {
  twitter: 280,
  linkedin: 3000,
  facebook: 500,
  instagram: 2200,
  generic: 300,
};

export function ExcerptEditor({
  initialContent = "",
  initialExcerpt,
  onSave,
  onCancel,
  onGenerate,
  isGenerating = false,
}: ExcerptEditorProps) {
  const [excerptText, setExcerptText] = useState(initialExcerpt?.excerptText || "");
  const [targetPlatform, setTargetPlatform] = useState(initialExcerpt?.targetPlatform || "generic");
  const [excerptType, setExcerptType] = useState(initialExcerpt?.excerptType || "social");
  
  // Generation options
  const [tone, setTone] = useState("informative");
  const [style, setStyle] = useState("summary");
  const [targetAudience, setTargetAudience] = useState("general audience");
  const [callToAction, setCallToAction] = useState(true);
  const [hashtags, setHashtags] = useState(false);
  const [emojis, setEmojis] = useState(false);
  const [temperature, setTemperature] = useState([0.7]);
  const [variantCount, setVariantCount] = useState([3]);

  const characterCount = excerptText.length;
  const wordCount = excerptText.split(/\s+/).filter((word: string) => word.length > 0).length;
  const maxCharacters = PLATFORM_LIMITS[targetPlatform as keyof typeof PLATFORM_LIMITS] || 300;
  const isOverLimit = characterCount > maxCharacters;

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate({
        content: initialContent,
        targetPlatform,
        excerptType,
        tone,
        style,
        targetAudience,
        callToAction,
        hashtags,
        emojis,
        maxCharacters,
        temperature: temperature[0],
        variantCount: variantCount[0],
      });
    }
  };

  const handleSave = () => {
    if (onSave && !isOverLimit) {
      onSave({
        excerptText,
        targetPlatform,
        excerptType,
        characterCount,
        wordCount,
        generationParams: {
          tone,
          style,
          targetAudience,
          callToAction,
          hashtags,
          emojis,
          temperature: temperature[0],
        },
      });
    }
  };

  // Mock excerpt for preview
  const previewExcerpt: Excerpt = {
    id: 'preview',
    userId: 'preview',
    contentId: 'preview',
    excerptText,
    excerptType,
    targetPlatform,
    characterCount,
    wordCount,
    clickThroughRate: 0,
    isActive: false,
    variant: 'Preview',
    createdAt: new Date(),
    updatedAt: new Date(),
    originalContent: initialContent,
    generationParams: {
      tone,
      style,
      targetAudience,
      callToAction,
      hashtags,
      emojis,
    },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Excerpt Editor</CardTitle>
          <CardDescription>
            Create or edit compelling preview snippets for your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt Text</Label>
            <Textarea
              id="excerpt"
              placeholder="Enter your excerpt text here..."
              value={excerptText}
              onChange={(e) => setExcerptText(e.target.value)}
              className="min-h-[150px] resize-none"
              data-testid="textarea-excerpt"
            />
            <div className="flex items-center justify-between text-sm">
              <span className={`${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {characterCount} / {maxCharacters} characters
              </span>
              <span className="text-muted-foreground">
                {wordCount} words
              </span>
            </div>
            {isOverLimit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Excerpt exceeds {targetPlatform} character limit
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform">Target Platform</Label>
              <Select value={targetPlatform} onValueChange={setTargetPlatform}>
                <SelectTrigger id="platform" data-testid="select-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Excerpt Type</Label>
              <Select value={excerptType} onValueChange={setExcerptType}>
                <SelectTrigger id="type" data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="email">Email Preview</SelectItem>
                  <SelectItem value="card">Content Card</SelectItem>
                  <SelectItem value="meta">Meta Description</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {onGenerate && (
            <>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">AI Generation Options</h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger id="tone" data-testid="select-tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="exciting">Exciting</SelectItem>
                        <SelectItem value="informative">Informative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="style">Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger id="style" data-testid="select-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="descriptive">Descriptive</SelectItem>
                        <SelectItem value="action-oriented">Action-oriented</SelectItem>
                        <SelectItem value="question-based">Question-based</SelectItem>
                        <SelectItem value="teaser">Teaser</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="audience">Target Audience</Label>
                  <input
                    id="audience"
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    placeholder="e.g., Marketing professionals, Tech enthusiasts"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    data-testid="input-audience"
                  />
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cta">Call to Action</Label>
                    <Switch
                      id="cta"
                      checked={callToAction}
                      onCheckedChange={setCallToAction}
                      data-testid="switch-cta"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hashtags">Include Hashtags</Label>
                    <Switch
                      id="hashtags"
                      checked={hashtags}
                      onCheckedChange={setHashtags}
                      data-testid="switch-hashtags"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emojis">Include Emojis</Label>
                    <Switch
                      id="emojis"
                      checked={emojis}
                      onCheckedChange={setEmojis}
                      data-testid="switch-emojis"
                    />
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Creativity (Temperature)</Label>
                      <span className="text-sm text-muted-foreground">{temperature[0]}</span>
                    </div>
                    <Slider
                      value={temperature}
                      onValueChange={setTemperature}
                      min={0}
                      max={1}
                      step={0.1}
                      data-testid="slider-temperature"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Variant Count</Label>
                      <span className="text-sm text-muted-foreground">{variantCount[0]}</span>
                    </div>
                    <Slider
                      value={variantCount}
                      onValueChange={setVariantCount}
                      min={1}
                      max={5}
                      step={1}
                      data-testid="slider-variants"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            {onGenerate && (
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !initialContent}
                data-testid="button-generate"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {isGenerating ? "Generating..." : `Generate ${variantCount[0]} Variant${variantCount[0] > 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
          {onSave && (
            <Button 
              onClick={handleSave} 
              disabled={isOverLimit || !excerptText}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="social">
              Social Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-4">
            <ExcerptPreview
              excerpt={previewExcerpt}
              showControls={false}
            />
          </TabsContent>
          <TabsContent value="social" className="mt-4">
            <SocialPreview
              excerpt={excerptText}
              platform={targetPlatform}
              metadata={{
                title: excerptText.substring(0, 60),
                description: excerptText,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
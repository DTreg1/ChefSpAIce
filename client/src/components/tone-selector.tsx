/**
 * ToneSelector Component
 * 
 * Interactive slider to adjust writing tone from formal to casual.
 * Provides visual feedback and descriptions for each tone level.
 */

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type WritingTone = "formal" | "professional" | "casual" | "friendly" | "academic";

interface ToneSelectorProps {
  currentTone: WritingTone;
  targetTone: WritingTone;
  onToneChange: (tone: WritingTone) => void;
  className?: string;
}

const tones: { value: WritingTone; label: string; description: string; icon: string }[] = [
  {
    value: "formal",
    label: "Formal",
    description: "Official, serious, and respectful",
    icon: "🎩",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Business-appropriate and clear",
    icon: "💼",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Relaxed and conversational",
    icon: "👔",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable",
    icon: "😊",
  },
  {
    value: "academic",
    label: "Academic",
    description: "Scholarly and precise",
    icon: "🎓",
  },
];

export function ToneSelector({
  currentTone,
  targetTone,
  onToneChange,
  className,
}: ToneSelectorProps) {
  const currentIndex = tones.findIndex(t => t.value === targetTone);
  
  const handleSliderChange = (value: number[]) => {
    const index = Math.min(Math.max(0, value[0]), tones.length - 1);
    onToneChange(tones[index].value);
  };

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Tone Adjustment</Label>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs">
            Current: {currentTone}
          </Badge>
          <Badge variant="default" className="text-xs">
            Target: {targetTone}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        <Slider
          value={[currentIndex]}
          onValueChange={handleSliderChange}
          min={0}
          max={tones.length - 1}
          step={1}
          className="w-full"
          data-testid="slider-tone"
        />

        <div className="flex justify-between items-start">
          {tones.map((tone, index) => (
            <div
              key={tone.value}
              className={cn(
                "flex flex-col items-center gap-1 cursor-pointer transition-all",
                index === currentIndex ? "scale-110" : "opacity-60 hover:opacity-100"
              )}
              onClick={() => onToneChange(tone.value)}
              data-testid={`button-tone-${tone.value}`}
            >
              <span className="text-2xl">{tone.icon}</span>
              <span className="text-xs font-medium">{tone.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {tones[currentIndex].label} Tone
          </p>
          <p className="text-xs text-muted-foreground">
            {tones[currentIndex].description}
          </p>
        </div>
      </div>
    </Card>
  );
}
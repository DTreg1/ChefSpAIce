import { memo } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryLengthProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  mode?: "slider" | "select" | "both";
  className?: string;
}

export const SummaryLength = memo(function SummaryLength({
  value,
  onChange,
  disabled = false,
  mode = "both",
  className = "",
}: SummaryLengthProps) {
  const getLengthLabel = (length: number) => {
    if (length <= 2) return "Very Short";
    if (length <= 4) return "Short";
    if (length <= 6) return "Medium";
    if (length <= 8) return "Long";
    return "Very Long";
  };

  const getLengthDescription = (length: number) => {
    if (length === 1) return "1-2 sentences";
    if (length === 2) return "2-3 sentences";
    if (length === 3) return "3-5 sentences";
    if (length === 4) return "Short paragraph";
    if (length === 5) return "Medium paragraph";
    if (length === 6) return "Long paragraph";
    if (length === 7) return "2-3 paragraphs";
    if (length === 8) return "Half page";
    if (length === 9) return "Full page";
    return "Extended summary";
  };

  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  const handleSelectChange = (newValue: string) => {
    onChange(parseInt(newValue));
  };

  return (
    <Card className={className}>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="summary-length" className="text-sm font-medium">
            Summary Length
          </Label>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid="text-length-label">{getLengthLabel(value)}</span>
            <span data-testid="text-length-description">
              {getLengthDescription(value)}
            </span>
          </div>
        </div>

        {(mode === "slider" || mode === "both") && (
          <div className="space-y-2">
            <Slider
              id="summary-length"
              value={[value]}
              onValueChange={handleSliderChange}
              min={1}
              max={10}
              step={1}
              disabled={disabled}
              className="w-full"
              data-testid="slider-summary-length"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shortest</span>
              <span>Longest</span>
            </div>
          </div>
        )}

        {(mode === "select" || mode === "both") && (
          <Select
            value={value.toString()}
            onValueChange={handleSelectChange}
            disabled={disabled}
          >
            <SelectTrigger
              className="w-full"
              data-testid="select-summary-length"
            >
              <SelectValue placeholder="Select summary length" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" data-testid="select-item-1">
                Very Short (1-2 sentences)
              </SelectItem>
              <SelectItem value="2" data-testid="select-item-2">
                Very Short (2-3 sentences)
              </SelectItem>
              <SelectItem value="3" data-testid="select-item-3">
                Short (3-5 sentences)
              </SelectItem>
              <SelectItem value="4" data-testid="select-item-4">
                Short (paragraph)
              </SelectItem>
              <SelectItem value="5" data-testid="select-item-5">
                Medium (paragraph)
              </SelectItem>
              <SelectItem value="6" data-testid="select-item-6">
                Long (paragraph)
              </SelectItem>
              <SelectItem value="7" data-testid="select-item-7">
                Long (2-3 paragraphs)
              </SelectItem>
              <SelectItem value="8" data-testid="select-item-8">
                Extended (half page)
              </SelectItem>
              <SelectItem value="9" data-testid="select-item-9">
                Extended (full page)
              </SelectItem>
              <SelectItem value="10" data-testid="select-item-10">
                Maximum (extended summary)
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
});

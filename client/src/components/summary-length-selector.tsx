import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SummaryLengthSelectorProps {
  length: number;
  type: 'tldr' | 'bullet' | 'paragraph';
  onLengthChange: (length: number) => void;
  onTypeChange: (type: 'tldr' | 'bullet' | 'paragraph') => void;
}

export default function SummaryLengthSelector({ 
  length, 
  type, 
  onLengthChange, 
  onTypeChange 
}: SummaryLengthSelectorProps) {
  
  const getMaxLength = () => {
    switch (type) {
      case 'tldr':
        return 3; // 1-3 sentences
      case 'bullet':
        return 5; // 1-5 bullet points
      case 'paragraph':
        return 5; // 1-5 sentences
      default:
        return 3;
    }
  };

  const getLengthLabel = () => {
    switch (type) {
      case 'tldr':
        return `${length} sentence${length > 1 ? 's' : ''}`;
      case 'bullet':
        return `${length} bullet point${length > 1 ? 's' : ''}`;
      case 'paragraph':
        return `${length} sentence${length > 1 ? 's' : ''}`;
      default:
        return `${length}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="summary-type">Summary Format</Label>
        <RadioGroup
          value={type}
          onValueChange={(value) => onTypeChange(value as 'tldr' | 'bullet' | 'paragraph')}
          className="flex flex-row gap-4"
          data-testid="radio-summary-type"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tldr" id="tldr" />
            <Label htmlFor="tldr" className="font-normal cursor-pointer">
              TL;DR
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bullet" id="bullet" />
            <Label htmlFor="bullet" className="font-normal cursor-pointer">
              Bullet Points
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="paragraph" id="paragraph" />
            <Label htmlFor="paragraph" className="font-normal cursor-pointer">
              Paragraph
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Length Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="summary-length">Summary Length</Label>
          <span className="text-sm text-muted-foreground">{getLengthLabel()}</span>
        </div>
        <Slider
          id="summary-length"
          min={1}
          max={getMaxLength()}
          step={1}
          value={[length]}
          onValueChange={(value) => onLengthChange(value[0])}
          className="w-full"
          data-testid="slider-summary-length"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Shorter</span>
          <span>Longer</span>
        </div>
      </div>
    </div>
  );
}
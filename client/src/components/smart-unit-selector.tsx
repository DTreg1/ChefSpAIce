import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSmartUnitSuggestion,
  getAllAvailableUnits,
  formatUnitDisplay,
} from "@/lib/unit-suggestions";

interface SmartUnitSelectorProps {
  value: string;
  onChange: (value: string) => void;
  foodName?: string;
  foodCategory?: string | null;
  servingSizeUnit?: string | null;
  usdaData?: any;
  className?: string;
  placeholder?: string;
  "data-testid"?: string;
}

export function SmartUnitSelector({
  value,
  onChange,
  foodName = "",
  foodCategory,
  servingSizeUnit,
  usdaData,
  className,
  placeholder = "Select unit",
  "data-testid": dataTestId,
}: SmartUnitSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestion, setSuggestion] = useState<{
    primary: string;
    alternatives: string[];
    confidence: "high" | "medium" | "low";
  } | null>(null);

  const allUnits = getAllAvailableUnits();
  const filteredUnits = searchQuery
    ? allUnits.filter((unit) =>
        unit.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUnits;

  // Get smart suggestions when food info changes
  useEffect(() => {
    if (foodName) {
      const newSuggestion = getSmartUnitSuggestion(
        foodName,
        foodCategory,
        servingSizeUnit,
        usdaData
      );
      setSuggestion(newSuggestion);
      
      // Auto-select the primary suggestion if no value is set
      if (!value && newSuggestion.primary) {
        onChange(newSuggestion.primary);
      }
    }
  }, [foodName, foodCategory, servingSizeUnit, usdaData, onChange, value]);

  const handleSelectUnit = (unit: string) => {
    onChange(unit);
    setOpen(false);
    setSearchQuery("");
  };

  const getSuggestedUnits = () => {
    if (!suggestion) return [];
    return [suggestion.primary, ...suggestion.alternatives.slice(0, 3)];
  };

  const suggestedUnits = getSuggestedUnits();
  const isCurrentUnitSuggested = value && suggestedUnits.includes(value);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor="unit">Unit *</Label>
        {suggestion && suggestion.confidence === "high" && (
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-xs text-muted-foreground">
              Smart suggestion
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "justify-between flex-1",
                !value && "text-muted-foreground"
              )}
              data-testid={dataTestId || "button-unit-selector"}
            >
              <span className="truncate">
                {value ? formatUnitDisplay(value) : placeholder}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <div className="p-2 border-b">
              <Input
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
                data-testid="input-unit-search"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {suggestion && !searchQuery && (
                <>
                  <div className="p-2 border-b bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">
                        Suggested for {foodName || "this item"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {suggestedUnits.map((unit, index) => (
                        <Button
                          key={unit}
                          variant={value === unit ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-7",
                            index === 0 && suggestion.confidence === "high" &&
                              "ring-1 ring-primary"
                          )}
                          onClick={() => handleSelectUnit(unit)}
                          data-testid={`button-unit-suggested-${unit}`}
                        >
                          {formatUnitDisplay(unit)}
                          {value === unit && (
                            <Check className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      ))}
                    </div>
                    {suggestion.confidence !== "high" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {suggestion.confidence}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {searchQuery ? "Search results" : "All units"}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {filteredUnits.map((unit) => {
                    const isSuggested = suggestedUnits.includes(unit);
                    const isSelected = value === unit;

                    return (
                      <Button
                        key={unit}
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-7 justify-start",
                          isSuggested && !searchQuery && "font-medium"
                        )}
                        onClick={() => handleSelectUnit(unit)}
                        data-testid={`button-unit-${unit}`}
                      >
                        <span className="truncate">
                          {formatUnitDisplay(unit)}
                        </span>
                        {isSelected && <Check className="ml-auto h-3 w-3" />}
                      </Button>
                    );
                  })}
                </div>
                {filteredUnits.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No units found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick type custom unit */}
        <Input
          placeholder="Or type custom"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32"
          data-testid="input-unit-custom"
        />
      </div>

      {value && !isCurrentUnitSuggested && suggestedUnits.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: "{suggestedUnits[0]}" is commonly used for {foodName || "this type of item"}
        </p>
      )}
    </div>
  );
}
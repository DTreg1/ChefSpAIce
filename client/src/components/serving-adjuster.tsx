import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Users } from "lucide-react";
import { parseIngredient } from "@/utils/recipe-utils";

interface ServingAdjusterProps {
  originalServings: number;
  ingredients: string[];
  onServingsChange?: (servings: number, adjustedIngredients: string[]) => void;
}

export function ServingAdjuster({ 
  originalServings, 
  ingredients,
  onServingsChange 
}: ServingAdjusterProps) {
  const [currentServings, setCurrentServings] = useState(originalServings);
  const [showPerServing, setShowPerServing] = useState(false);
  
  const adjustServings = (newServings: number) => {
    if (newServings < 1 || newServings > 20) return;
    
    const ratio = newServings / originalServings;
    const adjustedIngredients = ingredients.map(ingredient => {
      const parsed = parseIngredient(ingredient);
      if (parsed.quantity && parsed.originalMatch) {
        const newQuantity = (parsed.quantity * ratio).toFixed(2)
          .replace(/\.?0+$/, ''); // Remove trailing zeros
        
        const matchIndex = ingredient.indexOf(parsed.originalMatch);
        const rest = matchIndex >= 0 ? ingredient.substring(matchIndex + parsed.originalMatch.length) : '';
        return `${newQuantity}${parsed.unit ? ' ' + parsed.unit : ''}${rest}`;
      }
      return ingredient;
    });
    
    setCurrentServings(newServings);
    onServingsChange?.(newServings, adjustedIngredients);
  };
  
  const getPerServingIngredients = () => {
    return ingredients.map(ingredient => {
      const parsed = parseIngredient(ingredient);
      if (parsed.quantity && parsed.originalMatch) {
        const perServing = (parsed.quantity / currentServings).toFixed(2)
          .replace(/\.?0+$/, ''); // Remove trailing zeros
        
        const matchIndex = ingredient.indexOf(parsed.originalMatch);
        const rest = matchIndex >= 0 ? ingredient.substring(matchIndex + parsed.originalMatch.length) : '';
        return `${perServing}${parsed.unit ? ' ' + parsed.unit : ''}${rest} per serving`;
      }
      return `${ingredient} per serving`;
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => adjustServings(currentServings - 1)}
            disabled={currentServings <= 1}
            className="h-8 w-8"
            data-testid="button-decrease-servings"
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold" data-testid="text-current-servings">
              {currentServings} {currentServings === 1 ? 'serving' : 'servings'}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => adjustServings(currentServings + 1)}
            disabled={currentServings >= 20}
            className="h-8 w-8"
            data-testid="button-increase-servings"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPerServing(!showPerServing)}
          data-testid="button-toggle-per-serving"
        >
          {showPerServing ? 'Show Total' : 'Show Per Serving'}
        </Button>
      </div>
      
      {currentServings !== originalServings && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustServings(originalServings)}
          className="text-xs text-muted-foreground"
          data-testid="button-reset-servings"
        >
          Reset to original ({originalServings} servings)
        </Button>
      )}
      
      {showPerServing && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-2">Per Serving Breakdown:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {getPerServingIngredients().map((ingredient, idx) => (
              <li key={idx} data-testid={`text-per-serving-ingredient-${idx}`}>
                {ingredient}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
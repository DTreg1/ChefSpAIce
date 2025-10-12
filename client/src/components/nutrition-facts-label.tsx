import type { NutritionInfo } from "@shared/schema";

interface NutritionFactsLabelProps {
  nutrition: NutritionInfo;
  foodName?: string;
}

export function NutritionFactsLabel({ nutrition, foodName }: NutritionFactsLabelProps) {
  const servingSize = nutrition.servingSize || "100";
  const servingUnit = nutrition.servingUnit || "g";

  const calculateDV = (value: number | undefined, dv: number): number => {
    if (!value) return 0;
    return Math.round((value / dv) * 100);
  };

  const totalFatDV = calculateDV(nutrition.fat, 78);
  const sodiumDV = calculateDV(nutrition.sodium, 2300);
  const totalCarbDV = calculateDV(nutrition.carbs, 275);
  const fiberDV = calculateDV(nutrition.fiber, 28);
  const proteinDV = calculateDV(nutrition.protein, 50);

  return (
    <div 
      className="border-2 border-foreground rounded-md p-2 w-full max-w-xs bg-background font-sans"
      data-testid="nutrition-facts-label"
    >
      <div className="border-b-8 border-foreground pb-1">
        <h2 className="text-3xl font-black">Nutrition Facts</h2>
        {foodName && (
          <p className="text-sm mt-1 font-medium">{foodName}</p>
        )}
      </div>

      <div className="border-b-4 border-foreground py-1">
        <p className="text-sm">
          <span className="font-semibold">Serving size</span> {servingSize}{servingUnit}
        </p>
      </div>

      <div className="border-b-8 border-foreground pt-1 pb-2">
        <p className="text-xs font-semibold">Amount per serving</p>
        <div className="flex justify-between items-end">
          <span className="text-3xl font-black">Calories</span>
          <span className="text-4xl font-black" data-testid="calories-value">
            {Math.round(nutrition.calories)}
          </span>
        </div>
      </div>

      <div className="border-b border-foreground py-1">
        <p className="text-xs font-semibold text-right">% Daily Value*</p>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div>
          <span className="font-bold">Total Fat</span> {nutrition.fat?.toFixed(1) || 0}g
        </div>
        <span className="font-bold" data-testid="fat-dv">{totalFatDV}%</span>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div className="ml-4">
          <span className="font-bold">Saturated Fat</span> 0g
        </div>
        <span className="font-bold">0%</span>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div className="ml-4">
          <span className="font-bold">Trans Fat</span> 0g
        </div>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div>
          <span className="font-bold">Cholesterol</span> 0mg
        </div>
        <span className="font-bold">0%</span>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div>
          <span className="font-bold">Sodium</span> {nutrition.sodium?.toFixed(0) || 0}mg
        </div>
        <span className="font-bold" data-testid="sodium-dv">{sodiumDV}%</span>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div>
          <span className="font-bold">Total Carbohydrate</span> {nutrition.carbs?.toFixed(1) || 0}g
        </div>
        <span className="font-bold" data-testid="carbs-dv">{totalCarbDV}%</span>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div className="ml-4">
          <span className="font-bold">Dietary Fiber</span> {nutrition.fiber?.toFixed(1) || 0}g
        </div>
        <span className="font-bold" data-testid="fiber-dv">{fiberDV}%</span>
      </div>

      <div className="border-b border-foreground py-1 flex justify-between">
        <div className="ml-4">
          <span className="font-bold">Total Sugars</span> {nutrition.sugar?.toFixed(1) || 0}g
        </div>
      </div>

      <div className="border-b-8 border-foreground py-1 flex justify-between">
        <div>
          <span className="font-bold">Protein</span> {nutrition.protein?.toFixed(1) || 0}g
        </div>
        <span className="font-bold" data-testid="protein-dv">{proteinDV}%</span>
      </div>

      <div className="pt-2 text-xs leading-tight">
        <p className="border-b border-foreground pb-1">
          * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 
          2,000 calories a day is used for general nutrition advice.
        </p>
      </div>
    </div>
  );
}

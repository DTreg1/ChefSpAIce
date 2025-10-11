import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ChefHat, CheckCircle2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface RecipeCardProps {
  title: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  usedIngredients: string[];
  missingIngredients?: string[];
}

export function RecipeCard({
  title,
  prepTime,
  cookTime,
  servings,
  ingredients,
  instructions,
  usedIngredients,
  missingIngredients = [],
}: RecipeCardProps) {
  return (
    <Card className="border-2 border-primary/20 shadow-md" data-testid="card-recipe">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl font-serif font-semibold text-foreground" data-testid="text-recipe-title">
            {title}
          </CardTitle>
          <Badge variant="secondary" className="flex-shrink-0 gap-1" data-testid="badge-ai-generated">
            <ChefHat className="w-3 h-3" />
            AI Generated
          </Badge>
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {prepTime && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-prep-time">
              <Clock className="w-4 h-4" />
              <span>Prep: {prepTime}</span>
            </div>
          )}
          {cookTime && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-cook-time">
              <Clock className="w-4 h-4" />
              <span>Cook: {cookTime}</span>
            </div>
          )}
          {servings && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-servings">
              <Users className="w-4 h-4" />
              <span>{servings} servings</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-base mb-3 text-foreground">Ingredients</h3>
          <ul className="space-y-2">
            {ingredients.map((ingredient, idx) => {
              const isAvailable = usedIngredients.some(used => 
                ingredient.toLowerCase().includes(used.toLowerCase())
              );
              const isMissing = missingIngredients.some(missing => 
                ingredient.toLowerCase().includes(missing.toLowerCase())
              );

              return (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-base"
                  data-testid={`text-ingredient-${idx}`}
                >
                  {isAvailable && (
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  {isMissing && (
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  {!isAvailable && !isMissing && (
                    <span className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className={isMissing ? "text-muted-foreground line-through" : ""}>
                    {ingredient}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-base mb-3 text-foreground">Instructions</h3>
          <ol className="space-y-3">
            {instructions.map((instruction, idx) => (
              <li
                key={idx}
                className="flex gap-3 text-base leading-relaxed"
                data-testid={`text-instruction-${idx}`}
              >
                <span className="font-semibold text-primary flex-shrink-0">{idx + 1}.</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  Users,
  ChefHat,
  Utensils,
  AlertCircle,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Recipe } from "@shared/schema";
import { format } from "date-fns";

interface DuplicateComparisonProps {
  content1: Recipe | any;
  content2: Recipe | any;
  contentType: "recipe" | "chat" | "inventory";
  similarity: number;
  onMerge?: (keepId: string, mergeFromId: string) => void;
  onKeepBoth?: () => void;
  onMarkUnique?: () => void;
}

export function DuplicateComparison({
  content1,
  content2,
  contentType,
  similarity,
  onMerge,
  onKeepBoth,
  onMarkUnique,
}: DuplicateComparisonProps) {
  const [selectedKeep, setSelectedKeep] = useState<"left" | "right" | null>(
    null,
  );

  const renderRecipeComparison = (recipe1: Recipe, recipe2: Recipe) => {
    const differences = {
      title: recipe1.title !== recipe2.title,
      description: recipe1.description !== recipe2.description,
      servings: recipe1.servings !== recipe2.servings,
      prepTime: recipe1.prepTime !== recipe2.prepTime,
      cookTime: recipe1.cookTime !== recipe2.cookTime,
      ingredients:
        JSON.stringify(recipe1.ingredients) !==
        JSON.stringify(recipe2.ingredients),
      instructions:
        JSON.stringify(recipe1.instructions) !==
        JSON.stringify(recipe2.instructions),
    };

    const hasDifferences = Object.values(differences).some((d) => d);

    return (
      <div className="grid grid-cols-2 gap-6">
        <ContentCard
          content={recipe1}
          isSelected={selectedKeep === "left"}
          onSelect={() => setSelectedKeep("left")}
          side="left"
          differences={differences}
          data-testid="card-comparison-left"
        />
        <ContentCard
          content={recipe2}
          isSelected={selectedKeep === "right"}
          onSelect={() => setSelectedKeep("right")}
          side="right"
          differences={differences}
          data-testid="card-comparison-right"
        />
      </div>
    );
  };

  const renderChatComparison = (chat1: any, chat2: any) => {
    return (
      <div className="grid grid-cols-2 gap-6">
        <ChatCard
          content={chat1}
          isSelected={selectedKeep === "left"}
          onSelect={() => setSelectedKeep("left")}
          side="left"
        />
        <ChatCard
          content={chat2}
          isSelected={selectedKeep === "right"}
          onSelect={() => setSelectedKeep("right")}
          side="right"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Content Comparison</h2>
          <p className="text-muted-foreground">
            Review and compare the duplicate content side-by-side
          </p>
        </div>
        <Badge
          variant={
            similarity >= 0.95
              ? "destructive"
              : similarity >= 0.85
                ? "secondary"
                : "outline"
          }
          className="text-lg px-3 py-1"
          data-testid="badge-similarity-score"
        >
          {Math.round(similarity * 100)}% Similar
        </Badge>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visual">Visual Comparison</TabsTrigger>
          <TabsTrigger value="differences">Differences Only</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-6">
          {contentType === "recipe" &&
            renderRecipeComparison(content1, content2)}
          {contentType === "chat" && renderChatComparison(content1, content2)}
        </TabsContent>

        <TabsContent value="differences" className="mt-6">
          <DifferencesView
            content1={content1}
            content2={content2}
            contentType={contentType}
          />
        </TabsContent>

        <TabsContent value="raw" className="mt-6">
          <RawDataView content1={content1} content2={content2} />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedKeep && (
            <span>
              You've selected to keep the{" "}
              <strong>{selectedKeep === "left" ? "first" : "second"}</strong>{" "}
              item
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onMarkUnique && (
            <Button
              variant="outline"
              onClick={onMarkUnique}
              data-testid="button-mark-unique"
            >
              <X className="h-4 w-4 mr-2" />
              Not Duplicates
            </Button>
          )}
          {onKeepBoth && (
            <Button
              variant="secondary"
              onClick={onKeepBoth}
              data-testid="button-keep-both"
            >
              Keep Both
            </Button>
          )}
          {onMerge && selectedKeep && (
            <Button
              onClick={() => {
                if (selectedKeep === "left") {
                  onMerge(content1.id, content2.id);
                } else {
                  onMerge(content2.id, content1.id);
                }
              }}
              data-testid="button-merge-selected"
            >
              {selectedKeep === "left" ? (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Merge into First
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Merge into Second
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentCard({
  content,
  isSelected,
  onSelect,
  side,
  differences,
  ...props
}: any) {
  const recipe = content as Recipe;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      }`}
      onClick={onSelect}
      {...props}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle
            className={`text-lg ${differences?.title ? "text-amber-600 dark:text-amber-400" : ""}`}
          >
            {recipe.title}
          </CardTitle>
          {isSelected && (
            <Badge variant="default" data-testid={`badge-selected-${side}`}>
              <Check className="h-3 w-3 mr-1" />
              Selected
            </Badge>
          )}
        </div>
        {recipe.description && (
          <CardDescription
            className={
              differences?.description
                ? "text-amber-600 dark:text-amber-400"
                : ""
            }
          >
            {recipe.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span
                className={
                  differences?.servings
                    ? "text-amber-600 dark:text-amber-400"
                    : ""
                }
              >
                {recipe.servings} servings
              </span>
            </div>
            {recipe.prepTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span
                  className={
                    differences?.prepTime
                      ? "text-amber-600 dark:text-amber-400"
                      : ""
                  }
                >
                  Prep: {recipe.prepTime}
                </span>
              </div>
            )}
            {recipe.cookTime && (
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-muted-foreground" />
                <span
                  className={
                    differences?.cookTime
                      ? "text-amber-600 dark:text-amber-400"
                      : ""
                  }
                >
                  Cook: {recipe.cookTime}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {recipe.difficulty && (
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <span>{recipe.difficulty}</span>
              </div>
            )}
            {recipe.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs">
                  {format(new Date(recipe.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
        </div>

        {recipe.ingredients && (
          <div
            className={`space-y-1 ${differences?.ingredients ? "border-l-2 border-amber-500 pl-3" : ""}`}
          >
            <Label className="text-sm font-medium">
              Ingredients ({recipe.ingredients.length})
            </Label>
            <ScrollArea className="h-24">
              <ul className="text-sm text-muted-foreground space-y-1">
                {recipe.ingredients
                  .slice(0, 5)
                  .map((ing: string, idx: number) => (
                    <li key={idx} className="truncate">
                      • {ing}
                    </li>
                  ))}
                {recipe.ingredients.length > 5 && (
                  <li className="text-xs">
                    ...and {recipe.ingredients.length - 5} more
                  </li>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}

        {differences && Object.values(differences).some((d) => d) && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            Has differences from the other version
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChatCard({ content, isSelected, onSelect, side }: any) {
  const chat = content;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      }`}
      onClick={onSelect}
      data-testid={`card-chat-${side}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <Badge variant="outline">{chat.role}</Badge>
          {isSelected && (
            <Badge variant="default">
              <Check className="h-3 w-3 mr-1" />
              Selected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{chat.content}</p>
        {chat.createdAt && (
          <p className="text-xs text-muted-foreground mt-2">
            {format(new Date(chat.createdAt), "MMM d, yyyy h:mm a")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DifferencesView({ content1, content2, contentType }: any) {
  const getDifferences = () => {
    const diffs: any[] = [];
    const keys = new Set([...Object.keys(content1), ...Object.keys(content2)]);

    keys.forEach((key) => {
      if (key === "id" || key === "createdAt" || key === "updatedAt") return;

      const val1 = JSON.stringify(content1[key]);
      const val2 = JSON.stringify(content2[key]);

      if (val1 !== val2) {
        diffs.push({
          field: key,
          value1: content1[key],
          value2: content2[key],
        });
      }
    });

    return diffs;
  };

  const differences = getDifferences();

  return (
    <div className="space-y-4">
      {differences.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No significant differences found between these items.
            </p>
          </CardContent>
        </Card>
      ) : (
        differences.map((diff, idx) => (
          <Card key={idx} data-testid={`card-difference-${diff.field}`}>
            <CardHeader>
              <CardTitle className="text-sm font-medium capitalize">
                {diff.field.replace(/([A-Z])/g, " $1").trim()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">First Item</Label>
                  <div className="p-2 bg-secondary rounded text-sm">
                    {typeof diff.value1 === "object"
                      ? JSON.stringify(diff.value1, null, 2)
                      : diff.value1 || (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Second Item</Label>
                  <div className="p-2 bg-secondary rounded text-sm">
                    {typeof diff.value2 === "object"
                      ? JSON.stringify(diff.value2, null, 2)
                      : diff.value2 || (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function RawDataView({ content1, content2 }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">First Item (Raw JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <pre className="text-xs">{JSON.stringify(content1, null, 2)}</pre>
          </ScrollArea>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Second Item (Raw JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <pre className="text-xs">{JSON.stringify(content2, null, 2)}</pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

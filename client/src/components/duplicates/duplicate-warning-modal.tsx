import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Check, Edit, Merge, X } from "lucide-react";
import { Recipe } from "@shared/schema";

interface DuplicateItem {
  id: string;
  title?: string;
  similarity: number;
  status: string;
  content?: Recipe | any;
}

interface DuplicateWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateItem[];
  contentType: "recipe" | "chat" | "inventory";
  onProceed: () => void;
  onEdit: () => void;
  onMerge?: (targetId: string) => void;
}

export function DuplicateWarningModal({
  open,
  onOpenChange,
  duplicates,
  contentType,
  onProceed,
  onEdit,
  onMerge,
}: DuplicateWarningModalProps) {
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<string | null>(
    null,
  );

  const getContentTypeName = () => {
    switch (contentType) {
      case "recipe":
        return "recipe";
      case "chat":
        return "message";
      case "inventory":
        return "item";
      default:
        return "content";
    }
  };

  const highestSimilarity = Math.max(...duplicates.map((d) => d.similarity));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Duplicate Content Detected
          </DialogTitle>
          <DialogDescription>
            We found {duplicates.length} existing {getContentTypeName()}
            {duplicates.length > 1 ? "s" : ""} that{" "}
            {duplicates.length > 1 ? "are" : "is"} very similar to what you're
            trying to submit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              The highest similarity is{" "}
              <strong>{Math.round(highestSimilarity * 100)}%</strong> with
              existing content. This may be a duplicate. Please review before
              proceeding.
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {duplicates.map((duplicate) => (
                <Card
                  key={duplicate.id}
                  className={`cursor-pointer transition-all ${
                    selectedMergeTarget === duplicate.id
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedMergeTarget(duplicate.id)}
                  data-testid={`card-duplicate-${duplicate.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium">
                        {duplicate.title || `Untitled ${getContentTypeName()}`}
                      </CardTitle>
                      <Badge
                        variant={
                          duplicate.similarity >= 0.95
                            ? "destructive"
                            : duplicate.similarity >= 0.85
                              ? "secondary"
                              : "outline"
                        }
                        data-testid={`badge-similarity-${duplicate.id}`}
                      >
                        {Math.round(duplicate.similarity * 100)}% similar
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <SimilarityScore score={duplicate.similarity} />
                      {duplicate.content?.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {duplicate.content.description}
                        </p>
                      )}
                      {selectedMergeTarget === duplicate.id && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <Check className="h-3 w-3" />
                          Selected for merge
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onEdit}
            className="w-full sm:w-auto"
            data-testid="button-edit-content"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Content
          </Button>
          {onMerge && selectedMergeTarget && (
            <Button
              variant="secondary"
              onClick={() => onMerge(selectedMergeTarget)}
              className="w-full sm:w-auto"
              data-testid="button-merge-content"
            >
              <Merge className="h-4 w-4 mr-2" />
              Merge with Selected
            </Button>
          )}
          <Button
            variant="default"
            onClick={onProceed}
            className="w-full sm:w-auto"
            data-testid="button-proceed-anyway"
          >
            <Check className="h-4 w-4 mr-2" />
            Create Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// SimilarityScore Visualization Component
export function SimilarityScore({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (percentage >= 95) return "bg-red-500 dark:bg-red-600";
    if (percentage >= 85) return "bg-amber-500 dark:bg-amber-600";
    if (percentage >= 70) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-green-500 dark:bg-green-600";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Similarity</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${getColor()}`}
          style={{ width: `${percentage}%` }}
          data-testid="similarity-progress-bar"
        />
      </div>
    </div>
  );
}

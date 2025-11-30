import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Edit, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { type GeneratedDraft } from "@shared/schema";

interface DraftSuggestionsProps {
  drafts: GeneratedDraft[];
  isLoading?: boolean;
  onSelectDraft: (draft: GeneratedDraft) => void;
  onEditDraft: (draft: GeneratedDraft) => void;
  onRegenerateDraft: (draft: GeneratedDraft) => void;
}

const toneColors: Record<string, string> = {
  formal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  casual: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  friendly: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  apologetic: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "solution-focused": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  empathetic: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

export function DraftSuggestions({
  drafts,
  isLoading,
  onSelectDraft,
  onEditDraft,
  onRegenerateDraft,
}: DraftSuggestionsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyDraft = async (draft: GeneratedDraft) => {
    try {
      await navigator.clipboard.writeText(draft.editedContent || draft.generatedContent);
      setCopiedId(draft.id);
      onSelectDraft(draft);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Draft copied successfully",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy draft. Please check your browser permissions or try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-20" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-4/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <p className="text-muted-foreground">
            No drafts generated yet. Enter a message above to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {drafts.slice(0, 3).map((draft) => (
        <Card key={draft.id} className="relative hover-elevate">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="secondary"
                className={toneColors[draft.metadata?.tone || ""] || ""}
                data-testid={`tone-badge-${draft.metadata?.tone}`}
              >
                {draft.metadata?.tone || "formal"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRegenerateDraft(draft)}
                title="Regenerate this draft"
                data-testid="button-regenerate-draft"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm whitespace-pre-wrap line-clamp-6">
              {draft.editedContent || draft.generatedContent}
            </p>
          </CardContent>
          <CardFooter className="pt-0 gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleCopyDraft(draft)}
              disabled={copiedId === draft.id}
              data-testid="button-copy-draft"
            >
              {copiedId === draft.id ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Use
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditDraft(draft)}
              data-testid="button-edit-draft"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
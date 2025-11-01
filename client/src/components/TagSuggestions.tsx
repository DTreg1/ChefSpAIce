/**
 * TagSuggestions Component
 * 
 * Displays AI-generated tag suggestions with approve/reject functionality.
 * Features:
 * - Visual indication of tag source (AI, keyword extraction, entity recognition)
 * - Relevance score display
 * - Batch approve/reject actions
 * - Real-time feedback on user actions
 */

import { useState } from "react";
import { Check, X, Sparkles, Hash, Brain, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TagSuggestion {
  id: string;
  name: string;
  relevanceScore: number;
  source: 'keyword-extraction' | 'entity-recognition' | 'ai-generated';
  status?: 'pending' | 'approved' | 'rejected';
}

interface TagSuggestionsProps {
  contentId: string;
  contentType: string;
  suggestions: TagSuggestion[];
  onUpdate?: () => void;
  className?: string;
}

export function TagSuggestions({
  contentId,
  contentType,
  suggestions: initialSuggestions,
  onUpdate,
  className,
}: TagSuggestionsProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>(
    initialSuggestions.map(s => ({ ...s, status: 'pending' as const }))
  );

  // Mutation for approving/rejecting tags
  const approveMutation = useMutation({
    mutationFn: async (data: { approvedTags: string[], rejectedTags: string[] }) => {
      return apiRequest("/api/ml/tags/approve", "POST", {
        contentId,
        contentType,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ml/content/${contentId}/tags`] });
      onUpdate?.();
      toast({
        title: "Tags updated",
        description: "Your tag selections have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update tags. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle individual tag status change
  const handleTagStatus = (tagId: string, status: 'approved' | 'rejected') => {
    setSuggestions(prev => prev.map(tag => 
      tag.id === tagId ? { ...tag, status } : tag
    ));
  };

  // Handle batch approve/reject
  const handleBatchAction = (action: 'approve' | 'reject') => {
    setSuggestions(prev => prev.map(tag => 
      tag.status === 'pending' ? { ...tag, status: action === 'approve' ? 'approved' : 'rejected' } : tag
    ));
  };

  // Submit changes
  const handleSubmit = () => {
    const approvedTags = suggestions
      .filter(s => s.status === 'approved')
      .map(s => s.id);
    const rejectedTags = suggestions
      .filter(s => s.status === 'rejected')
      .map(s => s.id);
      
    approveMutation.mutate({ approvedTags, rejectedTags });
  };

  // Get icon for source
  const getSourceIcon = (source: TagSuggestion['source']) => {
    switch (source) {
      case 'keyword-extraction':
        return <Hash className="h-3 w-3" />;
      case 'entity-recognition':
        return <Brain className="h-3 w-3" />;
      case 'ai-generated':
        return <Sparkles className="h-3 w-3" />;
    }
  };

  // Get source label
  const getSourceLabel = (source: TagSuggestion['source']) => {
    switch (source) {
      case 'keyword-extraction':
        return 'Keyword';
      case 'entity-recognition':
        return 'Entity';
      case 'ai-generated':
        return 'AI Generated';
    }
  };

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const approvedCount = suggestions.filter(s => s.status === 'approved').length;
  const rejectedCount = suggestions.filter(s => s.status === 'rejected').length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Tag Suggestions
        </CardTitle>
        <CardDescription>
          Review and approve AI-generated tags for your content
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">Pending: {pendingCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-green-600">Approved: {approvedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-600">Rejected: {rejectedCount}</span>
          </div>
        </div>

        {/* Batch Actions */}
        {pendingCount > 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction('approve')}
              data-testid="button-approve-all"
            >
              <Check className="mr-1 h-3 w-3" />
              Approve All Pending
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction('reject')}
              data-testid="button-reject-all"
            >
              <X className="mr-1 h-3 w-3" />
              Reject All Pending
            </Button>
          </div>
        )}

        {/* Tag List */}
        <div className="space-y-2">
          {suggestions.map((tag) => (
            <div
              key={tag.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg border transition-all",
                tag.status === 'approved' && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
                tag.status === 'rejected' && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
                tag.status === 'pending' && "hover-elevate"
              )}
              data-testid={`tag-suggestion-item-${tag.name}`}
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1">
                  {getSourceIcon(tag.source)}
                  {getSourceLabel(tag.source)}
                </Badge>
                
                <span className="font-medium">{tag.name}</span>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Relevance:
                  </span>
                  <Progress 
                    value={tag.relevanceScore * 100} 
                    className="h-1.5 w-16"
                  />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(tag.relevanceScore * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="flex gap-1">
                {tag.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTagStatus(tag.id, 'approved')}
                      className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 dark:hover:bg-green-900"
                      data-testid={`approve-tag-${tag.name}`}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTagStatus(tag.id, 'rejected')}
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                      data-testid={`reject-tag-${tag.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {tag.status === 'approved' && (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="mr-1 h-3 w-3" />
                    Approved
                  </Badge>
                )}
                {tag.status === 'rejected' && (
                  <Badge variant="destructive">
                    <X className="mr-1 h-3 w-3" />
                    Rejected
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {(approvedCount > 0 || rejectedCount > 0) && (
          <Button
            onClick={handleSubmit}
            disabled={approveMutation.isPending}
            className="w-full"
            data-testid="button-save-tags"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save Tag Selections
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Sparkles, Tag, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutoCategorizationProps {
  contentId: string;
  contentType: 'recipe' | 'inventory';
  currentCategory?: string;
  currentTags?: string[];
  onCategoryUpdate?: (category: string) => void;
  onTagsUpdate?: (tags: string[]) => void;
}

export function AutoCategorization({
  contentId,
  contentType,
  currentCategory,
  currentTags = [],
  onCategoryUpdate,
  onTagsUpdate,
}: AutoCategorizationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Categorization mutation
  const categorizeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', API_ENDPOINTS.ml.categorize, {
        contentId,
        contentType
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.category && onCategoryUpdate) {
        onCategoryUpdate(data.category);
      }
      toast({
        title: "Categorization Complete",
        description: `Category: ${data.category}`,
      });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.recipes.list, API_ENDPOINTS.inventory.foodItems] });
    },
    onError: (error: any) => {
      toast({
        title: "Categorization Failed",
        description: error.message || "Failed to categorize content",
        variant: "destructive",
      });
    },
  });

  // Auto-tagging mutation
  const autoTagMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', API_ENDPOINTS.ml.tags.generate, {
        contentId,
        contentType
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.tags && onTagsUpdate) {
        onTagsUpdate(data.tags);
      }
      toast({
        title: "Auto-Tagging Complete",
        description: `Added ${data.tags.length} tags`,
      });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.recipes.list, API_ENDPOINTS.inventory.foodItems] });
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Tagging Failed",
        description: error.message || "Failed to generate tags",
        variant: "destructive",
      });
    },
  });

  // Batch categorization for all uncategorized content
  const batchCategorizeMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const response = await apiRequest('POST', API_ENDPOINTS.ml.categorizeBatch);
      const data = await response.json();
      setIsProcessing(false);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Categorization Complete",
        description: `Categorized ${data.processed} items`,
      });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.recipes.list, API_ENDPOINTS.inventory.foodItems] });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Batch Categorization Failed",
        description: error.message || "Failed to categorize items",
        variant: "destructive",
      });
    },
  });

  const handleCategorize = () => {
    categorizeMutation.mutate();
  };

  const handleAutoTag = () => {
    autoTagMutation.mutate();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCategorize}
          disabled={categorizeMutation.isPending}
          data-testid={`button-categorize-${contentId}`}
        >
          {categorizeMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <FolderOpen className="h-4 w-4 mr-1" />
          )}
          {currentCategory ? 'Re-categorize' : 'Auto-Categorize'}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleAutoTag}
          disabled={autoTagMutation.isPending}
          data-testid={`button-auto-tag-${contentId}`}
        >
          {autoTagMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Tag className="h-4 w-4 mr-1" />
          )}
          Generate Tags
        </Button>
      </div>

      {currentCategory && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">Category:</span>
          <Badge variant="secondary" data-testid={`badge-category-${contentId}`}>
            <FolderOpen className="h-3 w-3 mr-1" />
            {currentCategory}
          </Badge>
        </div>
      )}

      {currentTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {currentTags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-tag-${tag}`}>
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface BatchCategorizationDialogProps {
  trigger?: React.ReactNode;
}

export function BatchCategorizationDialog({ trigger }: BatchCategorizationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Get uncategorized items stats
  const { data: stats } = useQuery({
    queryKey: [API_ENDPOINTS.ml.stats.uncategorized],
    queryFn: async () => {
      const response = await apiRequest('GET', API_ENDPOINTS.ml.stats.uncategorized);
      return response.json();
    },
  });

  // Batch categorization mutation
  const batchMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      setProgress(0);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);
      
      try {
        const response = await apiRequest('POST', API_ENDPOINTS.ml.categorizeBatch);
        const data = await response.json();
        clearInterval(progressInterval);
        setProgress(100);
        return data;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Processing Complete",
        description: `Successfully categorized ${data.processed} items`,
      });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.recipes.list, API_ENDPOINTS.inventory.foodItems] });
      setIsProcessing(false);
      setProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Batch Processing Failed",
        description: error.message || "Failed to process items",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProgress(0);
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" data-testid="button-batch-categorization">
            <Sparkles className="h-4 w-4 mr-2" />
            Batch Categorization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Batch Categorization</DialogTitle>
          <DialogDescription>
            Use AI to automatically categorize and tag all uncategorized items in your inventory
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Uncategorized Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Recipes:</span>
                  <span className="font-medium" data-testid="text-uncategorized-recipes">
                    {stats?.recipes || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Inventory Items:</span>
                  <span className="font-medium" data-testid="text-uncategorized-inventory">
                    {stats?.inventory || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                  <span>Total:</span>
                  <span data-testid="text-uncategorized-total">
                    {(stats?.recipes || 0) + (stats?.inventory || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <Button
            onClick={() => batchMutation.mutate()}
            disabled={isProcessing || batchMutation.isPending || 
                     ((stats?.recipes || 0) + (stats?.inventory || 0)) === 0}
            className="w-full"
            data-testid="button-start-batch-categorization"
          >
            {isProcessing || batchMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Categorization
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
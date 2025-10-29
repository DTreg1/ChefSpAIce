import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Loader2, AlertTriangle, Merge, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DuplicatePair {
  id: string;
  contentId1: string;
  contentId2: string;
  content1: any;
  content2: any;
  contentType: 'recipe' | 'inventory';
  similarity: number;
  isResolved: boolean;
  resolutionAction?: string;
}

export function DuplicateDetection() {
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  // Get duplicate pairs
  const { data: duplicates, isLoading, refetch } = useQuery<DuplicatePair[]>({
    queryKey: ['/api/ml/duplicates'],
    queryFn: () => apiRequest('/api/ml/duplicates', { method: 'GET' }),
  });

  // Scan for duplicates mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      const response = await apiRequest('/api/ml/duplicates/scan', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Scan Complete",
        description: `Found ${data.found} duplicate pairs`,
      });
      refetch();
      setIsScanning(false);
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan for duplicates",
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });

  // Resolve duplicate mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ duplicateId, action, keepId }: {
      duplicateId: string;
      action: 'merge' | 'keep_both' | 'delete';
      keepId?: string;
    }) => {
      return apiRequest('/api/ml/duplicates/resolve', {
        method: 'POST',
        body: JSON.stringify({ duplicateId, action, keepId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Duplicate Resolved",
        description: "The duplicate has been successfully resolved",
      });
      refetch();
      setSelectedPair(null);
    },
    onError: (error: any) => {
      toast({
        title: "Resolution Failed",
        description: error.message || "Failed to resolve duplicate",
        variant: "destructive",
      });
    },
  });

  const handleScan = () => {
    scanMutation.mutate();
  };

  const handleResolve = (action: 'merge' | 'keep_both' | 'delete', keepId?: string) => {
    if (!selectedPair) return;
    resolveMutation.mutate({
      duplicateId: selectedPair.id,
      action,
      keepId,
    });
  };

  const unresolvedCount = duplicates?.filter(d => !d.isResolved).length || 0;

  const renderContentCard = (content: any, contentType: string) => {
    if (!content) return null;
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">{content.title || content.name || 'Unnamed'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {content.description && (
            <p className="text-muted-foreground">{content.description}</p>
          )}
          {content.ingredients && (
            <div>
              <strong>Ingredients:</strong>
              <ul className="list-disc list-inside mt-1">
                {content.ingredients.slice(0, 3).map((ing: string, idx: number) => (
                  <li key={idx} className="text-muted-foreground">{ing}</li>
                ))}
                {content.ingredients.length > 3 && (
                  <li className="text-muted-foreground">...and {content.ingredients.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
          {content.quantity && (
            <p><strong>Quantity:</strong> {content.quantity} {content.unit}</p>
          )}
          {content.expirationDate && (
            <p><strong>Expires:</strong> {new Date(content.expirationDate).toLocaleDateString()}</p>
          )}
          {content.createdAt && (
            <p className="text-xs text-muted-foreground">
              Created: {new Date(content.createdAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Duplicate Detection</h2>
          <p className="text-muted-foreground">
            Find and resolve duplicate recipes and inventory items
          </p>
        </div>
        <Button
          onClick={handleScan}
          disabled={isScanning || scanMutation.isPending}
          data-testid="button-scan-duplicates"
        >
          {isScanning || scanMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Scan for Duplicates
            </>
          )}
        </Button>
      </div>

      {unresolvedCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {unresolvedCount} unresolved duplicate{unresolvedCount !== 1 ? 's' : ''} that need attention.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {duplicates && duplicates.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No duplicates found. Click "Scan for Duplicates" to check for potential duplicates.
            </p>
          </CardContent>
        </Card>
      )}

      {duplicates && duplicates.length > 0 && (
        <div className="space-y-4">
          {duplicates.filter(d => !d.isResolved).map((pair) => (
            <Card 
              key={pair.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedPair(pair)}
              data-testid={`card-duplicate-${pair.id}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Potential Duplicate {pair.contentType === 'recipe' ? 'Recipe' : 'Item'}
                  </CardTitle>
                  <Badge variant="secondary" data-testid={`badge-similarity-${pair.id}`}>
                    {Math.round(pair.similarity * 100)}% Similar
                  </Badge>
                </div>
                <CardDescription>
                  {pair.content1?.title || pair.content1?.name || 'Item 1'} vs{' '}
                  {pair.content2?.title || pair.content2?.name || 'Item 2'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPair(pair);
                  }}
                  data-testid={`button-view-details-${pair.id}`}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedPair} onOpenChange={() => setSelectedPair(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Resolve Duplicate</DialogTitle>
            <DialogDescription>
              Review the details and decide how to handle this duplicate.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPair && (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Item 1</h4>
                    {renderContentCard(selectedPair.content1, selectedPair.contentType)}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Item 2</h4>
                    {renderContentCard(selectedPair.content2, selectedPair.contentType)}
                  </div>
                </div>

                <div className="flex justify-center gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleResolve('merge', selectedPair.contentId1)}
                    disabled={resolveMutation.isPending}
                    data-testid="button-merge-keep-first"
                  >
                    <Merge className="h-4 w-4 mr-2" />
                    Merge (Keep First)
                  </Button>
                  <Button
                    onClick={() => handleResolve('merge', selectedPair.contentId2)}
                    disabled={resolveMutation.isPending}
                    variant="outline"
                    data-testid="button-merge-keep-second"
                  >
                    <Merge className="h-4 w-4 mr-2" />
                    Merge (Keep Second)
                  </Button>
                  <Button
                    onClick={() => handleResolve('keep_both')}
                    disabled={resolveMutation.isPending}
                    variant="secondary"
                    data-testid="button-keep-both"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Keep Both
                  </Button>
                  <Button
                    onClick={() => handleResolve('delete', selectedPair.contentId2)}
                    disabled={resolveMutation.isPending}
                    variant="destructive"
                    data-testid="button-delete-duplicate"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Second
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
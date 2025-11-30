import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BookmarkIcon, Trash2, PlayCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

interface SavedQuery {
  id: string;
  naturalQuery: string;
  generatedSql: string;
  savedName: string;
  resultCount?: number;
  executionTime?: number;
  createdAt: string;
  metadata?: {
    model?: string;
    confidence?: number;
  };
}

interface SavedQueriesProps {
  onSelectQuery?: (query: SavedQuery) => void;
}

export function SavedQueries({ onSelectQuery }: SavedQueriesProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: savedQueries, isLoading, refetch } = useQuery<SavedQuery[]>({
    queryKey: ["/api/query/saved"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (queryId: string) => {
      const response = await apiRequest(`/api/query/${queryId}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Query removed",
        description: "The query has been removed from your saved list",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/query/saved"] });
      setDeleteId(null);
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete query",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (queryId: string) => {
    deleteMutation.mutate(queryId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">Loading saved queries...</p>
        </CardContent>
      </Card>
    );
  }

  if (!savedQueries || savedQueries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookmarkIcon className="w-5 h-5" />
            Saved Queries
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
          <p>No saved queries yet</p>
          <p className="text-sm">Save queries from the results panel to reuse them later</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookmarkIcon className="w-5 h-5" />
            Saved Queries ({savedQueries.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-saved"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {savedQueries.map((query) => (
                <div
                  key={query.id}
                  className="p-3 border rounded-lg space-y-2"
                  data-testid={`card-saved-${query.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{query.savedName}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {query.naturalQuery}
                      </p>
                    </div>
                  </div>

                  {query.resultCount !== undefined && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {query.resultCount} rows
                      </Badge>
                      {query.executionTime !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {query.executionTime}ms
                        </Badge>
                      )}
                      {query.metadata?.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(query.metadata.confidence * 100)}% confidence
                        </Badge>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Saved on {format(new Date(query.createdAt), "MMM d, yyyy")}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectQuery?.(query)}
                      data-testid={`button-run-${query.id}`}
                    >
                      <PlayCircle className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(query.id)}
                      data-testid={`button-delete-${query.id}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved query?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the query from your saved list. The query will still
              appear in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
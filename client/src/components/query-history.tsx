import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface QueryLog {
  id: string;
  naturalQuery: string;
  generatedSql: string;
  isSuccessful: boolean;
  resultCount?: number;
  executionTime?: number;
  createdAt: string;
  isSaved: boolean;
  savedName?: string;
}

interface QueryHistoryProps {
  onSelectQuery?: (query: QueryLog) => void;
}

export function QueryHistory({ onSelectQuery }: QueryHistoryProps) {
  const { data: history, isLoading, refetch } = useQuery<QueryLog[]>({
    queryKey: ["/api/query/history"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Query History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[150px] text-muted-foreground">
          <p>No queries yet. Start by asking a question above!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Query History
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          data-testid="button-refresh-history"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {history.map((query) => (
              <div
                key={query.id}
                className="p-3 border rounded-lg space-y-2 hover-elevate cursor-pointer"
                onClick={() => onSelectQuery?.(query)}
                data-testid={`card-history-${query.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-2">
                      {query.naturalQuery}
                    </p>
                    {query.savedName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Saved as: {query.savedName}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {query.isSuccessful ? (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}

                  {query.resultCount !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      <Database className="w-3 h-3 mr-1" />
                      {query.resultCount} rows
                    </Badge>
                  )}

                  {query.executionTime !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {query.executionTime}ms
                    </Badge>
                  )}

                  {query.isSaved && (
                    <Badge variant="secondary" className="text-xs">
                      Saved
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {format(new Date(query.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
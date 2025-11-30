import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  PlayCircle,
  Save,
  Code2,
  Table as TableIcon,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
} from "lucide-react";

interface QueryResultsProps {
  queryId?: string;
  sql?: string;
  explanation?: string[];
  confidence?: number;
  queryType?: string;
  tablesAccessed?: string[];
}

export function QueryResults({
  queryId,
  sql,
  explanation,
  confidence,
  queryType,
  tablesAccessed,
}: QueryResultsProps) {
  const [results, setResults] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedName, setSavedName] = useState("");
  const { toast } = useToast();

  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!queryId || !sql) throw new Error("No query to execute");
      
      const response = await apiRequest("/api/query/execute", "POST", { queryId, sql });
      return response;
    },
    onSuccess: (data) => {
      setResults(data.results);
      setExecutionTime(data.executionTime);
      setRowCount(data.rowCount);
      toast({
        title: "Query executed successfully",
        description: `Retrieved ${data.rowCount} rows in ${data.executionTime}ms`,
      });
    },
    onError: (error) => {
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Failed to execute query",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!queryId) throw new Error("No query to save");
      
      const response = await apiRequest("/api/query/save", "POST", { queryId, savedName });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Query saved",
        description: `Query saved as "${savedName}"`,
      });
      setSaveDialogOpen(false);
      setSavedName("");
      queryClient.invalidateQueries({ queryKey: ["/api/query/saved"] });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save query",
        variant: "destructive",
      });
    },
  });

  const handleExecute = () => {
    executeMutation.mutate();
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const getConfidenceBadge = (conf?: number) => {
    if (!conf) return null;
    const variant = conf > 0.8 ? "default" : conf > 0.5 ? "secondary" : "destructive";
    const label = conf > 0.8 ? "High" : conf > 0.5 ? "Medium" : "Low";
    return <Badge variant={variant}>{label} Confidence ({Math.round(conf * 100)}%)</Badge>;
  };

  if (!sql) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          <p>Enter a natural language query above to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Query Results
          </span>
          <div className="flex items-center gap-2">
            {confidence && getConfidenceBadge(confidence)}
            {queryType && <Badge variant="outline">{queryType}</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sql" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sql">
              <Code2 className="w-4 h-4 mr-2" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="explanation">
              <AlertCircle className="w-4 h-4 mr-2" />
              Explanation
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!results.length}>
              <TableIcon className="w-4 h-4 mr-2" />
              Results {rowCount !== null && `(${rowCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sql" className="space-y-4">
            <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
              <pre data-testid="text-generated-sql">{sql}</pre>
            </div>
            
            {tablesAccessed && tablesAccessed.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tables accessed:</span>
                {tablesAccessed.map((table) => (
                  <Badge key={table} variant="secondary">{table}</Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={handleExecute} disabled={executeMutation.isPending} data-testid="button-execute-query">
                {executeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Execute Query
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setSaveDialogOpen(true)}
                disabled={!queryId}
                data-testid="button-save-query"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Query
              </Button>

              {executionTime !== null && (
                <Badge variant="secondary" className="ml-auto">
                  <Clock className="w-3 h-3 mr-1" />
                  {executionTime}ms
                </Badge>
              )}
            </div>
          </TabsContent>

          <TabsContent value="explanation">
            {explanation && explanation.length > 0 ? (
              <div className="space-y-2">
                {explanation.map((step, index) => (
                  <Alert key={index}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{step}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No explanation available</p>
            )}
          </TabsContent>

          <TabsContent value="results">
            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(results[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.slice(0, 100).map((row, index) => (
                      <TableRow key={index} data-testid={`row-result-${index}`}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {value === null ? (
                              <span className="text-muted-foreground">NULL</span>
                            ) : typeof value === "object" ? (
                              JSON.stringify(value)
                            ) : (
                              String(value)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {results.length > 100 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing first 100 rows of {rowCount} total
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Execute the query to see results</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
            <DialogDescription>
              Give this query a name to save it for future use
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Query Name</Label>
              <Input
                id="name"
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="e.g., Monthly User Report"
                data-testid="input-query-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!savedName.trim() || saveMutation.isPending}
              data-testid="button-confirm-save"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
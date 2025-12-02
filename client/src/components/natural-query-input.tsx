import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Send, Loader2, InfoIcon } from "lucide-react";

interface QueryConversionResult {
  queryId: string;
  sql: string;
  explanation: string[];
  confidence: number;
  queryType: string;
  tablesAccessed: string[];
}

interface NaturalQueryInputProps {
  onQueryConverted?: (result: QueryConversionResult) => void;
}

export function NaturalQueryInput({
  onQueryConverted,
}: NaturalQueryInputProps) {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const convertMutation = useMutation({
    mutationFn: async (naturalQuery: string) => {
      const response = await apiRequest("/api/query/natural", "POST", {
        naturalQuery,
      });
      return response;
    },
    onSuccess: (data: QueryConversionResult) => {
      toast({
        title: "Query converted successfully",
        description: "Your natural language has been converted to SQL",
      });
      onQueryConverted?.(data);
      setQuery("");
    },
    onError: (error) => {
      toast({
        title: "Conversion failed",
        description:
          error instanceof Error ? error.message : "Failed to convert query",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      convertMutation.mutate(query.trim());
    }
  };

  const exampleQueries = [
    "Show me all users who signed up last month",
    "What are the top 10 most popular products?",
    "List customers with orders over $100",
    "Find all active subscriptions",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Natural Language Query
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Ask questions in plain English and I'll convert them to SQL queries.
            For example: "Show me all users who registered this week"
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question in plain English..."
              className="min-h-[100px]"
              data-testid="input-natural-query"
              disabled={convertMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {exampleQueries.slice(0, 2).map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setQuery(example)}
                  data-testid={`button-example-${index}`}
                  disabled={convertMutation.isPending}
                >
                  {example.length > 30 ? example.slice(0, 30) + "..." : example}
                </Button>
              ))}
            </div>

            <Button
              type="submit"
              disabled={!query.trim() || convertMutation.isPending}
              data-testid="button-convert-query"
            >
              {convertMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Convert to SQL
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-2">
            Try these examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover-elevate"
                onClick={() => setQuery(example)}
                data-testid={`badge-example-${index}`}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

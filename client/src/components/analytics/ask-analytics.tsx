import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, Send, Loader2, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { useToast } from "@/hooks/use-toast";

export function AskAnalytics() {
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const { toast } = useToast();

  const explainMutation = useMutation({
    mutationFn: async (metricName: string) => {
      try {
        const response = await apiRequest(
          API_ENDPOINTS.ai.analysis.insights.explain,
          "POST",
          { metricName },
        );

        // Validate API response structure
        if (!response || typeof response !== "object") {
          throw new Error("Invalid response format from server");
        }

        // Check for error response from API
        const data = response as { explanation?: string; error?: string };
        if (data.error) {
          throw new Error(data.error);
        }

        if (typeof data.explanation !== "string") {
          throw new Error("Missing or invalid explanation in response");
        }

        return { explanation: data.explanation };
      } catch (error) {
        // Re-throw with a user-friendly message
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to get explanation. Please try again.");
      }
    },
    onMutate: () => {
      // Clear previous explanation when starting a new request
      setExplanation("");
    },
    onSuccess: (data) => {
      setExplanation(data.explanation);
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description:
          error.message || "Failed to get explanation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      explainMutation.mutate(question.trim());
    }
  };

  const suggestedQuestions = [
    "What is bounce rate?",
    "What is conversion rate?",
    "What does traffic mean?",
    "What is page load time?",
    "What is user engagement?",
  ];

  const handleSuggestionClick = (suggestion: string) => {
    const metricName = suggestion
      .replace("What is ", "")
      .replace("?", "")
      .replace(" ", "_");
    setQuestion(metricName);
    explainMutation.mutate(metricName);
  };

  return (
    <Card data-testid="card-ask-analytics">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Ask About Metrics
        </CardTitle>
        <CardDescription>
          Get plain-language explanations of your metrics and what they mean for
          your business
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a metric name (e.g., bounce_rate, conversion_rate)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={explainMutation.isPending}
              data-testid="input-metric-question"
            />
            <Button
              type="submit"
              disabled={!question.trim() || explainMutation.isPending}
              data-testid="button-ask-submit"
            >
              {explainMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>

        {/* Suggested questions */}
        {!explanation && !explainMutation.isPending && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Try asking about:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((sq) => (
                <Button
                  key={sq}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(sq)}
                  className="text-xs"
                  data-testid={`button-suggestion-${sq.replace(/[^a-zA-Z]/g, "-").toLowerCase()}`}
                >
                  {sq}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {explainMutation.isPending && (
          <Alert className="mt-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Getting explanation...</AlertDescription>
          </Alert>
        )}

        {/* Explanation */}
        {explanation && !explainMutation.isPending && (
          <Alert className="mt-4 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
            <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <AlertDescription
              className="text-sm"
              data-testid="text-explanation"
            >
              {explanation}
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {explainMutation.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              Failed to get explanation. Please try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

type WasteReductionSuggestion = {
  suggestions: string[];
};

export function ExpirationAlert() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check for expiring items on mount
  const checkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        "POST",
        "/api/notifications/expiration/check",
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/expiration"],
      });
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to check for expiring items:", error);
      localStorage.removeItem("lastExpirationCheck");
      toast({
        title: "Error checking expiration dates",
        description:
          "Unable to check for expiring items. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const { data: suggestions } = useQuery<WasteReductionSuggestion>({
    queryKey: ["/api/suggestions/waste-reduction"],
  });

  const refreshSuggestions = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate and refetch the suggestions
      await queryClient.invalidateQueries({
        queryKey: ["/api/suggestions/waste-reduction"],
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/suggestions/waste-reduction"],
      });
      toast({
        title: "Tips refreshed!",
        description: "Generated new waste reduction suggestions",
      });
    } catch (error) {
      console.error("Failed to refresh suggestions:", error);
      toast({
        title: "Error refreshing tips",
        description: "Unable to generate new suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastCheck = localStorage.getItem("lastExpirationCheck");

    if (lastCheck !== today) {
      localStorage.setItem("lastExpirationCheck", today);
      checkMutation.mutate();
    }
  }, []);

  const hasSuggestions = suggestions && suggestions.suggestions.length > 0;

  if (!hasSuggestions) {
    return null;
  }

  return (
    <div className="">
      {hasSuggestions && (
        <Card
          className="border-primary/20 bg-primary/20 backdrop-opacity-0"
          animate={false}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Waste Reduction Tips
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshSuggestions}
                disabled={isRefreshing}
                className="h-7 w-7"
                data-testid="button-refresh-tips"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="text-sm text-muted-foreground flex gap-2"
                data-testid={`suggestion-${index}`}
              >
                <span className="text-primary">•</span>
                <span>{suggestion}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

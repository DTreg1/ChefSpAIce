import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, X, Lightbulb, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

type ExpirationNotification = {
  id: string;
  foodItemId: string;
  foodItemName: string;
  expirationDate: string;
  daysUntilExpiry: number;
  notifiedAt: Date;
  dismissed: boolean;
};

type WasteReductionSuggestion = {
  suggestions: string[];
};

export function ExpirationAlert() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check for expiring items on mount
  const checkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/notifications/expiration/check", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/expiration"] });
    },
    onError: (error: any) => {
      console.error("Failed to check for expiring items:", error);
      localStorage.removeItem("lastExpirationCheck");
      toast({
        title: "Error checking expiration dates",
        description: "Unable to check for expiring items. Please try again later.",
        variant: "destructive"
      });
    },
  });

  // Mutation to refresh waste reduction tips
  const refreshTipsMutation = useMutation({
    mutationFn: async () => {
      setIsRefreshing(true);
      // Force a cache refresh by invalidating and refetching
      await queryClient.invalidateQueries({ queryKey: ["/api/suggestions/waste-reduction"] });
      await queryClient.refetchQueries({ queryKey: ["/api/suggestions/waste-reduction"] });
      return true;
    },
    onSuccess: () => {
      setIsRefreshing(false);
      toast({
        title: "Tips refreshed",
        description: "New waste reduction tips have been loaded based on your expiring items.",
      });
    },
    onError: (error: any) => {
      setIsRefreshing(false);
      console.error("Failed to refresh tips:", error);
      toast({
        title: "Error refreshing tips",
        description: "Unable to fetch new tips. Please try again.",
        variant: "destructive"
      });
    },
  });

  const { data: notifications } = useQuery<ExpirationNotification[]>({
    queryKey: ["/api/notifications/expiration"],
  });

  const { data: suggestions } = useQuery<WasteReductionSuggestion>({
    queryKey: ["/api/suggestions/waste-reduction"],
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/notifications/${id}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/expiration"] });
      toast({
        title: "Notification dismissed",
      });
    },
    onError: (error: any) => {
      console.error("Failed to dismiss notification:", error);
      toast({
        title: "Error dismissing notification",
        description: "Unable to dismiss the notification. Please try again.",
        variant: "destructive"
      });
    },
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastCheck = localStorage.getItem("lastExpirationCheck");
    
    if (lastCheck !== today) {
      localStorage.setItem("lastExpirationCheck", today);
      checkMutation.mutate();
    }
  }, []);

  const hasNotifications = notifications && notifications.length > 0;
  const hasSuggestions = suggestions && suggestions.suggestions.length > 0;

  if (!hasNotifications && !hasSuggestions) {
    return null;
  }

  return (
    <div className="space-y-3">
      {hasNotifications && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="ml-2">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-amber-900 dark:text-amber-100">
                Items expiring soon:
              </span>
              <div className="flex flex-wrap gap-2">
                {notifications.slice(0, 5).map((notification) => (
                  <Badge
                    key={notification.id}
                    variant="outline"
                    className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700"
                    data-testid={`notification-${notification.id}`}
                  >
                    <span className="mr-2">
                      {notification.foodItemName} ({notification.daysUntilExpiry}d)
                    </span>
                    <button
                      onClick={() => dismissMutation.mutate(notification.id)}
                      className="hover:text-destructive"
                      data-testid={`button-dismiss-${notification.id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasSuggestions && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Waste Reduction Tips
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refreshTipsMutation.mutate()}
              disabled={isRefreshing || refreshTipsMutation.isPending}
              data-testid="button-refresh-tips"
            >
              <RefreshCw 
                className={`h-4 w-4 ${isRefreshing || refreshTipsMutation.isPending ? 'animate-spin' : ''}`}
              />
            </Button>
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

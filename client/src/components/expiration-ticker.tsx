import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type ExpirationNotification = {
  id: string;
  foodItemId: string;
  foodItemName: string;
  expirationDate: string;
  daysUntilExpiry: number;
  notifiedAt: Date;
  dismissed: boolean;
};

export function ExpirationTicker() {
  const { toast } = useToast();

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

  const { data: notifications } = useQuery<ExpirationNotification[]>({
    queryKey: ["/api/notifications/expiration"],
  });

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastCheck = localStorage.getItem("lastExpirationCheck");

    if (lastCheck !== today) {
      localStorage.setItem("lastExpirationCheck", today);
      checkMutation.mutate();
    }
  }, []);

  const hasNotifications = notifications && notifications.length > 0;

  if (!hasNotifications) {
    return null;
  }

  return (
    <div>
      {hasNotifications && (
        <div className="rounded-lg pt-3 ticker-container">
          <div className="flex items-center gap-3">
            <div className="flex-1 overflow-hidden">
              <div
                className="ticker-content"
                data-speed={notifications.length > 5 ? "normal" : "slow"}
              >
                {/* First set of items */}
                {notifications.map((notification) => (
                  <Badge
                    key={`first-${notification.id}`}
                    variant="outline"
                    className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 inline-flex items-center shrink-0"
                    data-testid={`notification-${notification.id}`}
                  >
                    <span>
                      {notification.foodItemName} (
                      {notification.daysUntilExpiry}d)
                    </span>
                  </Badge>
                ))}
                {/* Duplicate set for seamless loop */}
                {notifications.map((notification) => (
                  <Badge
                    key={`second-${notification.id}`}
                    variant="outline"
                    className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 inline-flex items-center shrink-0"
                  >
                    <span>
                      {notification.foodItemName} (
                      {notification.daysUntilExpiry}d)
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

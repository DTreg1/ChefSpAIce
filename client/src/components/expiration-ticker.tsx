import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

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
  const { data: notifications } = useQuery<ExpirationNotification[]>({
    queryKey: ["/api/notifications/expiration"],
  });

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

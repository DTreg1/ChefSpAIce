import { useState } from "react";
import { useNotificationHistory, useDismissNotification } from "@/hooks/useNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Bell, Clock, AlertCircle, ChefHat, Utensils, FlaskConical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const { data: notifications, isLoading } = useNotificationHistory(includeDismissed);
  const dismissNotification = useDismissNotification();
  const { toast } = useToast();

  const handleDismiss = async (notificationId: string) => {
    try {
      await dismissNotification.mutateAsync({
        notificationId,
        dismissedBy: 'web-app',
      });
      toast({
        title: "Notification dismissed",
        description: "The notification has been dismissed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to dismiss notification. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expiring-food':
        return <AlertCircle className="h-6 w-6" />;
      case 'recipe-suggestion':
        return <ChefHat className="h-6 w-6" />;
      case 'meal-reminder':
        return <Utensils className="h-6 w-6" />;
      case 'test':
        return <FlaskConical className="h-6 w-6" />;
      default:
        return <Bell className="h-6 w-6" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            View and manage your notification history
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-dismissed"
            checked={includeDismissed}
            onCheckedChange={setIncludeDismissed}
            data-testid="switch-show-dismissed"
          />
          <Label htmlFor="show-dismissed" data-testid="label-show-dismissed">Show dismissed</Label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading notifications...</div>
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.dismissedAt ? "opacity-60" : ""}
              data-testid={`notification-card-${notification.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1" data-testid={`icon-notification-type-${notification.id}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-notification-title-${notification.id}`}>
                        {notification.title}
                      </CardTitle>
                      <CardDescription className="mt-1" data-testid={`text-notification-body-${notification.id}`}>
                        {notification.body}
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1" data-testid={`text-notification-time-${notification.id}`}>
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.sentAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <span className="capitalize" data-testid={`text-notification-platform-${notification.id}`}>{notification.platform}</span>
                        {notification.dismissedAt && (
                          <span className="text-muted-foreground" data-testid={`text-notification-dismissed-${notification.id}`}>
                            Dismissed {formatDistanceToNow(new Date(notification.dismissedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!notification.dismissedAt && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDismiss(notification.id)}
                      disabled={dismissNotification.isPending}
                      data-testid={`button-dismiss-${notification.id}`}
                      className="hover-elevate"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm mt-1">
                {includeDismissed
                  ? "You don't have any notifications yet."
                  : "You don't have any active notifications."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

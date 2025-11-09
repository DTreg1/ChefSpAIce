import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Package, ChefHat, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function NotificationSettings() {
  const { toast } = useToast();
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isRegistering, setIsRegistering] = useState(false);

  // Fetch user preferences
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<User>) => {
      const response = await apiRequest("PUT", "/api/user/preferences", preferences);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Notification preferences updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences.",
        variant: "destructive",
      });
    },
  });

  // Check browser support and permission
  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setNotificationsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission and register push subscription
  const enableNotifications = async () => {
    if (!notificationsSupported) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support push notifications.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        // Register service worker if not already registered
        const registration = await navigator.serviceWorker.ready;

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            import.meta.env.VITE_VAPID_PUBLIC_KEY || "BKd0F0KpK_3Yw2c4lxVhQGNqPWnMGqWXA1kapi6VLEsL0VBs9K8PtRmUugKM8qCqX7EMz_2lPcrecNaRc9LbKxo"
          ),
        });

        // Send subscription to backend
        await apiRequest("/api/push-tokens/register", "POST", {
          subscription: subscription.toJSON(),
          platform: "web",
        });

        // Enable notifications in user preferences
        await updatePreferencesMutation.mutateAsync({
          notificationsEnabled: true,
        });

        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications.",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "You won't receive push notifications.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast({
        title: "Error",
        description: "Failed to enable notifications.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Disable notifications
  const disableNotifications = async () => {
    try {
      // Unregister from backend
      await apiRequest("/api/push-tokens/unregister", "DELETE", {
        platform: "web",
      });

      // Update preferences
      await updatePreferencesMutation.mutateAsync({
        notificationsEnabled: false,
      });

      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications anymore.",
      });
    } catch (error) {
      console.error("Error disabling notifications:", error);
      toast({
        title: "Error",
        description: "Failed to disable notifications.",
        variant: "destructive",
      });
    }
  };

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleToggle = (field: string, value: boolean) => {
    updatePreferencesMutation.mutate({
      [field]: value,
    });
  };

  const handleTimeChange = (time: string) => {
    updatePreferencesMutation.mutate({
      notificationTime: time,
    });
  };

  // Generate time options
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const label = new Date(`2024-01-01 ${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      timeOptions.push({ value: time, label });
    }
  }

  return (
    <div className="space-y-6">
      {/* Browser Notification Permission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {permission === "granted" && user?.notificationsEnabled ? (
              <Bell className="w-5 h-5" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get notified about expiring food items, recipe suggestions, and meal reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notificationsSupported ? (
            <div className="text-sm text-muted-foreground">
              Your browser doesn't support push notifications.
            </div>
          ) : permission === "granted" && user?.notificationsEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notifications are enabled</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disableNotifications}
                  disabled={updatePreferencesMutation.isPending}
                  data-testid="button-disable-notifications"
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  Disable
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                You can manage specific notification types below
              </div>

              {/* Test notification button */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await apiRequest("POST", "/api/push-tokens/test");
                    const result = await response.json();
                    toast({
                      title: "Test Sent",
                      description: `Notification sent to ${result.sent} device(s)`,
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to send test notification",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-test-notification"
              >
                Send Test Notification
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {permission === "denied" 
                  ? "You have blocked notifications. Please enable them in your browser settings."
                  : "Enable push notifications to stay informed about your kitchen inventory"}
              </div>
              <Button
                onClick={enableNotifications}
                disabled={isRegistering || permission === "denied"}
                data-testid="button-enable-notifications"
              >
                {isRegistering ? "Enabling..." : "Enable Notifications"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      {user?.notificationsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Choose which notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="expiring-food">Expiring Food</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when food items are about to expire
                  </p>
                </div>
              </div>
              <Switch
                id="expiring-food"
                checked={user?.notifyExpiringFood ?? true}
                onCheckedChange={(checked) => handleToggle("notifyExpiringFood", checked)}
                disabled={updatePreferencesMutation.isPending}
                data-testid="switch-expiring-food"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChefHat className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="recipe-suggestions">Recipe Suggestions</Label>
                  <p className="text-sm text-muted-foreground">
                    Get daily recipe suggestions based on your inventory
                  </p>
                </div>
              </div>
              <Switch
                id="recipe-suggestions"
                checked={user?.notifyRecipeSuggestions ?? false}
                onCheckedChange={(checked) => handleToggle("notifyRecipeSuggestions", checked)}
                disabled={updatePreferencesMutation.isPending}
                data-testid="switch-recipe-suggestions"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="meal-reminders">Meal Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about upcoming planned meals
                  </p>
                </div>
              </div>
              <Switch
                id="meal-reminders"
                checked={user?.notifyMealReminders ?? true}
                onCheckedChange={(checked) => handleToggle("notifyMealReminders", checked)}
                disabled={updatePreferencesMutation.isPending}
                data-testid="switch-meal-reminders"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Schedule */}
      {user?.notificationsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Notification Schedule
            </CardTitle>
            <CardDescription>
              Choose when you want to receive daily notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="notification-time">Daily notification time</Label>
              <Select
                value={user?.notificationTime || "09:00"}
                onValueChange={handleTimeChange}
                disabled={updatePreferencesMutation.isPending}
              >
                <SelectTrigger id="notification-time" className="w-40" data-testid="select-notification-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`option-time-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
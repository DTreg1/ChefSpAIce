import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, AlertCircle, CheckCircle } from 'lucide-react';
import { pushNotificationService } from '@/utils/pushNotifications';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get current permission state
    const state = pushNotificationService.getPermissionState();
    setPermissionState(state);

    const initError = pushNotificationService.getInitializationError();
    if (initError) {
      setError(initError.message);
    }

    // Listen for permission changes
    const handlePermissionChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { state, message } = customEvent.detail;
      setPermissionState(state);
      
      if (state === 'denied') {
        setError(message);
        toast({
          title: '🔔 Notifications Disabled',
          description: message,
          variant: 'destructive',
        });
      } else if (state === 'granted') {
        setError(null);
        toast({
          title: '✅ Notifications Enabled',
          description: message,
        });
      }
    };

    window.addEventListener('push-notification-permission', handlePermissionChange);

    return () => {
      window.removeEventListener('push-notification-permission', handlePermissionChange);
    };
  }, [toast]);

  const handleEnableNotifications = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      await pushNotificationService.initialize();
      
      if (pushNotificationService.isReady()) {
        toast({
          title: '✅ Notifications Enabled',
          description: 'You will now receive important updates from ChefSpAIce',
        });
      } else {
        const err = pushNotificationService.getInitializationError();
        if (err) {
          setError(err.message);
        }
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: '❌ Failed to Enable Notifications',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const getStatusBadge = () => {
    switch (permissionState) {
      case 'granted':
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Enabled
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive">
            <BellOff className="w-3 h-3 mr-1" />
            Disabled
          </Badge>
        );
      case 'prompt':
        return (
          <Badge variant="outline">
            <Bell className="w-3 h-3 mr-1" />
            Not Configured
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Card data-testid="card-notification-settings">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Get notified about expiring food, recipe suggestions, and meal reminders
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {permissionState !== 'granted' && (
          <Button
            onClick={handleEnableNotifications}
            disabled={isInitializing}
            className="w-full"
            data-testid="button-enable-notifications"
          >
            <Bell className="w-4 h-4 mr-2" />
            {isInitializing ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        )}

        {permissionState === 'granted' && (
          <div className="text-sm text-muted-foreground">
            Notifications are enabled. You'll receive updates about:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Food items expiring soon</li>
              <li>Recipe suggestions based on your ingredients</li>
              <li>Upcoming meal reminders</li>
            </ul>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="text-sm text-muted-foreground">
            To enable notifications, please update your browser settings:
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Notifications" in the permissions list</li>
              <li>Change the setting to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

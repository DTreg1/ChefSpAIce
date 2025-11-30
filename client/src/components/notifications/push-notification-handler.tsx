import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { ToastAction } from '@/components/ui/toast';

export function PushNotificationHandler() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Listen for foreground notifications
    const handleNotificationReceived = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { title, body, data } = customEvent.detail;

      // Determine emoji/prefix based on notification type
      const getPrefix = (type: string) => {
        switch (type) {
          case 'expiring-food':
            return '⏰ ';
          case 'recipe-suggestion':
            return '👨‍🍳 ';
          case 'meal-reminder':
            return '🍽️ ';
          case 'test':
            return '🧪 ';
          default:
            return '🔔 ';
        }
      };

      // Show toast with appropriate styling
      toast({
        title: getPrefix(data?.type) + title,
        description: body,
        action: data?.url ? (
          <ToastAction
            altText="View notification"
            onClick={() => {
              setLocation(data.url);
            }}
            data-testid="notification-toast-view-button"
          >
            View
          </ToastAction>
        ) : undefined,
        duration: 5000,
      });
    };

    // Listen for notification actions (when user taps notification)
    const handleNotificationAction = (event: Event) => {
      // console.log('Notification action handled in React');
      
      // Navigation is handled by the push notification service
      // This event is mainly for tracking and UI updates
    };

    window.addEventListener('push-notification-received', handleNotificationReceived);
    window.addEventListener('push-notification-action', handleNotificationAction);

    return () => {
      window.removeEventListener('push-notification-received', handleNotificationReceived);
      window.removeEventListener('push-notification-action', handleNotificationAction);
    };
  }, [toast, setLocation]);

  return null; // This component doesn't render anything
}

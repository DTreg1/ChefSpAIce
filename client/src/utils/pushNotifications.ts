import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  private isInitialized = false;
  private pushToken: string | null = null;
  private permissionState: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';
  private initializationError: Error | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Check if on native platform (iOS/Android) or web
    if (!Capacitor.isNativePlatform()) {
      // console.log('Initializing web push notifications');
      await this.initializeWebPush();
      return;
    }

    try {
      // Native platform push notification setup
      // console.log('Initializing native push notifications');
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // Listen for registration
        await PushNotifications.addListener('registration', (token: Token) => {
          // console.log('Push registration success, token:', token.value);
          this.pushToken = token.value;
          // Send token to backend to store for this user
          this.sendTokenToBackend(token.value);
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error: Error | unknown) => {
          console.error('Push registration error:', error);
        });

        // Listen for push notifications received
        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification: PushNotificationSchema) => {
            // console.log('Push received:', notification);
            // Handle notification received while app is in foreground
            this.handleNotificationReceived(notification);
          }
        );

        // Listen for notification actions
        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (notification: ActionPerformed) => {
            // console.log('Push action performed:', notification);
            // Handle notification tap
            this.handleNotificationAction(notification);
          }
        );

        this.isInitialized = true;
        // console.log('Push notifications initialized successfully');
      } else {
        // console.log('Push notification permission not granted');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private async initializeWebPush(): Promise<void> {
    try {
      // Check if service worker and push notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        const error = new Error('Web push notifications are not supported in this browser');
        this.initializationError = error;
        console.warn('Web push not supported:', error.message);
        this.dispatchPermissionEvent('denied', error.message);
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      this.permissionState = permission as "prompt" | "unknown" | "granted" | "denied";
      
      if (permission !== 'granted') {
        const message = permission === 'denied' 
          ? 'You have denied notification permissions. You can enable them in your browser settings.'
          : 'Notification permission is required to receive updates.';
        // console.log('Notification permission not granted:', permission);
        this.dispatchPermissionEvent(permission, message);
        return;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        // console.log('Service worker registered');
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      // console.log('Web push subscription created:', subscription);

      // Send subscription to backend
      await this.sendWebSubscriptionToBackend(subscription);

      this.isInitialized = true;
      this.dispatchPermissionEvent('granted', 'Notifications enabled successfully');
      // console.log('Web push notifications initialized successfully');
    } catch (error) {
      const err = error as Error;
      this.initializationError = err;
      this.permissionState = 'denied';
      console.error('Error initializing web push notifications:', err);
      this.dispatchPermissionEvent('denied', err.message || 'Failed to initialize push notifications');
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendWebSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch(API_ENDPOINTS.notifications.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          platform: 'web',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to send web subscription to backend');
      }

      const data = await response.json();
      // console.log('Web subscription sent to backend successfully:', data.message);
    } catch (error) {
      console.error('Error sending web subscription to backend:', error);
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      // Get device info
      const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'
      const info = await Device.getInfo();
      const deviceInfo = {
        deviceId: await Device.getId().then(id => id.identifier),
        deviceModel: info.model,
        osVersion: info.osVersion,
        appVersion: '1.0.0', // You can get this from package.json or config
      };

      const response = await fetch(API_ENDPOINTS.notifications.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          token,
          platform,
          deviceInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to send push token to backend');
      }

      const data = await response.json();
      // console.log('Push token sent to backend successfully:', data.message);
    } catch (error) {
      console.error('Error sending push token to backend:', error);
      // Don't throw - allow app to continue even if token registration fails
    }
  }


  private handleNotificationReceived(notification: PushNotificationSchema): void {
    // console.log('Notification received while app is in foreground:', notification);
    
    // Dispatch custom event for React components to handle
    const event = new CustomEvent('push-notification-received', {
      detail: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        id: notification.id,
      },
    });
    window.dispatchEvent(event);

    // Track notification delivery
    this.trackNotificationDelivery(notification);
  }

  private handleNotificationAction(action: ActionPerformed): void {
    // console.log('Notification action performed:', action);
    
    // Dispatch custom event for React components to handle navigation
    const event = new CustomEvent('push-notification-action', {
      detail: {
        notification: action.notification,
        actionId: action.actionId,
      },
    });
    window.dispatchEvent(event);

    // Track notification opened
    this.trackNotificationOpened(action.notification);

    // Handle navigation based on notification type
    const data = action.notification.data;
    if (data?.url) {
      // Use the URL from notification data
      window.location.href = data.url;
    } else {
      // Fallback navigation based on type
      this.navigateBasedOnType(data?.type);
    }
  }

  private navigateBasedOnType(type: string): void {
    const navigationMap: Record<string, string> = {
      'expiring-food': '/inventory',
      'recipe-suggestion': '/chat',
      'meal-reminder': '/meal-planning',
      'test': '/',
    };

    const path = navigationMap[type];
    if (path) {
      window.location.href = path;
    }
  }

  private async trackNotificationDelivery(notification: PushNotificationSchema): Promise<void> {
    try {
      await fetch(API_ENDPOINTS.notifications.track, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          notificationId: notification.id,
          status: 'delivered',
          data: notification.data,
        }),
      });
    } catch (error) {
      console.error('Error tracking notification delivery:', error);
    }
  }

  private async trackNotificationOpened(notification: any): Promise<void> {
    try {
      await fetch(API_ENDPOINTS.notifications.track, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          notificationId: notification.id,
          status: 'opened',
          data: notification.data,
        }),
      });
    } catch (error) {
      console.error('Error tracking notification opened:', error);
    }
  }

  async getDeliveredNotifications(): Promise<any[]> {
    if (!Capacitor.isNativePlatform()) {
      return [];
    }

    const delivered = await PushNotifications.getDeliveredNotifications();
    return delivered.notifications;
  }

  async removeAllDeliveredNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await PushNotifications.removeAllDeliveredNotifications();
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  async cleanup(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await PushNotifications.removeAllListeners();
    this.isInitialized = false;
  }

  // Dispatch custom event for permission changes
  private dispatchPermissionEvent(state: string, message: string): void {
    const event = new CustomEvent('push-notification-permission', {
      detail: { state, message },
    });
    window.dispatchEvent(event);
  }

  // Get current permission state
  getPermissionState(): string {
    return this.permissionState;
  }

  // Get initialization error if any
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  // Check if initialized
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();

// Schedule local notification for expiring food items
export async function scheduleExpirationNotification(
  itemName: string,
  daysUntilExpiration: number,
  location: string
): Promise<void> {
  // This would typically be handled by the backend
  // For now, we'll just log it
  // console.log(`Scheduling notification for ${itemName} expiring in ${daysUntilExpiration} days at ${location}`);
}

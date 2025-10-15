import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  private isInitialized = false;
  private pushToken: string | null = null;

  async initialize(): Promise<void> {
    // Only initialize on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // Listen for registration
        await PushNotifications.addListener('registration', (token: Token) => {
          console.log('Push registration success, token:', token.value);
          this.pushToken = token.value;
          // TODO: Send token to backend to store for this user
          this.sendTokenToBackend(token.value);
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Push registration error:', error);
        });

        // Listen for push notifications received
        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification: PushNotificationSchema) => {
            console.log('Push received:', notification);
            // Handle notification received while app is in foreground
            this.handleNotificationReceived(notification);
          }
        );

        // Listen for notification actions
        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (notification: ActionPerformed) => {
            console.log('Push action performed:', notification);
            // Handle notification tap
            this.handleNotificationAction(notification);
          }
        );

        this.isInitialized = true;
        console.log('Push notifications initialized successfully');
      } else {
        console.log('Push notification permission not granted');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      // Get device info
      const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'
      const deviceInfo = {
        deviceId: await this.getDeviceId(),
        model: await this.getDeviceModel(),
        osVersion: await this.getOsVersion(),
      };

      const response = await fetch('/api/push-token', {
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
        throw new Error('Failed to send push token to backend');
      }

      console.log('Push token sent to backend successfully');
    } catch (error) {
      console.error('Error sending push token to backend:', error);
    }
  }

  private async getDeviceId(): Promise<string | undefined> {
    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getId();
      return info.identifier;
    } catch {
      return undefined;
    }
  }

  private async getDeviceModel(): Promise<string | undefined> {
    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      return info.model;
    } catch {
      return undefined;
    }
  }

  private async getOsVersion(): Promise<string | undefined> {
    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      return info.osVersion;
    } catch {
      return undefined;
    }
  }

  private handleNotificationReceived(notification: PushNotificationSchema): void {
    // You can show an in-app notification or update UI
    console.log('Notification received while app is open:', notification);
    
    // Optionally show a toast or update UI
    if (notification.data?.type === 'expiration_alert') {
      // Handle food expiration alert
      this.handleExpirationAlert(notification);
    }
  }

  private handleNotificationAction(action: ActionPerformed): void {
    // Handle user tapping on notification
    const data = action.notification.data;
    
    if (data?.type === 'expiration_alert') {
      // Navigate to storage page
      window.location.href = data.location || '/storage/fridge';
    }
  }

  private handleExpirationAlert(notification: PushNotificationSchema): void {
    // You could show an in-app alert or update the UI
    console.log('Food expiration alert:', notification.data);
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
  console.log(`Scheduling notification for ${itemName} expiring in ${daysUntilExpiration} days at ${location}`);
}

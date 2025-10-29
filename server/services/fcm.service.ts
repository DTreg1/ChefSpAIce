import * as admin from 'firebase-admin';
import { NotificationPayload } from './push-notification.service';

/**
 * Firebase Cloud Messaging (FCM) Service for Android Push Notifications
 * 
 * This service handles all Android push notification operations using Firebase Admin SDK.
 * It manages token validation, notification sending, and error handling for Android devices.
 * 
 * Features:
 * - Initialize Firebase Admin SDK with service account credentials
 * - Send rich notifications with title, body, icon, and custom data
 * - Validate FCM tokens before sending
 * - Handle FCM-specific errors (InvalidRegistration, NotRegistered, etc.)
 * - Support for high-priority notifications for immediate delivery
 * - Custom click actions for notification handling
 */
export class FcmService {
  private static isInitialized = false;
  private static app: admin.app.App | null = null;

  /**
   * Initialize Firebase Admin SDK
   * Requires FCM_SERVER_KEY or service account JSON in environment
   */
  static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      const fcmServerKey = process.env.FCM_SERVER_KEY;
      const fcmServiceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
      const fcmServiceAccount = process.env.FCM_SERVICE_ACCOUNT;

      if (!fcmServerKey && !fcmServiceAccountPath && !fcmServiceAccount) {
        console.warn(
          '⚠️  FCM credentials not configured. Android push notifications will NOT work.\n' +
          '   To enable Android push notifications:\n' +
          '   1. Create a Firebase project at console.firebase.google.com\n' +
          '   2. Add your Android app to the project\n' +
          '   3. Download the service account JSON key\n' +
          '   4. Set one of these environment variables:\n' +
          '      - FCM_SERVICE_ACCOUNT=<JSON string of service account>\n' +
          '      - FCM_SERVICE_ACCOUNT_PATH=<path to service account JSON>\n' +
          '      - FCM_SERVER_KEY=<legacy server key>\n'
        );
        return;
      }

      // Initialize with service account (preferred method)
      if (fcmServiceAccount) {
        const serviceAccount = JSON.parse(fcmServiceAccount);
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.isInitialized = true;
        // console.log('✅ FCM initialized with service account from environment');
      } else if (fcmServiceAccountPath) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(fcmServiceAccountPath),
        });
        this.isInitialized = true;
        // console.log('✅ FCM initialized with service account from file');
      } else if (fcmServerKey) {
        // Legacy initialization with server key (deprecated but still supported)
        // Server key alone isn't sufficient - need service account
        console.warn('⚠️  FCM_SERVER_KEY alone is not sufficient. Please use service account instead.');
        return;
      }
    } catch (error) {
      console.error('❌ Failed to initialize FCM:', error);
    }
  }

  /**
   * Send push notification to Android device
   * 
   * @param token - FCM registration token from the Android device
   * @param payload - Notification content with title, body, and optional data
   * @returns Promise<string> - Message ID if successful
   * @throws Error with specific FCM error codes
   */
  static async sendNotification(token: string, payload: NotificationPayload): Promise<string> {
    if (!this.isInitialized || !this.app) {
      throw new Error('FCM is not initialized. Cannot send Android notifications.');
    }

    try {
      // Validate token format (FCM tokens are typically 152+ characters)
      if (!token || token.length < 100) {
        throw new Error('Invalid FCM token format');
      }

      // Prepare FCM message payload
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        // Convert payload data to string values (FCM requires string values)
        data: payload.data ? this.convertDataToStrings(payload.data) : undefined,
        android: {
          priority: 'high', // Ensure immediate delivery
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK', // For Flutter/Capacitor apps
            icon: 'ic_notification', // Should match icon in android/app/src/main/res/drawable
            color: '#007AFF', // Notification color
          },
        },
        // Also include APNS config for iOS devices using FCM
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: typeof payload.badge === 'number' ? payload.badge : undefined,
              contentAvailable: true,
            },
          },
        },
      };

      // Add custom icon if provided
      if (payload.icon && message.android?.notification) {
        message.android.notification.icon = payload.icon;
      }

      // Add actions if provided
      if (payload.actions && payload.actions.length > 0) {
        // FCM doesn't directly support actions like web push
        // Actions are handled by the client app
        if (!message.data) message.data = {};
        message.data.actions = JSON.stringify(payload.actions);
      }

      // Send the message
      const response = await admin.messaging(this.app).send(message);
      // console.log('✅ FCM notification sent successfully:', response);
      return response;
    } catch (error: Error | unknown) {
      console.error('❌ FCM notification failed:', error);
      
      // Handle specific FCM error codes
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        throw new Error('INVALID_TOKEN');
      } else if (error.code === 'messaging/message-rate-exceeded') {
        throw new Error('RATE_LIMIT_EXCEEDED');
      } else if (error.code === 'messaging/device-message-rate-exceeded') {
        throw new Error('DEVICE_RATE_LIMIT_EXCEEDED');
      } else if (error.code === 'messaging/topics-message-rate-exceeded') {
        throw new Error('TOPIC_RATE_LIMIT_EXCEEDED');
      } else if (error.code === 'messaging/too-many-topics') {
        throw new Error('TOO_MANY_TOPICS');
      } else if (error.code === 'messaging/invalid-argument') {
        throw new Error('INVALID_PAYLOAD');
      }
      
      throw error;
    }
  }

  /**
   * Validate FCM token
   * Performs a dry run to check if the token is valid without sending a notification
   * 
   * @param token - FCM registration token to validate
   * @returns Promise<boolean> - true if valid, false otherwise
   */
  static async validateToken(token: string): Promise<boolean> {
    if (!this.isInitialized || !this.app) {
      return false;
    }

    try {
      // Perform a dry run (validate only, don't actually send)
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: 'Test',
          body: 'Test',
        },
      };

      // Use dryRun option to validate without sending
      await admin.messaging(this.app).send(message, true);
      return true;
    } catch (error: Error | unknown) {
      console.error('FCM token validation failed:', error.code);
      return false;
    }
  }

  /**
   * Send notification to multiple tokens (batch send)
   * More efficient than sending individual notifications
   * 
   * @param tokens - Array of FCM tokens
   * @param payload - Notification content
   * @returns Object with success and failure counts
   */
  static async sendMulticast(
    tokens: string[], 
    payload: NotificationPayload
  ): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
    if (!this.isInitialized || !this.app) {
      throw new Error('FCM is not initialized');
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ? this.convertDataToStrings(payload.data) : undefined,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
      };

      const response = await admin.messaging(this.app).sendEachForMulticast(message);
      
      // Collect failed tokens for cleanup
      const failedTokens: string[] = [];
      response.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
        if (!resp.success && resp.error) {
          console.error(`Failed to send to token ${tokens[idx]}:`, resp.error.code);
          failedTokens.push(tokens[idx]);
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
      };
    } catch (error) {
      console.error('FCM multicast failed:', error);
      throw error;
    }
  }

  /**
   * Convert data object to string values
   * FCM requires all data values to be strings
   */
  private static convertDataToStrings(data: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
      }
    }
    return result;
  }

  /**
   * Get FCM initialization status
   */
  static getStatus(): { initialized: boolean; hasCredentials: boolean } {
    return {
      initialized: this.isInitialized,
      hasCredentials: !!process.env.FCM_SERVER_KEY || 
                     !!process.env.FCM_SERVICE_ACCOUNT_PATH || 
                     !!process.env.FCM_SERVICE_ACCOUNT,
    };
  }
}

// Initialize FCM service on module load
FcmService.initialize();

export default FcmService;
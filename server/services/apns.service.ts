import apn from '@parse/node-apn';
import { NotificationPayload } from './push-notification.service';
import fs from 'fs';
import path from 'path';

/**
 * Apple Push Notification Service (APNs) for iOS Push Notifications
 * 
 * This service handles all iOS push notification operations using the node-apn library.
 * It manages connection to APNs, token validation, notification sending, and error handling.
 * 
 * Features:
 * - Authenticate with APNs using P8 certificates (recommended) or P12 certificates
 * - Send rich notifications with title, body, sound, badge, and custom data
 * - Handle APNs-specific error codes (BadDeviceToken, Unregistered, etc.)
 * - Support for silent notifications (content-available)
 * - Notification categories and actions
 * - Thread grouping for notification organization
 * - Automatic token cleanup for invalid devices
 */
export class ApnsService {
  private static provider: apn.Provider | null = null;
  private static isInitialized = false;
  private static bundleId: string = '';

  /**
   * Initialize APNs Provider
   * Requires either P8 key (recommended) or P12 certificate
   */
  static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // Get APNs configuration from environment variables
      const apnsKeyId = process.env.APNS_KEY_ID;
      const apnsTeamId = process.env.APNS_TEAM_ID;
      const apnsKeyFile = process.env.APNS_KEY_FILE;
      const apnsKeyContent = process.env.APNS_KEY_CONTENT; // Base64 encoded P8 key
      const apnsBundleId = process.env.APNS_BUNDLE_ID || 'com.chefspaice.app';
      const apnsProduction = process.env.APNS_PRODUCTION === 'true';

      // Alternative: P12 certificate authentication (legacy)
      const apnsCertFile = process.env.APNS_CERT_FILE;
      const apnsCertContent = process.env.APNS_CERT_CONTENT; // Base64 encoded P12
      const apnsCertPassphrase = process.env.APNS_CERT_PASSPHRASE;

      if (!apnsKeyId && !apnsCertFile && !apnsCertContent && !apnsKeyContent) {
        console.warn(
          '⚠️  APNs credentials not configured. iOS push notifications will NOT work.\n' +
          '   To enable iOS push notifications:\n' +
          '   1. Enroll in Apple Developer Program\n' +
          '   2. Create an App ID with Push Notifications capability\n' +
          '   3. Create an APNs Authentication Key (.p8 file) - Recommended\n' +
          '   4. Set environment variables:\n' +
          '      For P8 Key (recommended):\n' +
          '      - APNS_KEY_ID=<Your Key ID>\n' +
          '      - APNS_TEAM_ID=<Your Team ID>\n' +
          '      - APNS_KEY_FILE=<Path to .p8 file> OR APNS_KEY_CONTENT=<Base64 encoded key>\n' +
          '      - APNS_BUNDLE_ID=<Your app bundle ID>\n' +
          '      - APNS_PRODUCTION=true (for production) or false (for development)\n' +
          '      \n' +
          '      For P12 Certificate (legacy):\n' +
          '      - APNS_CERT_FILE=<Path to .p12 file> OR APNS_CERT_CONTENT=<Base64 encoded cert>\n' +
          '      - APNS_CERT_PASSPHRASE=<Certificate passphrase>\n' +
          '      - APNS_BUNDLE_ID=<Your app bundle ID>\n' +
          '      - APNS_PRODUCTION=true (for production) or false (for development)\n'
        );
        return;
      }

      this.bundleId = apnsBundleId;

      // Check if we have valid credentials before creating options
      const hasP8Auth = apnsKeyId && apnsTeamId && (apnsKeyFile || apnsKeyContent);
      const hasP12Auth = (apnsCertFile || apnsCertContent);
      
      if (!hasP8Auth && !hasP12Auth) {
        // No valid credentials, skip initialization
        return;
      }

      const options: apn.ProviderOptions = {
        production: apnsProduction,
      };

      // P8 Key authentication (recommended)
      if (apnsKeyId && apnsTeamId) {
        try {
          if (apnsKeyContent) {
            // Check if this is a dummy credential
            if (apnsKeyId === 'dummy-key-id' || apnsTeamId === 'dummy-team-id' || 
                apnsKeyContent.includes('MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2')) {
              console.warn('⚠️  APNs using dummy credentials. Push notifications will NOT work.');
              console.warn('   To enable real push notifications, replace with actual Apple Developer credentials.');
              // Mark as initialized even though it's dummy, to prevent errors
              this.isInitialized = true;
              return;
            }
            
            // If key content is provided, write it to a temp file (node-apn requires file path)
            const tempKeyPath = path.join('/tmp', `apns-key-${Date.now()}.p8`);
            let keyData: string;
            
            // Try to decode from base64 first, if that fails, use as-is
            try {
              keyData = Buffer.from(apnsKeyContent, 'base64').toString('utf-8');
            } catch {
              keyData = apnsKeyContent; // Use as-is if not base64
            }
            
            // Validate that the key looks like a P8 key
            if (!keyData.includes('BEGIN PRIVATE KEY')) {
              console.error('❌ APNs key content does not appear to be a valid P8 key');
              return;
            }
            
            fs.writeFileSync(tempKeyPath, keyData);
            options.token = {
              key: tempKeyPath,
              keyId: apnsKeyId,
              teamId: apnsTeamId,
            };
            
            // Clean up temp file after a delay
            setTimeout(() => {
              try {
                fs.unlinkSync(tempKeyPath);
              } catch {
                // Ignore cleanup errors
              }
            }, 60000);
          } else if (apnsKeyFile) {
            // Verify file exists
            if (!fs.existsSync(apnsKeyFile)) {
              console.error(`❌ APNs key file not found: ${apnsKeyFile}`);
              return;
            }
            
            options.token = {
              key: apnsKeyFile,
              keyId: apnsKeyId,
              teamId: apnsTeamId,
            };
          } else {
            console.error('❌ APNs key ID and team ID provided but no key file or content');
            return;
          }
        } catch (keyError) {
          console.error('❌ Failed to process APNs P8 key:', keyError);
          return;
        }
      }
      // P12 Certificate authentication (legacy)
      else if (apnsCertFile || apnsCertContent) {
        let certPath = apnsCertFile;
        
        // If cert content is provided, write it to a temp file
        if (apnsCertContent) {
          const tempCertPath = path.join('/tmp', `apns-cert-${Date.now()}.p12`);
          fs.writeFileSync(tempCertPath, Buffer.from(apnsCertContent, 'base64'));
          certPath = tempCertPath;
          
          // Clean up temp file after a delay
          setTimeout(() => {
            try {
              fs.unlinkSync(tempCertPath);
            } catch {
              // Ignore cleanup errors
            }
          }, 60000);
        }
        
        options.pfx = certPath;
        if (apnsCertPassphrase) {
          options.passphrase = apnsCertPassphrase;
        }
      }

      // Create APNs provider
      this.provider = new apn.Provider(options);
      this.isInitialized = true;
      
      // console.log(`✅ APNs initialized for ${apnsProduction ? 'production' : 'development'} environment`);
      // console.log(`   Bundle ID: ${this.bundleId}`);
    } catch (error) {
      console.error('❌ Failed to initialize APNs:', error);
    }
  }

  /**
   * Send push notification to iOS device
   * 
   * @param token - APNs device token (64 character hex string)
   * @param payload - Notification content
   * @returns Promise<void>
   * @throws Error with specific APNs error codes
   */
  static async sendNotification(token: string, payload: NotificationPayload): Promise<void> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('APNs is not initialized. Cannot send iOS notifications.');
    }

    try {
      // Validate token format (APNs tokens are 64 hex characters)
      if (!token || !token.match(/^[0-9a-fA-F]{64}$/)) {
        throw new Error('Invalid APNs token format');
      }

      // Create APNs notification
      const notification = new apn.Notification();
      
      // Alert content
      notification.alert = {
        title: payload.title,
        body: payload.body,
      };

      // Badge number
      if (typeof payload.badge === 'number') {
        notification.badge = payload.badge;
      }

      // Sound
      notification.sound = 'default';

      // Custom payload data
      if (payload.data) {
        notification.payload = payload.data;
      }

      // Topic (bundle ID)
      notification.topic = this.bundleId;

      // Notification expiry (1 hour from now)
      notification.expiry = Math.floor(Date.now() / 1000) + 3600;

      // Priority (10 = immediate, 5 = power considerations)
      notification.priority = 10;

      // Collapse ID for grouping updates
      if (payload.tag) {
        notification.collapseId = payload.tag;
      }

      // Thread ID for conversation grouping
      if (payload.data?.threadId) {
        notification.threadId = payload.data.threadId;
      }

      // Category for notification actions
      if (payload.actions && payload.actions.length > 0) {
        // Define category based on available actions
        // Categories must be pre-registered in the iOS app
        // Note: category property may not exist in type definition but is supported
        const anyNotification = notification;
        if (payload.actions.some(a => a.action === 'view')) {
          (anyNotification as any).category = 'VIEW_ACTION';
        } else if (payload.actions.some(a => a.action === 'dismiss')) {
          (anyNotification as any).category = 'DISMISS_ACTION';
        }
        
        // Pass actions in payload for app to handle
        notification.payload = {
          ...notification.payload,
          actions: payload.actions,
        };
      }

      // Mutable content for notification service extension
      notification.mutableContent = true;

      // Send the notification
      const result = await this.provider.send(notification, token);
      
      // Check for failures
      if (result.failed.length > 0) {
        const failure = result.failed[0];
        console.error('❌ APNs notification failed:', failure);
        
        // Handle specific error codes
        if (failure.status === 400 && failure.response?.reason === 'BadDeviceToken') {
          throw new Error('INVALID_TOKEN');
        } else if (failure.status === 410) {
          throw new Error('UNREGISTERED');
        } else if (failure.response?.reason === 'DeviceTokenNotForTopic') {
          throw new Error('WRONG_BUNDLE_ID');
        } else if (failure.response?.reason === 'TooManyRequests') {
          throw new Error('RATE_LIMIT_EXCEEDED');
        } else if (failure.response?.reason === 'PayloadTooLarge') {
          throw new Error('PAYLOAD_TOO_LARGE');
        }
        
        throw new Error(failure.response?.reason || 'UNKNOWN_ERROR');
      }

      // console.log('✅ APNs notification sent successfully');
    } catch (error: Error | unknown) {
      console.error('❌ APNs notification error:', error);
      throw error;
    }
  }

  /**
   * Validate APNs device token
   * 
   * @param token - Device token to validate
   * @returns Promise<boolean> - true if valid format, false otherwise
   */
  static async validateToken(token: string): Promise<boolean> {
    // APNs tokens are 64 hexadecimal characters
    return /^[0-9a-fA-F]{64}$/.test(token);
  }

  /**
   * Send silent notification (background update)
   * Used to wake up the app and fetch new content
   * 
   * @param token - APNs device token
   * @param data - Custom data payload
   */
  static async sendSilentNotification(token: string, data: any): Promise<void> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('APNs is not initialized');
    }

    try {
      const notification = new apn.Notification();
      
      // Content available flag triggers background fetch
      notification.contentAvailable = true;
      
      // No alert, sound, or badge for silent notifications (already undefined by default)
      
      // Custom data
      notification.payload = data;
      
      // Topic
      notification.topic = this.bundleId;
      
      // Priority 5 for background notifications
      notification.priority = 5;
      
      // Send
      const result = await this.provider.send(notification, token);
      
      if (result.failed.length > 0) {
        throw new Error(result.failed[0].response?.reason || 'Silent notification failed');
      }
      
      // console.log('✅ APNs silent notification sent');
    } catch (error) {
      console.error('❌ APNs silent notification error:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   * 
   * @param tokens - Array of device tokens
   * @param payload - Notification content
   * @returns Object with success and failure details
   */
  static async sendMultiple(
    tokens: string[], 
    payload: NotificationPayload
  ): Promise<{ sent: string[]; failed: Array<{token: string; error: string}> }> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('APNs is not initialized');
    }

    const sent: string[] = [];
    const failed: Array<{token: string; error: string}> = [];

    // APNs provider handles batching internally
    for (const token of tokens) {
      try {
        await this.sendNotification(token, payload);
        sent.push(token);
      } catch (error: Error | unknown) {
        failed.push({
          token,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { sent, failed };
  }

  /**
   * Shutdown the APNs provider connection
   * Should be called on app termination
   */
  static async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.provider = null;
      this.isInitialized = false;
      // console.log('APNs provider shutdown complete');
    }
  }

  /**
   * Get APNs service status
   */
  static getStatus(): { 
    initialized: boolean; 
    hasCredentials: boolean; 
    environment: 'production' | 'development' | 'not-configured';
    bundleId: string;
  } {
    const hasP8Credentials = !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && 
                               (process.env.APNS_KEY_FILE || process.env.APNS_KEY_CONTENT));
    const hasP12Credentials = !!(process.env.APNS_CERT_FILE || process.env.APNS_CERT_CONTENT);
    
    return {
      initialized: this.isInitialized,
      hasCredentials: hasP8Credentials || hasP12Credentials,
      environment: this.isInitialized 
        ? (process.env.APNS_PRODUCTION === 'true' ? 'production' : 'development')
        : 'not-configured',
      bundleId: this.bundleId || process.env.APNS_BUNDLE_ID || 'not-configured',
    };
  }
}

// Initialize APNs service on module load
ApnsService.initialize();

export default ApnsService;
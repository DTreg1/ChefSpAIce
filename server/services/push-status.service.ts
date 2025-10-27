import FcmService from './fcm.service';
import ApnsService from './apns.service';

/**
 * Push Notification Status Service
 * 
 * Provides status information about push notification services configuration
 * Helps administrators verify that credentials are properly configured
 */
export class PushStatusService {
  /**
   * Get comprehensive status of all push notification services
   */
  static getStatus(): {
    web: {
      configured: boolean;
      hasVapidKeys: boolean;
    };
    android: {
      configured: boolean;
      hasCredentials: boolean;
      initialized: boolean;
    };
    ios: {
      configured: boolean;
      hasCredentials: boolean;
      initialized: boolean;
      environment: 'production' | 'development' | 'not-configured';
      bundleId: string;
    };
    summary: {
      allConfigured: boolean;
      platformsAvailable: string[];
      missingCredentials: string[];
    };
  } {
    // Web Push Status
    const hasVapidPublicKey = !!process.env.VITE_VAPID_PUBLIC_KEY;
    const hasVapidPrivateKey = !!process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PRIVATE_KEY !== 'your-private-key-here';
    const webConfigured = hasVapidPublicKey && hasVapidPrivateKey;

    // FCM Status
    const fcmStatus = FcmService.getStatus();
    
    // APNs Status  
    const apnsStatus = ApnsService.getStatus();

    // Determine available platforms
    const platformsAvailable: string[] = [];
    if (webConfigured) platformsAvailable.push('web');
    if (fcmStatus.initialized) platformsAvailable.push('android');
    if (apnsStatus.initialized) platformsAvailable.push('ios');

    // Determine missing credentials
    const missingCredentials: string[] = [];
    if (!webConfigured) {
      if (!hasVapidPublicKey) missingCredentials.push('VITE_VAPID_PUBLIC_KEY');
      if (!hasVapidPrivateKey) missingCredentials.push('VAPID_PRIVATE_KEY');
    }
    if (!fcmStatus.hasCredentials) {
      missingCredentials.push('FCM credentials (FCM_SERVICE_ACCOUNT, FCM_SERVICE_ACCOUNT_PATH, or FCM_SERVER_KEY)');
    }
    if (!apnsStatus.hasCredentials) {
      missingCredentials.push('APNs credentials (APNS_KEY_ID + APNS_TEAM_ID + APNS_KEY_FILE/CONTENT or APNS_CERT_FILE/CONTENT)');
    }

    return {
      web: {
        configured: webConfigured,
        hasVapidKeys: hasVapidPublicKey && hasVapidPrivateKey,
      },
      android: {
        configured: fcmStatus.hasCredentials,
        hasCredentials: fcmStatus.hasCredentials,
        initialized: fcmStatus.initialized,
      },
      ios: {
        configured: apnsStatus.hasCredentials,
        hasCredentials: apnsStatus.hasCredentials,
        initialized: apnsStatus.initialized,
        environment: apnsStatus.environment,
        bundleId: apnsStatus.bundleId,
      },
      summary: {
        allConfigured: webConfigured && fcmStatus.initialized && apnsStatus.initialized,
        platformsAvailable,
        missingCredentials,
      },
    };
  }

  /**
   * Log status to console with formatting
   */
  static logStatus(): void {
    const status = this.getStatus();
    
    console.log('\n📱 Push Notification Services Status:');
    console.log('=====================================');
    
    // Web Push
    console.log('\n🌐 Web Push:');
    console.log(`   Status: ${status.web.configured ? '✅ Configured' : '❌ Not configured'}`);
    if (!status.web.configured) {
      console.log('   Missing: VAPID keys');
    }
    
    // Android (FCM)
    console.log('\n🤖 Android (FCM):');
    console.log(`   Status: ${status.android.initialized ? '✅ Initialized' : '❌ Not initialized'}`);
    if (!status.android.hasCredentials) {
      console.log('   Missing: FCM service account or server key');
    }
    
    // iOS (APNs)
    console.log('\n🍎 iOS (APNs):');
    console.log(`   Status: ${status.ios.initialized ? '✅ Initialized' : '❌ Not initialized'}`);
    if (status.ios.initialized) {
      console.log(`   Environment: ${status.ios.environment}`);
      console.log(`   Bundle ID: ${status.ios.bundleId}`);
    } else if (!status.ios.hasCredentials) {
      console.log('   Missing: APNs P8 key or P12 certificate');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Platforms available: ${status.summary.platformsAvailable.join(', ') || 'None'}`);
    if (status.summary.missingCredentials.length > 0) {
      console.log('   ⚠️  Missing credentials:');
      status.summary.missingCredentials.forEach(cred => {
        console.log(`      - ${cred}`);
      });
    }
    
    if (status.summary.allConfigured) {
      console.log('\n✨ All push notification services are configured and ready!');
    } else {
      console.log('\n⚠️  Some push notification services are not configured.');
      console.log('   Please set the required environment variables to enable all platforms.');
    }
    
    console.log('=====================================\n');
  }

  /**
   * Validate environment variables on startup
   */
  static validateOnStartup(): void {
    // Log status on startup
    this.logStatus();
    
    // Get status
    const status = this.getStatus();
    
    // Warn if no platforms are available
    if (status.summary.platformsAvailable.length === 0) {
      console.error(
        '⚠️  WARNING: No push notification platforms are configured!\n' +
        '   Users will not be able to receive push notifications.\n' +
        '   Please configure at least one platform (Web, Android, or iOS).'
      );
    }
    
    // Log instructions for missing credentials
    if (status.summary.missingCredentials.length > 0) {
      console.log('\n📝 Configuration Instructions:');
      
      if (!status.web.configured) {
        console.log('\nFor Web Push:');
        console.log('1. Generate VAPID keys: npx web-push generate-vapid-keys');
        console.log('2. Set VITE_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment');
      }
      
      if (!status.android.hasCredentials) {
        console.log('\nFor Android (FCM):');
        console.log('1. Create a Firebase project at console.firebase.google.com');
        console.log('2. Add your Android app to the project');
        console.log('3. Download service account JSON from Project Settings > Service Accounts');
        console.log('4. Set FCM_SERVICE_ACCOUNT environment variable with the JSON content');
      }
      
      if (!status.ios.hasCredentials) {
        console.log('\nFor iOS (APNs):');
        console.log('1. Enroll in Apple Developer Program');
        console.log('2. Create an App ID with Push Notifications capability');
        console.log('3. Create an APNs Authentication Key (.p8 file)');
        console.log('4. Set APNS_KEY_ID, APNS_TEAM_ID, and APNS_KEY_CONTENT environment variables');
      }
    }
  }
}

export default PushStatusService;
# Fix 2: iPad Authentication Errors

## Problem
Apple rejected the app under Guideline 2.1 (Bugs) due to authentication errors on iPad Air 11-inch (M3) with iPadOS 26.1. Users cannot log in using Apple Sign-In on this device.

## Current Behavior
- Apple Sign-In works on iPhone
- Apple Sign-In fails on iPad (specific models/iOS versions)
- Error details unknown - need to add logging

## Goal
Identify and fix the iPad-specific authentication issues to ensure Apple Sign-In works across all iOS/iPadOS devices.

---

## Step-by-Step Instructions

### Step 1: Add Detailed Error Logging to Apple Sign-In

```
In client/contexts/AuthContext.tsx, find the signInWithApple function and add comprehensive error logging:
1. Log the device type (iPhone vs iPad)
2. Log the iOS/iPadOS version
3. Log the full error object with stack trace
4. Log the credential data received (without sensitive info)
5. Log each step of the authentication flow
```

### Step 2: Add Device Information to Auth Requests

```
Create a utility function in client/lib/device-info.ts that returns:
1. Platform (ios/android/web)
2. Device type (iPhone/iPad/Android Phone/Android Tablet)
3. OS version
4. Device model
5. App version

Send this information with auth requests to help debug.
```

### Step 3: Check Apple Token Audience Configuration

```
In server/routers/social-auth.router.ts, review the verifyAppleToken function:
1. Ensure all valid audience values are configured
2. Check if iPad uses a different bundle ID
3. Verify the service ID is correct for web OAuth
4. Add logging for audience validation failures

The audiences should include:
- Bundle ID: com.chefspaice.app
- Service ID: com.chefspaice.web
- Expo Go bundle ID (for development): host.exp.Exponent
```

### Step 4: Handle iPad-Specific Authentication Flow

```
In client/contexts/AuthContext.tsx, check if iPad requires different handling:
1. Check if expo-apple-authentication behaves differently on iPad
2. Test if the nonce generation works on iPad
3. Verify fullName and email are returned properly on iPad
4. Add fallback handling if iPad returns different data
```

### Step 5: Add Network Timeout Handling

```
In server/routers/social-auth.router.ts, add timeout handling for Apple token verification:
1. Set a reasonable timeout (10 seconds)
2. Add retry logic for network failures
3. Return specific error messages for timeout vs verification failure
4. Log all network-related errors
```

### Step 6: Test on iPad Simulator and Device

```
Test the following scenarios on iPad:
1. Fresh install, Apple Sign-In (first time)
2. Returning user, Apple Sign-In
3. Apple Sign-In with email hidden
4. Apple Sign-In with email shared
5. Sign out and sign back in
6. Network interruption during sign-in

Use the iPad Air 11-inch (M3) simulator in Xcode if available.
```

### Step 7: Add User-Facing Error Messages

```
In client/screens/AuthScreen.tsx, improve error handling:
1. Show specific error messages for different failure types
2. Offer alternative sign-in methods when Apple Sign-In fails
3. Provide a "Try Again" button with automatic retry
4. Log errors to a crash reporting service (if available)
```

---

## Code Snippets

### Device Info Utility (device-info.ts)

```typescript
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export async function getDeviceInfo() {
  return {
    platform: Platform.OS,
    osVersion: Platform.Version,
    deviceType: Device.deviceType, // 1=Phone, 2=Tablet
    deviceName: Device.deviceName,
    modelName: Device.modelName,
    isTablet: Device.deviceType === Device.DeviceType.TABLET,
    appVersion: Constants.expoConfig?.version || 'unknown',
  };
}
```

### Enhanced Apple Sign-In Logging

```typescript
async function signInWithApple() {
  const deviceInfo = await getDeviceInfo();
  console.log('[AppleSignIn] Starting on device:', deviceInfo);
  
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    console.log('[AppleSignIn] Credential received:', {
      user: credential.user?.substring(0, 8) + '...',
      email: credential.email ? 'provided' : 'hidden',
      fullName: credential.fullName ? 'provided' : 'not provided',
      hasIdentityToken: !!credential.identityToken,
      hasAuthorizationCode: !!credential.authorizationCode,
    });
    
    // Continue with server verification...
  } catch (error: any) {
    console.error('[AppleSignIn] Error:', {
      code: error.code,
      message: error.message,
      deviceInfo,
      stack: error.stack,
    });
    throw error;
  }
}
```

### Server-Side Audience Validation

```typescript
const VALID_AUDIENCES = [
  'com.chefspaice.app',           // iOS bundle ID
  'com.chefspaice.web',           // Web service ID
  'host.exp.Exponent',            // Expo Go (development)
];

async function verifyAppleToken(identityToken: string) {
  try {
    const decoded = await appleSignIn.verifyIdToken(identityToken, {
      audience: VALID_AUDIENCES,
      ignoreExpiration: false,
    });
    
    console.log('[AppleAuth] Token verified, audience:', decoded.aud);
    return decoded;
  } catch (error: any) {
    console.error('[AppleAuth] Verification failed:', {
      error: error.message,
      expectedAudiences: VALID_AUDIENCES,
    });
    throw error;
  }
}
```

---

## Verification Checklist

- [ ] Detailed logging added to Apple Sign-In flow
- [ ] Device info sent with auth requests
- [ ] All valid audiences configured on server
- [ ] Error messages are user-friendly
- [ ] Tested on iPad Air 11-inch (M3) simulator
- [ ] Tested on physical iPad device (if available)
- [ ] Fallback auth methods work when Apple Sign-In fails
- [ ] Network timeout handling implemented

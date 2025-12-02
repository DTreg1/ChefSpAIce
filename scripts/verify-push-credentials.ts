#!/usr/bin/env tsx

/**
 * Push Notification Credentials Verification Script
 *
 * This script checks if your push notification credentials are properly configured
 * and provides helpful feedback on what's missing or misconfigured.
 *
 * Usage: npm run verify-push
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const checkmark = `${colors.green}✓${colors.reset}`;
const warning = `${colors.yellow}⚠${colors.reset}`;
const cross = `${colors.red}✗${colors.reset}`;

console.log(
  `${colors.bold}${colors.cyan}Push Notification Credentials Verification${colors.reset}\n`,
);

// Check Firebase/FCM credentials
console.log(`${colors.bold}Firebase (Android) Configuration:${colors.reset}`);

const fcmServiceAccount = process.env.FCM_SERVICE_ACCOUNT;
const fcmServiceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
const fcmServerKey = process.env.FCM_SERVER_KEY;

let fcmConfigured = false;

if (fcmServiceAccount) {
  try {
    const serviceAccount = JSON.parse(fcmServiceAccount);
    if (
      serviceAccount.project_id &&
      serviceAccount.private_key &&
      serviceAccount.client_email
    ) {
      console.log(`${checkmark} FCM_SERVICE_ACCOUNT is configured`);
      console.log(`  Project ID: ${serviceAccount.project_id}`);
      console.log(`  Client Email: ${serviceAccount.client_email}`);

      // Check if it's a dummy credential
      if (serviceAccount.project_id === "dummy-project") {
        console.log(
          `${warning} Using dummy credentials - push notifications will NOT work`,
        );
      } else {
        fcmConfigured = true;
      }
    } else {
      console.log(
        `${cross} FCM_SERVICE_ACCOUNT is invalid - missing required fields`,
      );
    }
  } catch (error) {
    console.log(`${cross} FCM_SERVICE_ACCOUNT is not valid JSON`);
    console.log(
      `  Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
} else if (fcmServiceAccountPath) {
  // Resolve path relative to project root
  const resolvedPath = path.resolve(process.cwd(), fcmServiceAccountPath);
  if (fs.existsSync(resolvedPath)) {
    try {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      const serviceAccount = JSON.parse(content);
      console.log(`${checkmark} FCM_SERVICE_ACCOUNT_PATH points to valid file`);
      console.log(`  Path: ${fcmServiceAccountPath}`);
      console.log(`  Project ID: ${serviceAccount.project_id}`);

      if (serviceAccount.project_id === "dummy-project") {
        console.log(
          `${warning} Using dummy credentials - push notifications will NOT work`,
        );
      } else {
        fcmConfigured = true;
      }
    } catch (error) {
      console.log(
        `${cross} File at FCM_SERVICE_ACCOUNT_PATH is not valid JSON`,
      );
    }
  } else {
    console.log(
      `${cross} FCM_SERVICE_ACCOUNT_PATH file does not exist: ${fcmServiceAccountPath}`,
    );
    console.log(`  Resolved path: ${resolvedPath}`);
  }
} else if (fcmServerKey) {
  console.log(
    `${warning} FCM_SERVER_KEY is deprecated - use FCM_SERVICE_ACCOUNT instead`,
  );
  console.log(
    `  See the setup guide for instructions on obtaining service account credentials`,
  );
} else {
  console.log(`${cross} No Firebase credentials configured`);
  console.log(
    `  Set FCM_SERVICE_ACCOUNT or FCM_SERVICE_ACCOUNT_PATH environment variable`,
  );
}

if (!fcmConfigured) {
  console.log(
    `\n${colors.yellow}To enable Android push notifications:${colors.reset}`,
  );
  console.log("  1. Create a Firebase project at console.firebase.google.com");
  console.log("  2. Generate a service account key");
  console.log("  3. Set FCM_SERVICE_ACCOUNT environment variable");
  console.log(
    `  See docs/PUSH_NOTIFICATIONS_SETUP.md for detailed instructions`,
  );
}

// Check Apple/APNs credentials
console.log(`\n${colors.bold}Apple (iOS) Configuration:${colors.reset}`);

const apnsKeyId = process.env.APNS_KEY_ID;
const apnsTeamId = process.env.APNS_TEAM_ID;
const apnsKeyFile = process.env.APNS_KEY_FILE;
const apnsKeyContent = process.env.APNS_KEY_CONTENT;
const apnsBundleId = process.env.APNS_BUNDLE_ID || "com.chefspaice.app";
const apnsProduction = process.env.APNS_PRODUCTION;

let apnsConfigured = false;

if (apnsKeyId && apnsTeamId) {
  console.log(`${checkmark} APNS_KEY_ID is set: ${apnsKeyId}`);
  console.log(`${checkmark} APNS_TEAM_ID is set: ${apnsTeamId}`);

  // Check if using dummy credentials
  if (apnsKeyId === "dummy-key-id" || apnsTeamId === "dummy-team-id") {
    console.log(
      `${warning} Using dummy credentials - push notifications will NOT work`,
    );
  } else {
    // Check for key file or content
    if (apnsKeyContent) {
      try {
        // Try to decode from base64
        const decoded = Buffer.from(apnsKeyContent, "base64").toString("utf-8");
        if (decoded.includes("BEGIN PRIVATE KEY")) {
          console.log(
            `${checkmark} APNS_KEY_CONTENT contains valid P8 key (base64 encoded)`,
          );
          apnsConfigured = true;
        } else if (apnsKeyContent.includes("BEGIN PRIVATE KEY")) {
          console.log(
            `${checkmark} APNS_KEY_CONTENT contains valid P8 key (plain text)`,
          );
          apnsConfigured = true;
        } else {
          console.log(
            `${cross} APNS_KEY_CONTENT does not appear to be a valid P8 key`,
          );
        }
      } catch (error) {
        console.log(`${cross} Failed to decode APNS_KEY_CONTENT`);
      }
    } else if (apnsKeyFile) {
      // Resolve path relative to project root
      const resolvedKeyPath = path.resolve(process.cwd(), apnsKeyFile);
      if (fs.existsSync(resolvedKeyPath)) {
        const content = fs.readFileSync(resolvedKeyPath, "utf-8");
        if (content.includes("BEGIN PRIVATE KEY")) {
          console.log(
            `${checkmark} APNS_KEY_FILE points to valid P8 key: ${apnsKeyFile}`,
          );
          apnsConfigured = true;
        } else {
          console.log(`${cross} APNS_KEY_FILE does not contain a valid P8 key`);
        }
      } else {
        console.log(`${cross} APNS_KEY_FILE does not exist: ${apnsKeyFile}`);
      }
    } else {
      console.log(`${cross} Neither APNS_KEY_CONTENT nor APNS_KEY_FILE is set`);
    }
  }

  console.log(`${checkmark} APNS_BUNDLE_ID: ${apnsBundleId}`);

  if (apnsProduction === "true") {
    console.log(`${checkmark} APNS_PRODUCTION: true (Production mode)`);
  } else if (apnsProduction === "false") {
    console.log(`${checkmark} APNS_PRODUCTION: false (Development mode)`);
  } else {
    console.log(
      `${warning} APNS_PRODUCTION not set (defaulting to Development mode)`,
    );
  }
} else {
  if (!apnsKeyId) {
    console.log(`${cross} APNS_KEY_ID is not set`);
  }
  if (!apnsTeamId) {
    console.log(`${cross} APNS_TEAM_ID is not set`);
  }
}

if (!apnsConfigured) {
  console.log(
    `\n${colors.yellow}To enable iOS push notifications:${colors.reset}`,
  );
  console.log("  1. Enroll in Apple Developer Program ($99/year)");
  console.log("  2. Create an App ID with Push Notifications capability");
  console.log("  3. Generate an APNs Authentication Key (.p8 file)");
  console.log(
    "  4. Set APNS_KEY_ID, APNS_TEAM_ID, and APNS_KEY_CONTENT environment variables",
  );
  console.log(
    `  See docs/PUSH_NOTIFICATIONS_SETUP.md for detailed instructions`,
  );
}

// Summary
console.log(`\n${colors.bold}Summary:${colors.reset}`);

if (fcmConfigured && apnsConfigured) {
  console.log(
    `${checkmark} ${colors.green}Both Android and iOS push notifications are configured!${colors.reset}`,
  );
  console.log(
    `  Your app is ready to send push notifications to both platforms.`,
  );
} else if (fcmConfigured) {
  console.log(`${checkmark} Android push notifications are configured`);
  console.log(`${cross} iOS push notifications are NOT configured`);
} else if (apnsConfigured) {
  console.log(`${cross} Android push notifications are NOT configured`);
  console.log(`${checkmark} iOS push notifications are configured`);
} else {
  console.log(
    `${cross} ${colors.red}Neither Android nor iOS push notifications are configured${colors.reset}`,
  );
  console.log(
    `  Follow the setup guide at docs/PUSH_NOTIFICATIONS_SETUP.md to get started.`,
  );
}

console.log(
  `\n${colors.cyan}For detailed setup instructions, see: docs/PUSH_NOTIFICATIONS_SETUP.md${colors.reset}`,
);

// Exit with appropriate code
process.exit(fcmConfigured || apnsConfigured ? 0 : 1);

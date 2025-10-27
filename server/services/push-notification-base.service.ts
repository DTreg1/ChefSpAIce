/**
 * Base Push Notification Service
 * 
 * Shared abstraction layer for push notification services (FCM, APNs, Web Push)
 * Eliminates duplication in token management, error handling, and notification formatting
 */

import { storage } from "../storage";
import type { PushToken } from "@shared/schema";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  icon?: string;
  image?: string;
  clickAction?: string;
  collapseKey?: string;
  priority?: 'high' | 'normal';
  ttl?: number; // Time to live in seconds
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  shouldRemoveToken?: boolean; // If true, token should be removed from DB
}

export interface BatchSendResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    token: string;
    result: PushNotificationResult;
  }>;
  invalidTokens: string[];
}

/**
 * Abstract base class for push notification services
 */
export abstract class BasePushNotificationService {
  protected serviceName: string;
  protected initialized = false;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  /**
   * Initialize the service (load credentials, setup clients, etc.)
   */
  abstract initialize(): Promise<void>;
  
  /**
   * Send notification to a single token
   */
  protected abstract sendToToken(
    token: string,
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult>;
  
  /**
   * Get all tokens for a user from storage
   */
  async getUserTokens(userId: string): Promise<PushToken[]> {
    try {
      const tokens = await storage.getPushNotificationTokens(userId);
      return tokens || [];
    } catch (error) {
      console.error(`[${this.serviceName}] Error fetching user tokens:`, error);
      return [];
    }
  }
  
  /**
   * Register a new token for a user
   */
  async registerToken(userId: string, token: string, metadata?: any): Promise<void> {
    try {
      await storage.savePushNotificationToken({
        userId,
        token,
        provider: this.serviceName.toLowerCase() as any,
        metadata,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      
      console.log(`[${this.serviceName}] Token registered for user ${userId}`);
    } catch (error) {
      console.error(`[${this.serviceName}] Error registering token:`, error);
      throw error;
    }
  }
  
  /**
   * Remove an invalid token from storage
   */
  async removeInvalidToken(userId: string, token: string): Promise<void> {
    try {
      await storage.removePushNotificationToken(userId, token);
      console.log(`[${this.serviceName}] Removed invalid token for user ${userId}`);
    } catch (error) {
      console.error(`[${this.serviceName}] Error removing invalid token:`, error);
    }
  }
  
  /**
   * Send notification to a single user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<BatchSendResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const tokens = await this.getUserTokens(userId);
    
    if (tokens.length === 0) {
      console.log(`[${this.serviceName}] No tokens found for user ${userId}`);
      return {
        successCount: 0,
        failureCount: 0,
        results: [],
        invalidTokens: [],
      };
    }
    
    return this.sendToTokens(
      tokens.map(t => ({ userId, token: t.token })),
      payload
    );
  }
  
  /**
   * Send notification to multiple tokens with automatic cleanup of invalid tokens
   */
  async sendToTokens(
    targets: Array<{ userId: string; token: string }>,
    payload: PushNotificationPayload
  ): Promise<BatchSendResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const results: BatchSendResult['results'] = [];
    const invalidTokens: string[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Process in batches to avoid overwhelming the service
    const BATCH_SIZE = 100;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async ({ userId, token }) => {
        try {
          const result = await this.sendToToken(token, payload);
          
          if (result.success) {
            successCount++;
            
            // Update last used timestamp
            await storage.updatePushNotificationTokenLastUsed(userId, token);
          } else {
            failureCount++;
            
            // Remove invalid tokens
            if (result.shouldRemoveToken) {
              invalidTokens.push(token);
              await this.removeInvalidToken(userId, token);
            }
          }
          
          results.push({ token, result });
        } catch (error) {
          failureCount++;
          console.error(`[${this.serviceName}] Error sending to token:`, error);
          
          results.push({
            token,
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return {
      successCount,
      failureCount,
      results,
      invalidTokens,
    };
  }
  
  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<BatchSendResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const allTargets: Array<{ userId: string; token: string }> = [];
    
    // Collect all tokens for all users
    for (const userId of userIds) {
      const tokens = await this.getUserTokens(userId);
      for (const token of tokens) {
        allTargets.push({ userId, token: token.token });
      }
    }
    
    if (allTargets.length === 0) {
      console.log(`[${this.serviceName}] No tokens found for any users`);
      return {
        successCount: 0,
        failureCount: 0,
        results: [],
        invalidTokens: [],
      };
    }
    
    return this.sendToTokens(allTargets, payload);
  }
  
  /**
   * Format notification payload according to platform requirements
   */
  protected formatPayload(payload: PushNotificationPayload): any {
    // Base implementation - can be overridden by specific services
    return {
      notification: {
        title: payload.title,
        body: payload.body,
        badge: payload.badge?.toString(),
        sound: payload.sound || 'default',
        icon: payload.icon,
        image: payload.image,
        click_action: payload.clickAction,
      },
      data: payload.data || {},
      priority: payload.priority || 'high',
      ttl: payload.ttl || 86400, // Default 24 hours
      collapse_key: payload.collapseKey,
    };
  }
  
  /**
   * Common error handling logic
   */
  protected handleSendError(error: any): PushNotificationResult {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Common patterns for invalid tokens across services
    const invalidTokenPatterns = [
      /invalid.?registration/i,
      /not.?registered/i,
      /invalid.?token/i,
      /bad.?device.?token/i,
      /unregistered/i,
      /invalid.?recipient/i,
      /mismatch.?sender/i,
    ];
    
    const shouldRemoveToken = invalidTokenPatterns.some(pattern => 
      pattern.test(errorMessage)
    );
    
    return {
      success: false,
      error: errorMessage,
      shouldRemoveToken,
    };
  }
  
  /**
   * Test notification to verify service is working
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const result = await this.sendToUser(userId, {
        title: `Test Notification - ${this.serviceName}`,
        body: 'This is a test notification. If you see this, push notifications are working!',
        data: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });
      
      return result.successCount > 0;
    } catch (error) {
      console.error(`[${this.serviceName}] Test notification failed:`, error);
      return false;
    }
  }
  
  /**
   * Get service status and statistics
   */
  async getStatus(): Promise<{
    initialized: boolean;
    name: string;
    totalTokens?: number;
  }> {
    let totalTokens: number | undefined;
    
    try {
      const allTokens = await storage.getAllPushNotificationTokens();
      totalTokens = allTokens.filter(
        t => t.provider === this.serviceName.toLowerCase()
      ).length;
    } catch (error) {
      console.error(`[${this.serviceName}] Error getting status:`, error);
    }
    
    return {
      initialized: this.initialized,
      name: this.serviceName,
      totalTokens,
    };
  }
}
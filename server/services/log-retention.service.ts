/**
 * Log Retention Service
 * 
 * Manages automatic cleanup of old activity logs based on retention policies.
 * Runs periodic cleanup jobs to remove expired logs and maintain database performance.
 */

import * as cron from "node-cron";
import { storage } from "../storage";

interface RetentionPolicy {
  name: string;
  retentionDays: number;
  actions?: string[];
  excludeActions?: string[];
  enabled: boolean;
}

class LogRetentionService {
  private cleanupJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  
  // Default retention policies
  private policies: RetentionPolicy[] = [
    {
      name: "general_activity",
      retentionDays: 90,
      excludeActions: ["error_occurred", "login", "logout", "settings_changed"],
      enabled: true,
    },
    {
      name: "error_logs",
      retentionDays: 30,
      actions: ["error_occurred"],
      enabled: true,
    },
    {
      name: "authentication_events",
      retentionDays: 180,
      actions: ["login", "logout", "signup"],
      enabled: true,
    },
    {
      name: "critical_actions",
      retentionDays: 365,
      actions: ["settings_changed", "data_exported", "data_imported", "account_deleted"],
      enabled: true,
    },
  ];
  
  constructor() {
    // Initialize with default schedule (daily at 2 AM)
    this.initializeSchedule();
  }
  
  /**
   * Initialize the cron schedule for cleanup jobs
   */
  private initializeSchedule() {
    // Run daily at 2 AM server time
    const schedule = "0 2 * * *";
    
    this.cleanupJob = cron.schedule(
      schedule,
      async () => {
        await this.runCleanup();
      },
      {
        timezone: process.env.TZ || "UTC",
      }
    );
    
    console.log("[LogRetention] Cleanup job scheduled for daily execution at 2 AM");
    
    // Also run cleanup on service initialization if not recently run
    this.runInitialCleanupCheck();
  }
  
  /**
   * Check if cleanup should run on startup
   */
  private async runInitialCleanupCheck() {
    try {
      // Check if cleanup was run in the last 24 hours
      const lastCleanup = await this.getLastCleanupTime();
      const now = new Date();
      const hoursSinceLastCleanup = lastCleanup 
        ? (now.getTime() - lastCleanup.getTime()) / (1000 * 60 * 60)
        : Number.MAX_VALUE;
      
      if (hoursSinceLastCleanup > 24) {
        console.log("[LogRetention] Running initial cleanup (last run:", lastCleanup || "never", ")");
        await this.runCleanup();
      } else {
        console.log("[LogRetention] Skipping initial cleanup (last run:", Math.floor(hoursSinceLastCleanup), "hours ago)");
      }
    } catch (error) {
      console.error("[LogRetention] Error checking initial cleanup:", error);
    }
  }
  
  /**
   * Get the last cleanup time from system logs
   */
  private async getLastCleanupTime(): Promise<Date | null> {
    try {
      // Get the most recent system cleanup log
      const logs = await storage.getSystemActivityLogs({
        action: "log_cleanup_completed",
        limit: 1,
      });
      
      if (logs && logs.length > 0) {
        return new Date(logs[0].timestamp);
      }
      
      return null;
    } catch (error) {
      console.error("[LogRetention] Error getting last cleanup time:", error);
      return null;
    }
  }
  
  /**
   * Run the cleanup process for all policies
   */
  public async runCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log("[LogRetention] Cleanup already in progress, skipping...");
      return;
    }
    
    this.isRunning = true;
    const startTime = new Date();
    let totalDeleted = 0;
    const results: Array<{ policy: string; deleted: number; error?: string }> = [];
    
    try {
      console.log("[LogRetention] Starting scheduled cleanup at", startTime.toISOString());
      
      // Process each retention policy
      for (const policy of this.policies) {
        if (!policy.enabled) {
          console.log(`[LogRetention] Skipping disabled policy: ${policy.name}`);
          continue;
        }
        
        try {
          const deleted = await this.processPolicyCleanup(policy);
          totalDeleted += deleted;
          results.push({ policy: policy.name, deleted });
          
          console.log(`[LogRetention] Policy ${policy.name}: Deleted ${deleted} logs`);
        } catch (error: any) {
          console.error(`[LogRetention] Error processing policy ${policy.name}:`, error);
          results.push({ 
            policy: policy.name, 
            deleted: 0, 
            error: error.message 
          });
        }
      }
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Log the cleanup completion as a system event
      const metadata: Record<string, any> = {
        totalDeleted,
        duration,
        results,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
      
      await storage.createActivityLog({
        userId: null, // System action
        action: "log_cleanup_completed",
        entity: "activity_logs",
        metadata,
      });
      
      console.log(
        `[LogRetention] Cleanup completed. Total deleted: ${totalDeleted}, Duration: ${duration}ms`
      );
    } catch (error) {
      console.error("[LogRetention] Fatal error during cleanup:", error);
      
      // Log the error as a system event
      const errorMetadata: Record<string, any> = {
        error: error instanceof Error ? error.message : "Unknown error",
        startTime: startTime.toISOString(),
      };
      
      await storage.createActivityLog({
        userId: null,
        action: "log_cleanup_error",
        entity: "activity_logs",
        metadata: errorMetadata,
      });
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Process cleanup for a specific retention policy
   */
  private async processPolicyCleanup(policy: RetentionPolicy): Promise<number> {
    // Build the action filter based on policy
    const actionFilter = this.buildActionFilter(policy);
    
    try {
      // Delete old logs based on the policy
      // cleanupOldActivityLogs expects retentionDays (how many days to keep)
      const deletedCount = await storage.cleanupOldActivityLogs(
        policy.retentionDays,
        actionFilter.excludeActions
      );
      
      return deletedCount;
    } catch (error) {
      console.error(`[LogRetention] Error deleting logs for policy ${policy.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Build action filter for a retention policy
   */
  private buildActionFilter(policy: RetentionPolicy): {
    includeActions?: string[];
    excludeActions?: string[];
  } {
    const filter: {
      includeActions?: string[];
      excludeActions?: string[];
    } = {};
    
    if (policy.actions) {
      filter.includeActions = policy.actions;
    }
    
    if (policy.excludeActions) {
      filter.excludeActions = policy.excludeActions;
    }
    
    return filter;
  }
  
  /**
   * Update retention policies
   */
  public updatePolicies(policies: RetentionPolicy[]): void {
    this.policies = policies;
    console.log("[LogRetention] Policies updated:", policies.length, "policies");
  }
  
  /**
   * Get current retention policies
   */
  public getPolicies(): RetentionPolicy[] {
    return this.policies;
  }
  
  /**
   * Manually trigger cleanup (for admin use)
   */
  public async triggerManualCleanup(): Promise<{
    success: boolean;
    totalDeleted?: number;
    error?: string;
  }> {
    try {
      await this.runCleanup();
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || "Cleanup failed" 
      };
    }
  }
  
  /**
   * Stop the cleanup job
   */
  public stop(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      console.log("[LogRetention] Cleanup job stopped");
    }
  }
  
  /**
   * Start the cleanup job
   */
  public start(): void {
    if (this.cleanupJob) {
      this.cleanupJob.start();
      console.log("[LogRetention] Cleanup job started");
    }
  }
  
  /**
   * Check if cleanup job is running
   */
  public isJobRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Get cleanup status
   */
  public async getStatus(): Promise<{
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    policies: RetentionPolicy[];
  }> {
    const lastRun = await this.getLastCleanupTime();
    
    // Calculate next run time (next 2 AM)
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(2, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return {
      isRunning: this.isRunning,
      lastRun,
      nextRun,
      policies: this.policies,
    };
  }
}

// Export singleton instance
export const logRetentionService = new LogRetentionService();
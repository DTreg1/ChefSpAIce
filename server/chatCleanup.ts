import { storage } from "./storage";
import { log } from "./vite";

// Maximum number of users to track in memory
const MAX_TRACKED_USERS = 1000;
const MAX_MAP_SIZE_BEFORE_CLEANUP = 1200;

// Cleanup tracker to avoid running cleanup too frequently for the same user
const userCleanupTimestamps = new Map<string, number>();

// Track cleanup statistics for monitoring
let cleanupStats = {
  totalCleanups: 0,
  totalMessagesDeleted: 0,
  lastPruneTime: Date.now(),
  pruneCount: 0,
};

// Prune oldest entries when map gets too large
function pruneOldestEntries() {
  if (userCleanupTimestamps.size <= MAX_TRACKED_USERS) {
    return;
  }
  
  // Convert to array and sort by timestamp
  const entries = Array.from(userCleanupTimestamps.entries())
    .sort((a, b) => a[1] - b[1]);
  
  // Calculate how many to remove
  const toRemove = userCleanupTimestamps.size - MAX_TRACKED_USERS;
  
  // Remove oldest entries
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    userCleanupTimestamps.delete(entries[i][0]);
  }
  
  cleanupStats.pruneCount++;
  cleanupStats.lastPruneTime = Date.now();
  
  log(`Pruned ${toRemove} old entries from cleanup tracker. Current size: ${userCleanupTimestamps.size}`);
}

// Cleanup scheduler - automatically cleans up old messages when user accesses chat
export async function cleanupOldMessagesForUser(userId: string) {
  const HOURS_TO_KEEP = 24;
  const CLEANUP_COOLDOWN = 60 * 60 * 1000; // Only cleanup once per hour per user
  
  // Emergency cleanup if map is getting too large
  if (userCleanupTimestamps.size > MAX_MAP_SIZE_BEFORE_CLEANUP) {
    pruneOldestEntries();
  }
  
  const lastCleanup = userCleanupTimestamps.get(userId);
  const now = Date.now();
  
  // Skip if we cleaned up recently for this user
  if (lastCleanup && (now - lastCleanup) < CLEANUP_COOLDOWN) {
    return;
  }
  
  try {
    const deleted = await storage.deleteOldChatMessages(userId, HOURS_TO_KEEP);
    if (deleted > 0) {
      log(`Cleaned up ${deleted} old chat messages for user ${userId.substring(0, 8)}...`);
      cleanupStats.totalMessagesDeleted += deleted;
    }
    
    cleanupStats.totalCleanups++;
    
    // Update timestamp
    userCleanupTimestamps.set(userId, now);
    
    // Prune if we've reached the limit
    if (userCleanupTimestamps.size > MAX_TRACKED_USERS) {
      pruneOldestEntries();
    }
  } catch (error) {
    console.error(`Error cleaning up messages for user ${userId}:`, error);
    // Don't update timestamp on error so cleanup will be retried
  }
}

// Periodic cleanup of the cleanup tracker itself
const cleanupInterval = setInterval(() => {
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  const toDelete: string[] = [];
  let staleCount = 0;
  
  userCleanupTimestamps.forEach((timestamp, userId) => {
    // Remove entries older than 2 hours (they can be re-added if user is active)
    if (timestamp < twoHoursAgo) {
      toDelete.push(userId);
      staleCount++;
    }
  });
  
  if (toDelete.length > 0) {
    toDelete.forEach(userId => userCleanupTimestamps.delete(userId));
    log(`Removed ${staleCount} stale entries from cleanup tracker. Current size: ${userCleanupTimestamps.size}`);
  }
  
  // Also run emergency prune if needed
  if (userCleanupTimestamps.size > MAX_TRACKED_USERS) {
    pruneOldestEntries();
  }
  
  // Log stats periodically
  if (cleanupStats.totalCleanups > 0 && cleanupStats.totalCleanups % 100 === 0) {
    log(`Cleanup stats: ${cleanupStats.totalCleanups} cleanups, ${cleanupStats.totalMessagesDeleted} messages deleted, ${cleanupStats.pruneCount} prunes`);
  }
}, 30 * 60 * 1000); // Clean up tracker every 30 minutes

// Clean up on process exit
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
  log(`Chat cleanup service shutting down. Final stats: ${cleanupStats.totalCleanups} cleanups, ${cleanupStats.totalMessagesDeleted} messages deleted`);
});

process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
});

// Export stats for monitoring
export function getCleanupStats() {
  return {
    ...cleanupStats,
    trackerSize: userCleanupTimestamps.size,
    maxTrackerSize: MAX_TRACKED_USERS,
  };
}

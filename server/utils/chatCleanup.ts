import { storage } from "../storage";
import { log } from "../vite";

// Cleanup tracker to avoid running cleanup too frequently for the same user
const userCleanupTimestamps = new Map<string, number>();

// Cleanup scheduler - automatically cleans up old messages when user accesses chat
export async function cleanupOldMessagesForUser(userId: string) {
  const HOURS_TO_KEEP = 24;
  const CLEANUP_COOLDOWN = 60 * 60 * 1000; // Only cleanup once per hour per user
  
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
    }
    userCleanupTimestamps.set(userId, now);
  } catch (error) {
    console.error(`Error cleaning up messages for user ${userId}:`, error);
  }
}

// Periodic cleanup of the cleanup tracker itself
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const toDelete: string[] = [];
  
  userCleanupTimestamps.forEach((timestamp, userId) => {
    if (timestamp < oneHourAgo) {
      toDelete.push(userId);
    }
  });
  
  toDelete.forEach(userId => userCleanupTimestamps.delete(userId));
}, 60 * 60 * 1000); // Clean up tracker every hour

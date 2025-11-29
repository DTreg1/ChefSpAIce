import cron, { ScheduledTask } from "node-cron";
import { PushNotificationService } from "./push-notification.service";
import { db } from "../db";
import { users, mealPlans } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class NotificationScheduler {
  private static expiringFoodTask: ScheduledTask | null = null;
  private static dailyRecipeTask: ScheduledTask | null = null;
  private static mealReminderTasks: Map<string, ScheduledTask> = new Map();

  /**
   * Start all notification schedulers
   */
  static async start() {
    // console.log("Starting notification schedulers...");
    
    // Schedule expiring food notifications (daily at 9 AM)
    this.scheduleExpiringFoodNotifications();
    
    // Schedule daily recipe suggestions (daily at 10 AM)
    this.scheduleDailyRecipeSuggestions();
    
    // Schedule meal reminders based on user preferences
    await this.scheduleMealReminders();
    
    // console.log("Notification schedulers started successfully");
  }

  /**
   * Stop all notification schedulers
   */
  static stop() {
    if (this.expiringFoodTask) {
      this.expiringFoodTask.stop();
      this.expiringFoodTask = null;
    }
    
    if (this.dailyRecipeTask) {
      this.dailyRecipeTask.stop();
      this.dailyRecipeTask = null;
    }
    
    // Stop all meal reminder tasks
    this.mealReminderTasks.forEach(task => task.stop());
    this.mealReminderTasks.clear();
    
    // console.log("Notification schedulers stopped");
  }

  /**
   * Schedule expiring food notifications
   */
  private static scheduleExpiringFoodNotifications() {
    // Run every day at 9 AM
    const cronExpression = "0 9 * * *";
    
    if (this.expiringFoodTask) {
      this.expiringFoodTask.stop();
    }
    
    this.expiringFoodTask = cron.schedule(cronExpression, async () => {
      // console.log("Running expiring food notifications...");
      try {
        const result = await PushNotificationService.sendExpiringFoodNotifications();
        // console.log(`Sent ${result.totalSent} expiring food notifications to ${result.usersNotified} users`);
      } catch (error) {
        console.error("Error in expiring food notification scheduler:", error);
      }
    });
  }

  /**
   * Schedule daily recipe suggestions
   */
  private static scheduleDailyRecipeSuggestions() {
    // Run every day at 10 AM
    const cronExpression = "0 10 * * *";
    
    if (this.dailyRecipeTask) {
      this.dailyRecipeTask.stop();
    }
    
    this.dailyRecipeTask = cron.schedule(cronExpression, async () => {
      // console.log("Running daily recipe suggestions...");
      try {
        const result = await PushNotificationService.sendRecipeSuggestions();
        // console.log(`Sent ${result.totalSent} recipe suggestions to ${result.usersNotified} users`);
      } catch (error) {
        console.error("Error in recipe suggestion scheduler:", error);
      }
    });
  }

  /**
   * Schedule meal reminders based on meal plans
   */
  private static async scheduleMealReminders() {
    try {
      // Get users with meal reminders enabled
      const usersWithReminders = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.notificationsEnabled, true),
            eq(users.notifyMealReminders, true)
          )
        );

      for (const user of usersWithReminders) {
        // Get user's meal plans for the next 7 days
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const userMealPlans = await db
          .select()
          .from(mealPlans)
          .where(eq(mealPlans.userId, user.id));

        for (const mealPlan of userMealPlans) {
          // Parse meal times and schedule reminders
          const mealTimes = {
            breakfast: "08:00",
            lunch: "12:00",
            dinner: "18:00"
          };

          for (const [mealType, defaultTime] of Object.entries(mealTimes)) {
            // Use user's preferred notification time or default
            const notificationTime = user.notificationTime || defaultTime;
            const [hour, minute] = notificationTime.split(":").map(Number);
            
            // Create a unique key for this reminder
            const reminderKey = `${user.id}-${mealPlan.id}-${mealType}`;
            
            // If there's already a task for this reminder, stop it
            const existingTask = this.mealReminderTasks.get(reminderKey);
            if (existingTask) {
              existingTask.stop();
            }
            
            // Create cron expression for the reminder (30 minutes before meal time)
            const reminderHour = hour === 0 ? 23 : hour - 1;
            const reminderMinute = minute >= 30 ? minute - 30 : minute + 30;
            const cronExpression = `${reminderMinute} ${reminderHour} * * *`;
            
            // Schedule the reminder
            const task = cron.schedule(cronExpression, async () => {
              // console.log(`Sending meal reminder for ${mealType} to user ${user.id}`);
              try {
                await PushNotificationService.sendMealReminder(
                  user.id,
                  `${mealType} meal`,
                  defaultTime
                );
              } catch (error) {
                console.error(`Error sending meal reminder:`, error);
              }
            });
            
            this.mealReminderTasks.set(reminderKey, task);
          }
        }
      }
      
      // console.log(`Scheduled ${this.mealReminderTasks.size} meal reminders`);
    } catch (error) {
      console.error("Error scheduling meal reminders:", error);
    }
  }

  /**
   * Manually trigger expiring food notifications (for testing)
   */
  static async triggerExpiringFoodNotifications() {
    // console.log("Manually triggering expiring food notifications...");
    try {
      const result = await PushNotificationService.sendExpiringFoodNotifications();
      return result;
    } catch (error) {
      console.error("Error triggering expiring food notifications:", error);
      throw error;
    }
  }

  /**
   * Manually trigger recipe suggestions (for testing)
   */
  static async triggerRecipeSuggestions() {
    // console.log("Manually triggering recipe suggestions...");
    try {
      const result = await PushNotificationService.sendRecipeSuggestions();
      return result;
    } catch (error) {
      console.error("Error triggering recipe suggestions:", error);
      throw error;
    }
  }
}

export default NotificationScheduler;
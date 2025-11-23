import { StorageRoot } from './StorageRoot';
import { db } from '../db';

// Create the root storage instance
export const storage = new StorageRoot(db);

// Export backward compatibility aliases (temporary, for migration)
export const userStorage = storage.user.user;
export const foodStorage = storage.user.food;
export const recipesStorage = storage.user.recipes;
export const inventoryStorage = storage.user.inventory;
export const chatStorage = storage.user.chat;
export const notificationStorage = storage.user.notifications;  // Changed from notificationsStorage
export const schedulingStorage = storage.user.scheduling;

export const billingStorage = storage.admin.billing;
export const securityStorage = storage.admin.security;
export const pricingStorage = storage.admin.pricing;
export const experimentsStorage = storage.admin.experiments;
export const supportStorage = storage.admin.support;

export const analyticsStorage = storage.platform.analytics;
export const aiMlStorage = storage.platform.ai;  // Changed from aiStorage
export const systemStorage = storage.platform.system;
export const contentStorage = storage.platform.content;
export const feedbackStorage = storage.platform.feedback;
import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username ?? null,
      password: insertUser.password ?? null,
      displayName: insertUser.displayName ?? null,
      email: insertUser.email ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      dietaryRestrictions: insertUser.dietaryRestrictions ?? null,
      allergens: insertUser.allergens ?? null,
      favoriteCategories: insertUser.favoriteCategories ?? null,
      expirationAlertDays: insertUser.expirationAlertDays ?? 3,
      storageAreasEnabled: insertUser.storageAreasEnabled ?? null,
      householdSize: insertUser.householdSize ?? 2,
      cookingSkillLevel: insertUser.cookingSkillLevel ?? "beginner",
      preferredUnits: insertUser.preferredUnits ?? "imperial",
      foodsToAvoid: insertUser.foodsToAvoid ?? null,
      hasCompletedOnboarding: insertUser.hasCompletedOnboarding ?? false,
      notificationsEnabled: insertUser.notificationsEnabled ?? false,
      notifyExpiringFood: insertUser.notifyExpiringFood ?? true,
      notifyRecipeSuggestions: insertUser.notifyRecipeSuggestions ?? false,
      notifyMealReminders: insertUser.notifyMealReminders ?? true,
      notificationTime: insertUser.notificationTime ?? "09:00",
      isAdmin: insertUser.isAdmin ?? false,
      primaryProvider: insertUser.primaryProvider ?? null,
      primaryProviderId: insertUser.primaryProviderId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();

/**
 * @file server/storage/domains/feedback.storage.ts
 * @description Feedback and community features domain storage implementation
 */

import { db } from "../../db";
import { eq, and, desc, sql, gte, lte, or } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";
import {
  userFeedback,
  donations,
  type UserFeedback,
  type InsertUserFeedback,
  type Donation,
  type InsertDonation
} from "@shared/schema";
import type { IFeedbackStorage, FeedbackAnalytics, FeedbackResponse, InsertFeedbackResponse } from "../interfaces/IFeedbackStorage";

export class FeedbackStorage implements IFeedbackStorage {
  // Feedback Management
  async createFeedback(feedbackData: InsertUserFeedback): Promise<UserFeedback> {
    const [result] = await db.insert(userFeedback).values(feedbackData).returning();
    return result;
  }

  async getFeedback(feedbackId: string): Promise<UserFeedback | null> {
    const [result] = await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.id, feedbackId));
    return result || null;
  }

  async getUserFeedback(userId: string): Promise<UserFeedback[]> {
    return await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.userId, userId))
      .orderBy(desc(userFeedback.createdAt));
  }

  async getAllFeedback(status?: string, type?: string): Promise<UserFeedback[]> {
    const conditions = [];
    
    if (status) {
      conditions.push(eq(userFeedback.status, status));
    }
    
    if (type) {
      conditions.push(eq(userFeedback.type, type));
    }
    
    if (conditions.length > 0) {
      return await db.select()
        .from(userFeedback)
        .where(and(...conditions))
        .orderBy(desc(userFeedback.createdAt));
    }
    
    return await db.select()
      .from(userFeedback)
      .orderBy(desc(userFeedback.createdAt));
  }

  async getCommunityFeedback(limit = 20): Promise<UserFeedback[]> {
    return await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.isPublic, true))
      .orderBy(desc(userFeedback.createdAt))
      .limit(limit);
  }

  async getCommunityFeedbackForUser(userId: string, limit = 20): Promise<UserFeedback[]> {
    return await db.select()
      .from(userFeedback)
      .where(and(
        eq(userFeedback.userId, userId),
        eq(userFeedback.isPublic, true)
      ))
      .orderBy(desc(userFeedback.createdAt))
      .limit(limit);
  }

  async updateFeedbackStatus(feedbackId: string, status: string): Promise<UserFeedback> {
    const [result] = await db.update(userFeedback)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(userFeedback.id, feedbackId))
      .returning();
    return result;
  }

  async getFeedbackByContext(context: string): Promise<UserFeedback[]> {
    return await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.pageUrl, context))
      .orderBy(desc(userFeedback.createdAt));
  }
  
  // Feedback Responses (now embedded in userFeedback table)
  async addFeedbackResponse(responseData: InsertFeedbackResponse): Promise<FeedbackResponse> {
    const [result] = await db.update(userFeedback)
      .set({ 
        response: responseData.response,
        respondedAt: new Date(),
        respondedBy: responseData.respondedBy,
        status: 'in-review',
        updatedAt: new Date()
      })
      .where(eq(userFeedback.id, responseData.feedbackId))
      .returning();
    
    // Return a response object
    return {
      id: result.id,
      feedbackId: result.id,
      response: result.response || '',
      respondedBy: result.respondedBy || '',
      createdAt: result.respondedAt || new Date()
    };
  }

  async getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]> {
    const [feedback] = await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.id, feedbackId));
    
    if (!feedback || !feedback.response) {
      return [];
    }
    
    // Return the embedded response as an array for compatibility
    return [{
      id: feedback.id,
      feedbackId: feedback.id,
      response: feedback.response,
      respondedBy: feedback.respondedBy || '',
      createdAt: feedback.respondedAt || new Date()
    }];
  }
  
  // Feedback Analytics
  async getFeedbackAnalytics(startDate?: Date, endDate?: Date): Promise<FeedbackAnalytics> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(userFeedback.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(userFeedback.createdAt, endDate));
    }
    
    const allFeedback = conditions.length > 0
      ? await db.select().from(userFeedback).where(and(...conditions))
      : await db.select().from(userFeedback);
    
    // Calculate analytics
    const feedbackByType: Record<string, number> = {};
    const feedbackByStatus: Record<string, number> = {};
    
    allFeedback.forEach((f: UserFeedback) => {
      feedbackByType[f.type] = (feedbackByType[f.type] || 0) + 1;
      feedbackByStatus[f.status] = (feedbackByStatus[f.status] || 0) + 1;
    });
    
    // Calculate average response time for responded feedback
    const respondedFeedback = allFeedback.filter((f: UserFeedback) => f.response && f.respondedAt);
    let totalResponseTime = 0;
    
    for (const f of respondedFeedback) {
      if (f.respondedAt && f.createdAt) {
        totalResponseTime += new Date(f.respondedAt).getTime() - new Date(f.createdAt).getTime();
      }
    }
    
    const averageResponseTime = respondedFeedback.length > 0 
      ? totalResponseTime / respondedFeedback.length / (1000 * 60 * 60) // Convert to hours
      : 0;
    
    // Calculate upvote rate (feedback items with at least one upvote)
    const feedbackWithUpvotes = allFeedback.filter((f: UserFeedback) => {
      const upvotes = f.upvotes as Array<{ userId: string; createdAt: string }> | null;
      return upvotes && upvotes.length > 0;
    }).length;
    
    const upvoteRate = allFeedback.length > 0 
      ? feedbackWithUpvotes / allFeedback.length 
      : 0;
    
    // Calculate response rate
    const responseRate = allFeedback.length > 0 
      ? respondedFeedback.length / allFeedback.length 
      : 0;
    
    return {
      totalFeedback: allFeedback.length,
      feedbackByType,
      feedbackByStatus,
      averageResponseTime,
      upvoteRate,
      responseRate
    };
  }
  
  // Upvoting System (now uses JSONB array in userFeedback)
  async upvoteFeedback(userId: string, feedbackId: string): Promise<void> {
    const [feedback] = await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.id, feedbackId));
    
    if (!feedback) return;
    
    const currentUpvotes = (feedback.upvotes as Array<{ userId: string; createdAt: string }> | null) || [];
    
    // Check if user already upvoted
    const alreadyUpvoted = currentUpvotes.some((upvote: { userId: string }) => upvote.userId === userId);
    
    if (!alreadyUpvoted) {
      const newUpvotes = [
        ...currentUpvotes,
        { userId, createdAt: new Date().toISOString() }
      ];
      
      await db.update(userFeedback)
        .set({ 
          upvotes: newUpvotes,
          updatedAt: new Date()
        })
        .where(eq(userFeedback.id, feedbackId));
    }
  }

  async removeUpvote(userId: string, feedbackId: string): Promise<void> {
    const [feedback] = await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.id, feedbackId));
    
    if (!feedback) return;
    
    const currentUpvotes = (feedback.upvotes as Array<{ userId: string; createdAt: string }> | null) || [];
    
    const newUpvotes = currentUpvotes.filter((upvote: { userId: string }) => upvote.userId !== userId);
    
    if (newUpvotes.length !== currentUpvotes.length) {
      await db.update(userFeedback)
        .set({ 
          upvotes: newUpvotes,
          updatedAt: new Date()
        })
        .where(eq(userFeedback.id, feedbackId));
    }
  }

  async hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean> {
    const [feedback] = await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.id, feedbackId));
    
    if (!feedback) return false;
    
    const upvotes = (feedback.upvotes as Array<{ userId: string; createdAt: string }> | null) || [];
    return upvotes.some((upvote: { userId: string }) => upvote.userId === userId);
  }

  async getFeedbackUpvoteCount(feedbackId: string): Promise<number> {
    const [feedback] = await db.select()
      .from(userFeedback)
      .where(eq(userFeedback.id, feedbackId));
    
    if (!feedback) return 0;
    
    const upvotes = (feedback.upvotes as Array<{ userId: string; createdAt: string }> | null) || [];
    return upvotes.length;
  }
  
  // Donations
  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [result] = await db.insert(donations).values(donation).returning();
    return result;
  }

  async updateDonation(donationId: string, updates: Partial<InsertDonation>): Promise<Donation> {
    const [result] = await db.update(donations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(donations.id, donationId))
      .returning();
    return result;
  }

  async getDonation(donationId: string): Promise<Donation | null> {
    const [result] = await db.select()
      .from(donations)
      .where(eq(donations.id, donationId));
    return result || null;
  }

  async getDonationByPaymentIntent(paymentIntentId: string): Promise<Donation | null> {
    const [result] = await db.select()
      .from(donations)
      .where(eq(donations.stripePaymentIntentId, paymentIntentId));
    return result || null;
  }

  async getDonations(status?: string): Promise<Donation[]> {
    if (status) {
      return await db.select()
        .from(donations)
        .where(eq(donations.status, status))
        .orderBy(desc(donations.createdAt));
    }
    
    return await db.select()
      .from(donations)
      .orderBy(desc(donations.createdAt));
  }

  async getUserDonations(userId: string): Promise<Donation[]> {
    return await db.select()
      .from(donations)
      .where(eq(donations.userId, userId))
      .orderBy(desc(donations.createdAt));
  }

  async getTotalDonations(): Promise<number> {
    const [result] = await db.select({ 
      total: sql<number>`COALESCE(SUM(${donations.amount}), 0)` 
    })
    .from(donations)
    .where(eq(donations.status, 'completed'));
    
    return result?.total || 0;
  }
}

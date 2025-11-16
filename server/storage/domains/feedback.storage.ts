/**
 * @file server/storage/domains/feedback.storage.ts
 * @description Feedback and community features domain storage implementation
 */

import { db } from "@db";
import { eq, and, desc, sql, gte, lte, or } from "drizzle-orm";
import {
  feedback,
  feedbackResponses,
  feedbackUpvotes,
  donations,
  type Feedback,
  type InsertFeedback,
  type FeedbackResponse,
  type InsertFeedbackResponse,
  type FeedbackUpvote,
  type InsertFeedbackUpvote,
  type Donation,
  type InsertDonation
} from "@shared/schema";
import type { IFeedbackStorage, FeedbackAnalytics } from "../interfaces/IFeedbackStorage";

export class FeedbackStorage implements IFeedbackStorage {
  // Feedback Management
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(feedbackData).returning();
    return result;
  }

  async getFeedback(feedbackId: string): Promise<Feedback | null> {
    const [result] = await db.select()
      .from(feedback)
      .where(eq(feedback.id, feedbackId));
    return result || null;
  }

  async getUserFeedback(userId: string): Promise<Feedback[]> {
    return await db.select()
      .from(feedback)
      .where(eq(feedback.user_id, userId))
      .orderBy(desc(feedback.created_at));
  }

  async getAllFeedback(status?: string, type?: string): Promise<Feedback[]> {
    let query = db.select().from(feedback);
    const conditions = [];
    
    if (status) {
      conditions.push(eq(feedback.status, status));
    }
    
    if (type) {
      conditions.push(eq(feedback.type, type));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(feedback.created_at));
  }

  async getCommunityFeedback(limit = 20): Promise<Feedback[]> {
    return await db.select()
      .from(feedback)
      .where(eq(feedback.is_public, true))
      .orderBy(desc(feedback.created_at))
      .limit(limit);
  }

  async getCommunityFeedbackForUser(userId: string, limit = 20): Promise<Feedback[]> {
    return await db.select()
      .from(feedback)
      .where(and(
        eq(feedback.user_id, userId),
        eq(feedback.is_public, true)
      ))
      .orderBy(desc(feedback.created_at))
      .limit(limit);
  }

  async updateFeedbackStatus(feedbackId: string, status: string): Promise<Feedback> {
    const [result] = await db.update(feedback)
      .set({ 
        status,
        updated_at: new Date()
      })
      .where(eq(feedback.id, feedbackId))
      .returning();
    return result;
  }

  async getFeedbackByContext(context: string): Promise<Feedback[]> {
    return await db.select()
      .from(feedback)
      .where(eq(feedback.context, context))
      .orderBy(desc(feedback.created_at));
  }
  
  // Feedback Responses
  async addFeedbackResponse(response: InsertFeedbackResponse): Promise<FeedbackResponse> {
    const [result] = await db.insert(feedbackResponses).values(response).returning();
    
    // Update feedback status to responded
    await db.update(feedback)
      .set({ 
        status: 'responded',
        updated_at: new Date()
      })
      .where(eq(feedback.id, response.feedback_id));
    
    return result;
  }

  async getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]> {
    return await db.select()
      .from(feedbackResponses)
      .where(eq(feedbackResponses.feedback_id, feedbackId))
      .orderBy(feedbackResponses.created_at);
  }
  
  // Feedback Analytics
  async getFeedbackAnalytics(startDate?: Date, endDate?: Date): Promise<FeedbackAnalytics> {
    let query = db.select().from(feedback);
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(feedback.created_at, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(feedback.created_at, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const allFeedback = await query;
    const responses = await db.select().from(feedbackResponses);
    const upvotes = await db.select().from(feedbackUpvotes);
    
    // Calculate analytics
    const feedbackByType: Record<string, number> = {};
    const feedbackByStatus: Record<string, number> = {};
    
    allFeedback.forEach(f => {
      feedbackByType[f.type] = (feedbackByType[f.type] || 0) + 1;
      feedbackByStatus[f.status] = (feedbackByStatus[f.status] || 0) + 1;
    });
    
    // Calculate average response time for responded feedback
    const respondedFeedback = allFeedback.filter(f => f.status === 'responded');
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (const f of respondedFeedback) {
      const response = responses.find(r => r.feedback_id === f.id);
      if (response) {
        totalResponseTime += new Date(response.created_at).getTime() - new Date(f.created_at).getTime();
        responseCount++;
      }
    }
    
    const averageResponseTime = responseCount > 0 
      ? totalResponseTime / responseCount / (1000 * 60 * 60) // Convert to hours
      : 0;
    
    // Calculate upvote rate
    const feedbackWithUpvotes = new Set(upvotes.map(u => u.feedback_id)).size;
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
  
  // Upvoting System
  async upvoteFeedback(userId: string, feedbackId: string): Promise<void> {
    // Check if already upvoted
    const existing = await db.select()
      .from(feedbackUpvotes)
      .where(and(
        eq(feedbackUpvotes.user_id, userId),
        eq(feedbackUpvotes.feedback_id, feedbackId)
      ));
    
    if (existing.length === 0) {
      await db.insert(feedbackUpvotes).values({
        user_id: userId,
        feedback_id: feedbackId
      });
      
      // Update feedback upvote count
      await db.update(feedback)
        .set({ 
          upvote_count: sql`${feedback.upvote_count} + 1` 
        })
        .where(eq(feedback.id, feedbackId));
    }
  }

  async removeUpvote(userId: string, feedbackId: string): Promise<void> {
    const deleted = await db.delete(feedbackUpvotes)
      .where(and(
        eq(feedbackUpvotes.user_id, userId),
        eq(feedbackUpvotes.feedback_id, feedbackId)
      ))
      .returning();
    
    if (deleted.length > 0) {
      // Update feedback upvote count
      await db.update(feedback)
        .set({ 
          upvote_count: sql`GREATEST(${feedback.upvote_count} - 1, 0)` 
        })
        .where(eq(feedback.id, feedbackId));
    }
  }

  async hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean> {
    const [result] = await db.select()
      .from(feedbackUpvotes)
      .where(and(
        eq(feedbackUpvotes.user_id, userId),
        eq(feedbackUpvotes.feedback_id, feedbackId)
      ));
    return !!result;
  }

  async getFeedbackUpvoteCount(feedbackId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(feedbackUpvotes)
      .where(eq(feedbackUpvotes.feedback_id, feedbackId));
    return result?.count || 0;
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
        updated_at: new Date()
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
      .where(eq(donations.payment_intent_id, paymentIntentId));
    return result || null;
  }

  async getDonations(status?: string): Promise<Donation[]> {
    let query = db.select().from(donations);
    
    if (status) {
      query = query.where(eq(donations.status, status));
    }
    
    return await query.orderBy(desc(donations.created_at));
  }

  async getUserDonations(userId: string): Promise<Donation[]> {
    return await db.select()
      .from(donations)
      .where(eq(donations.user_id, userId))
      .orderBy(desc(donations.created_at));
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
/**
 * @file server/storage/interfaces/IFeedbackStorage.ts
 * @description Interface for feedback and community features storage operations
 */

import type {
  Feedback,
  InsertFeedback,
  FeedbackResponse,
  InsertFeedbackResponse,
  FeedbackUpvote,
  InsertFeedbackUpvote,
  Donation,
  InsertDonation
} from "@shared/schema";

export interface FeedbackAnalytics {
  totalFeedback: number;
  feedbackByType: Record<string, number>;
  feedbackByStatus: Record<string, number>;
  averageResponseTime: number;
  upvoteRate: number;
  responseRate: number;
}

export interface IFeedbackStorage {
  // Feedback Management
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedback(feedbackId: string): Promise<Feedback | null>;
  getUserFeedback(userId: string): Promise<Feedback[]>;
  getAllFeedback(status?: string, type?: string): Promise<Feedback[]>;
  getCommunityFeedback(limit?: number): Promise<Feedback[]>;
  getCommunityFeedbackForUser(userId: string, limit?: number): Promise<Feedback[]>;
  updateFeedbackStatus(feedbackId: string, status: string): Promise<Feedback>;
  getFeedbackByContext(context: string): Promise<Feedback[]>;
  
  // Feedback Responses
  addFeedbackResponse(response: InsertFeedbackResponse): Promise<FeedbackResponse>;
  getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]>;
  
  // Feedback Analytics
  getFeedbackAnalytics(startDate?: Date, endDate?: Date): Promise<FeedbackAnalytics>;
  
  // Upvoting System
  upvoteFeedback(userId: string, feedbackId: string): Promise<void>;
  removeUpvote(userId: string, feedbackId: string): Promise<void>;
  hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean>;
  getFeedbackUpvoteCount(feedbackId: string): Promise<number>;
  
  // Donations
  createDonation(donation: InsertDonation): Promise<Donation>;
  updateDonation(donationId: string, updates: Partial<InsertDonation>): Promise<Donation>;
  getDonation(donationId: string): Promise<Donation | null>;
  getDonationByPaymentIntent(paymentIntentId: string): Promise<Donation | null>;
  getDonations(status?: string): Promise<Donation[]>;
  getUserDonations(userId: string): Promise<Donation[]>;
  getTotalDonations(): Promise<number>;
}
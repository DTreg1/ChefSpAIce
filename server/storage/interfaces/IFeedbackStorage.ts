/**
 * @file server/storage/interfaces/IFeedbackStorage.ts
 * @description Interface for feedback and community features storage operations
 */

import type {
  UserFeedback,
  InsertUserFeedback,
  Donation,
  InsertDonation,
} from "@shared/schema";

/**
 * Feedback response data structure (for backward compatibility)
 * In the new schema, responses are embedded in the userFeedback table
 *
 * @deprecated Responses are now embedded directly in the userFeedback table
 */
export interface FeedbackResponse {
  id: string;
  feedbackId: string;
  response: string;
  respondedBy: string;
  createdAt: Date;
}

/**
 * @deprecated Responses are now embedded directly in the userFeedback table
 */
export interface InsertFeedbackResponse {
  feedbackId: string;
  response: string;
  respondedBy: string;
}

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
  createFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  getFeedback(feedbackId: string): Promise<UserFeedback | null>;
  getUserFeedback(userId: string): Promise<UserFeedback[]>;
  getAllFeedback(status?: string, type?: string): Promise<UserFeedback[]>;
  getCommunityFeedback(limit?: number): Promise<UserFeedback[]>;
  getCommunityFeedbackForUser(
    userId: string,
    limit?: number,
  ): Promise<UserFeedback[]>;
  updateFeedbackStatus(
    feedbackId: string,
    status: string,
  ): Promise<UserFeedback>;
  getFeedbackByContext(context: string): Promise<UserFeedback[]>;

  // Feedback Responses (embedded in userFeedback table)
  addFeedbackResponse(
    response: InsertFeedbackResponse,
  ): Promise<FeedbackResponse>;
  getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]>;

  // Feedback Analytics
  getFeedbackAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<FeedbackAnalytics>;

  // Upvoting System (now uses JSONB array in userFeedback)
  upvoteFeedback(userId: string, feedbackId: string): Promise<void>;
  removeUpvote(userId: string, feedbackId: string): Promise<void>;
  hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean>;
  getFeedbackUpvoteCount(feedbackId: string): Promise<number>;

  // Donations
  createDonation(donation: InsertDonation): Promise<Donation>;
  updateDonation(
    donationId: string,
    updates: Partial<InsertDonation>,
  ): Promise<Donation>;
  getDonation(donationId: string): Promise<Donation | null>;
  getDonationByPaymentIntent(paymentIntentId: string): Promise<Donation | null>;
  getDonations(status?: string): Promise<Donation[]>;
  getUserDonations(userId: string): Promise<Donation[]>;
  getTotalDonations(): Promise<number>;
}

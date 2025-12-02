/**
 * @file server/storage/interfaces/IBillingStorage.ts
 * @description Interface for billing, donations, and payment management
 */

import type { Donation, InsertDonation } from "@shared/schema/billing";

export interface IBillingStorage {
  // ==================== Donation Management ====================
  createDonation(
    donation: Omit<InsertDonation, "id" | "createdAt" | "completedAt">,
  ): Promise<Donation>;
  updateDonation(
    stripePaymentIntentId: string,
    updates: Partial<Donation>,
  ): Promise<Donation>;
  getDonation(id: string): Promise<Donation | undefined>;
  getDonationByPaymentIntent(
    stripePaymentIntentId: string,
  ): Promise<Donation | undefined>;
  getDonations(
    limit?: number,
    offset?: number,
  ): Promise<{ donations: Donation[]; total: number }>;
  getUserDonations(userId: string, limit?: number): Promise<Donation[]>;
  deleteDonation(id: string): Promise<void>;

  // ==================== Donation Statistics ====================
  getTotalDonations(): Promise<{
    totalAmount: number;
    donationCount: number;
  }>;
  getDonationStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    byStatus: Record<string, { count: number; amount: number }>;
    byCurrency: Record<string, { count: number; amount: number }>;
    recurringCount: number;
    recurringAmount: number;
  }>;
  getUserDonationStats(userId: string): Promise<{
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    firstDonation?: Date;
    lastDonation?: Date;
    isRecurringDonor: boolean;
  }>;
  getDonationTrends(days?: number): Promise<
    Array<{
      date: string;
      count: number;
      amount: number;
    }>
  >;

  // ==================== Recurring Donations ====================
  getRecurringDonations(status?: string): Promise<Donation[]>;
  getUserRecurringDonations(userId: string): Promise<Donation[]>;
  cancelRecurringDonation(donationId: string): Promise<Donation>;
  updateRecurringDonation(
    donationId: string,
    updates: { amount?: number; recurringInterval?: string },
  ): Promise<Donation>;

  // ==================== Payment Processing ====================
  completeDonation(
    stripePaymentIntentId: string,
    metadata?: Record<string, unknown>,
  ): Promise<Donation>;
  failDonation(
    stripePaymentIntentId: string,
    errorMessage?: string,
  ): Promise<Donation>;
  refundDonation(
    donationId: string,
    refundAmount?: number,
    reason?: string,
  ): Promise<Donation>;

  // ==================== Donor Management ====================
  getTopDonors(limit?: number): Promise<
    Array<{
      userId: string;
      totalAmount: number;
      donationCount: number;
      lastDonation: Date;
    }>
  >;
  getDonorsByStatus(status: string, limit?: number): Promise<Donation[]>;
  searchDonations(filters: {
    userId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: Date;
    endDate?: Date;
    isRecurring?: boolean;
    currency?: string;
  }): Promise<Donation[]>;
}

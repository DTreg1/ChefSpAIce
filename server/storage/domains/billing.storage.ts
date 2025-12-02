/**
 * @file server/storage/domains/billing.storage.ts
 * @description Billing, donations, and payment management storage operations
 *
 * Domain: Billing & Payments
 * Scope: Donation tracking, Stripe integration, payment processing, donor analytics
 *
 * EXPORT PATTERN:
 * - Export CLASS (BillingStorage) for dependency injection and testing
 * - Export singleton INSTANCE (billingStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { and, eq, desc, sql, gte, lte, between } from "drizzle-orm";
import {
  createInsertData,
  createUpdateData,
  buildMetadata,
} from "../../types/storage-helpers";
import type { IBillingStorage } from "../interfaces/IBillingStorage";
import {
  donations,
  type Donation,
  type InsertDonation,
} from "@shared/schema/billing";
import {
  StorageError,
  StorageNotFoundError,
  StorageValidationError,
  StorageConstraintError,
  wrapDatabaseError,
  type StorageErrorContext,
} from "../errors";

const DOMAIN = "billing";

function createContext(
  operation: string,
  entityId?: string | number,
  entityType: string = "Donation",
): StorageErrorContext {
  return { domain: DOMAIN, operation, entityId, entityType };
}

/**
 * Billing Storage
 *
 * Manages donations, payments, and billing operations.
 * Integrates with Stripe for payment processing and provides comprehensive donor analytics.
 */
export class BillingStorage implements IBillingStorage {
  // ==================== Donation Management ====================

  async createDonation(
    donation: Omit<InsertDonation, "id" | "createdAt" | "completedAt">,
  ): Promise<Donation> {
    const context = createContext("createDonation");
    context.additionalInfo = {
      userId: donation.userId,
      amount: donation.amount,
    };
    try {
      const [newDonation] = await db
        .insert(donations)
        .values(donation as any)
        .returning();
      return newDonation;
    } catch (error) {
      console.error(`[${DOMAIN}] Error creating donation:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async updateDonation(
    stripePaymentIntentId: string,
    updates: Partial<Donation>,
  ): Promise<Donation> {
    const context = createContext("updateDonation");
    context.additionalInfo = { stripePaymentIntentId };
    try {
      const [updated] = await db
        .update(donations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId))
        .returning();

      if (!updated) {
        throw new StorageNotFoundError(
          `Donation with payment intent ${stripePaymentIntentId} not found`,
          context,
        );
      }
      return updated;
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating donation:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  async getDonation(id: string): Promise<Donation | undefined> {
    const context = createContext("getDonation", id);
    try {
      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.id, id));
      return donation;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting donation ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getDonationByPaymentIntent(
    stripePaymentIntentId: string,
  ): Promise<Donation | undefined> {
    const context = createContext("getDonationByPaymentIntent");
    context.additionalInfo = { stripePaymentIntentId };
    try {
      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId));
      return donation;
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error getting donation by payment intent:`,
        error,
      );
      throw wrapDatabaseError(error, context);
    }
  }

  async getDonations(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ donations: Donation[]; total: number }> {
    const context = createContext("getDonations");
    context.additionalInfo = { limit, offset };
    try {
      const [donationResults, totalResult] = await Promise.all([
        db
          .select()
          .from(donations)
          .orderBy(desc(donations.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(donations),
      ]);

      return {
        donations: donationResults,
        total: totalResult[0]?.count || 0,
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting donations:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getUserDonations(
    userId: string,
    limit: number = 10,
  ): Promise<Donation[]> {
    const context = createContext("getUserDonations");
    context.additionalInfo = { userId, limit };
    try {
      return await db
        .select()
        .from(donations)
        .where(eq(donations.userId, userId))
        .orderBy(desc(donations.createdAt))
        .limit(limit);
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error getting user donations for ${userId}:`,
        error,
      );
      throw wrapDatabaseError(error, context);
    }
  }

  async deleteDonation(id: string): Promise<void> {
    const context = createContext("deleteDonation", id);
    try {
      await db.delete(donations).where(eq(donations.id, id));
    } catch (error) {
      console.error(`[${DOMAIN}] Error deleting donation ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  // ==================== Donation Statistics ====================

  async getTotalDonations(): Promise<{
    totalAmount: number;
    donationCount: number;
  }> {
    const context = createContext("getTotalDonations");
    try {
      const result = await db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(${donations.amount}), 0)::int`,
          donationCount: sql<number>`COUNT(*)::int`,
        })
        .from(donations)
        .where(eq(donations.status, "completed"));

      return result[0] || { totalAmount: 0, donationCount: 0 };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting total donations:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getDonationStats(
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
  }> {
    const context = createContext("getDonationStats");
    context.additionalInfo = {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    };
    try {
      const conditions = [];

      if (startDate) {
        conditions.push(gte(donations.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(donations.createdAt, endDate));
      }

      const filteredDonations =
        conditions.length > 0
          ? await db
              .select()
              .from(donations)
              .where(and(...conditions))
          : await db.select().from(donations);

      const byStatus: Record<string, { count: number; amount: number }> = {};
      const byCurrency: Record<string, { count: number; amount: number }> = {};
      let totalAmount = 0;
      let totalCount = 0;
      let recurringCount = 0;
      let recurringAmount = 0;

      for (const donation of filteredDonations) {
        totalCount++;

        if (donation.status === "completed") {
          totalAmount += donation.amount;
        }

        if (!byStatus[donation.status]) {
          byStatus[donation.status] = { count: 0, amount: 0 };
        }
        byStatus[donation.status].count++;
        if (donation.status === "completed") {
          byStatus[donation.status].amount += donation.amount;
        }

        if (!byCurrency[donation.currency]) {
          byCurrency[donation.currency] = { count: 0, amount: 0 };
        }
        byCurrency[donation.currency].count++;
        if (donation.status === "completed") {
          byCurrency[donation.currency].amount += donation.amount;
        }

        if (donation.isRecurring) {
          recurringCount++;
          if (donation.status === "completed") {
            recurringAmount += donation.amount;
          }
        }
      }

      return {
        totalAmount,
        totalCount,
        averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
        byStatus,
        byCurrency,
        recurringCount,
        recurringAmount,
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting donation stats:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getUserDonationStats(userId: string): Promise<{
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    firstDonation?: Date;
    lastDonation?: Date;
    isRecurringDonor: boolean;
  }> {
    const context = createContext("getUserDonationStats");
    context.additionalInfo = { userId };
    try {
      const userDonations = await db
        .select()
        .from(donations)
        .where(eq(donations.userId, userId))
        .orderBy(desc(donations.createdAt));

      const completedDonations = userDonations.filter(
        (d) => d.status === "completed",
      );
      const totalAmount = completedDonations.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      const isRecurringDonor = userDonations.some((d) => d.isRecurring);

      return {
        totalAmount,
        totalCount: completedDonations.length,
        averageAmount:
          completedDonations.length > 0
            ? totalAmount / completedDonations.length
            : 0,
        firstDonation:
          userDonations[userDonations.length - 1]?.createdAt || undefined,
        lastDonation: userDonations[0]?.createdAt || undefined,
        isRecurringDonor,
      };
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error getting user donation stats for ${userId}:`,
        error,
      );
      throw wrapDatabaseError(error, context);
    }
  }

  async getDonationTrends(days: number = 30): Promise<
    Array<{
      date: string;
      count: number;
      amount: number;
    }>
  > {
    const context = createContext("getDonationTrends");
    context.additionalInfo = { days };
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await db
        .select({
          date: sql<string>`DATE(${donations.createdAt})::text`,
          count: sql<number>`COUNT(*)::int`,
          amount: sql<number>`COALESCE(SUM(${donations.amount}), 0)::int`,
        })
        .from(donations)
        .where(
          and(
            gte(donations.createdAt, startDate),
            eq(donations.status, "completed"),
          ),
        )
        .groupBy(sql`DATE(${donations.createdAt})`)
        .orderBy(sql`DATE(${donations.createdAt})`);

      return trends;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting donation trends:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  // ==================== Recurring Donations ====================

  async getRecurringDonations(status?: string): Promise<Donation[]> {
    const context = createContext("getRecurringDonations");
    context.additionalInfo = { status };
    try {
      const conditions = [eq(donations.isRecurring, true)];

      if (status) {
        conditions.push(eq(donations.status, status));
      }

      return await db
        .select()
        .from(donations)
        .where(and(...conditions))
        .orderBy(desc(donations.createdAt));
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting recurring donations:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getUserRecurringDonations(userId: string): Promise<Donation[]> {
    const context = createContext("getUserRecurringDonations");
    context.additionalInfo = { userId };
    try {
      return await db
        .select()
        .from(donations)
        .where(
          and(eq(donations.userId, userId), eq(donations.isRecurring, true)),
        )
        .orderBy(desc(donations.createdAt));
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error getting user recurring donations for ${userId}:`,
        error,
      );
      throw wrapDatabaseError(error, context);
    }
  }

  async cancelRecurringDonation(donationId: string): Promise<Donation> {
    const context = createContext("cancelRecurringDonation", donationId);
    try {
      const [cancelled] = await db
        .update(donations)
        .set({
          status: "cancelled",
          isRecurring: false,
          updatedAt: new Date(),
        })
        .where(eq(donations.id, donationId))
        .returning();

      if (!cancelled) {
        throw new StorageNotFoundError(
          `Donation with ID ${donationId} not found`,
          context,
        );
      }
      return cancelled;
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error cancelling recurring donation ${donationId}:`,
        error,
      );
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  async updateRecurringDonation(
    donationId: string,
    updates: { amount?: number; recurringInterval?: string },
  ): Promise<Donation> {
    const context = createContext("updateRecurringDonation", donationId);
    try {
      const [updated] = await db
        .update(donations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(donations.id, donationId))
        .returning();

      if (!updated) {
        throw new StorageNotFoundError(
          `Donation with ID ${donationId} not found`,
          context,
        );
      }
      return updated;
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error updating recurring donation ${donationId}:`,
        error,
      );
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  // ==================== Payment Processing ====================

  async completeDonation(
    stripePaymentIntentId: string,
    metadata?: Record<string, any>,
  ): Promise<Donation> {
    const context = createContext("completeDonation");
    context.additionalInfo = { stripePaymentIntentId };
    try {
      const [completed] = await db
        .update(donations)
        .set({
          status: "completed",
          completedAt: new Date(),
          metadata: metadata,
          updatedAt: new Date(),
        })
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId))
        .returning();

      if (!completed) {
        throw new StorageNotFoundError(
          `Donation with payment intent ${stripePaymentIntentId} not found`,
          context,
        );
      }
      return completed;
    } catch (error) {
      console.error(`[${DOMAIN}] Error completing donation:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  async failDonation(
    stripePaymentIntentId: string,
    errorMessage?: string,
  ): Promise<Donation> {
    const context = createContext("failDonation");
    context.additionalInfo = { stripePaymentIntentId, errorMessage };
    try {
      const [failed] = await db
        .update(donations)
        .set({
          status: "failed",
          metadata: errorMessage ? { errorMessage } : undefined,
          updatedAt: new Date(),
        })
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId))
        .returning();

      if (!failed) {
        throw new StorageNotFoundError(
          `Donation with payment intent ${stripePaymentIntentId} not found`,
          context,
        );
      }
      return failed;
    } catch (error) {
      console.error(`[${DOMAIN}] Error failing donation:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  async refundDonation(
    donationId: string,
    refundAmount?: number,
    reason?: string,
  ): Promise<Donation> {
    const context = createContext("refundDonation", donationId);
    context.additionalInfo = { refundAmount, reason };
    try {
      const donation = await this.getDonation(donationId);
      if (!donation) {
        throw new StorageNotFoundError(
          `Donation with ID ${donationId} not found`,
          context,
        );
      }

      const actualRefundAmount = refundAmount || donation.amount;

      if (refundAmount && refundAmount > donation.amount) {
        throw new StorageValidationError(
          "Refund amount cannot exceed original donation amount",
          context,
          ["refundAmount"],
        );
      }

      const [refunded] = await db
        .update(donations)
        .set({
          status: "refunded",
          refundAmount: actualRefundAmount,
          refundedAt: new Date(),
          metadata: reason
            ? { ...donation.metadata, refundReason: reason }
            : donation.metadata,
          updatedAt: new Date(),
        })
        .where(eq(donations.id, donationId))
        .returning();

      return refunded;
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error refunding donation ${donationId}:`,
        error,
      );
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  // ==================== Donor Management ====================

  async getTopDonors(limit: number = 10): Promise<
    Array<{
      userId: string;
      totalAmount: number;
      donationCount: number;
      lastDonation: Date;
    }>
  > {
    const context = createContext("getTopDonors");
    context.additionalInfo = { limit };
    try {
      const topDonors = await db
        .select({
          userId: donations.userId,
          totalAmount: sql<number>`SUM(${donations.amount})::int`,
          donationCount: sql<number>`COUNT(*)::int`,
          lastDonation: sql<Date>`MAX(${donations.createdAt})`,
        })
        .from(donations)
        .where(
          and(
            eq(donations.status, "completed"),
            sql`${donations.userId} IS NOT NULL`,
          ),
        )
        .groupBy(donations.userId)
        .orderBy(sql`SUM(${donations.amount}) DESC`)
        .limit(limit);

      return topDonors.map((donor) => ({
        userId: donor.userId!,
        totalAmount: donor.totalAmount,
        donationCount: donor.donationCount,
        lastDonation: donor.lastDonation,
      }));
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting top donors:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getDonorsByStatus(
    status: string,
    limit: number = 50,
  ): Promise<Donation[]> {
    const context = createContext("getDonorsByStatus");
    context.additionalInfo = { status, limit };
    try {
      return await db
        .select()
        .from(donations)
        .where(eq(donations.status, status))
        .orderBy(desc(donations.createdAt))
        .limit(limit);
    } catch (error) {
      console.error(
        `[${DOMAIN}] Error getting donors by status ${status}:`,
        error,
      );
      throw wrapDatabaseError(error, context);
    }
  }

  async searchDonations(filters: {
    userId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: Date;
    endDate?: Date;
    isRecurring?: boolean;
    currency?: string;
  }): Promise<Donation[]> {
    const context = createContext("searchDonations");
    context.additionalInfo = { filters };
    try {
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(donations.userId, filters.userId));
      }
      if (filters.status) {
        conditions.push(eq(donations.status, filters.status));
      }
      if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
        conditions.push(
          between(donations.amount, filters.minAmount, filters.maxAmount),
        );
      } else if (filters.minAmount !== undefined) {
        conditions.push(gte(donations.amount, filters.minAmount));
      } else if (filters.maxAmount !== undefined) {
        conditions.push(lte(donations.amount, filters.maxAmount));
      }
      if (filters.startDate) {
        conditions.push(gte(donations.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(donations.createdAt, filters.endDate));
      }
      if (filters.isRecurring !== undefined) {
        conditions.push(eq(donations.isRecurring, filters.isRecurring));
      }
      if (filters.currency) {
        conditions.push(eq(donations.currency, filters.currency));
      }

      if (conditions.length === 0) {
        return await db
          .select()
          .from(donations)
          .orderBy(desc(donations.createdAt));
      }

      return await db
        .select()
        .from(donations)
        .where(and(...conditions))
        .orderBy(desc(donations.createdAt));
    } catch (error) {
      console.error(`[${DOMAIN}] Error searching donations:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
}

export const billingStorage = new BillingStorage();

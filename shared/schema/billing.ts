/**
 * Billing & Donations Schema
 * 
 * Tables for managing payments, donations, and financial transactions.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Stripe metadata structure for donations
 */
export interface DonationMetadata {
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentMethod?: string;
  last4?: string;
  brand?: string;
  country?: string;
  [key: string]: any;
}

// ==================== Tables ====================

/**
 * Donations Table
 * 
 * Track user donations and Stripe payment information.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL on user delete to preserve records)
 * - amount: Donation amount in cents (USD)
 * - currency: Currency code (default: 'usd')
 * - status: Payment status
 *   - 'pending': Payment initiated
 *   - 'completed': Successfully processed
 *   - 'failed': Payment failed
 *   - 'refunded': Payment refunded
 * - stripePaymentIntentId: Stripe Payment Intent ID for tracking
 * - stripeCustomerId: Stripe Customer ID for repeat donors
 * - receiptEmail: Email for receipt delivery
 * - message: Optional donor message
 * - isRecurring: Flag for subscription donations
 * - recurringInterval: Subscription interval ('month', 'year')
 * - metadata: Additional Stripe and payment metadata
 * - createdAt: Donation timestamp
 * - completedAt: When payment was confirmed
 * 
 * Business Rules:
 * - Minimum donation: $1.00 (100 cents)
 * - Maximum donation: $10,000 (1000000 cents)
 * - Receipts sent automatically via Stripe
 * - User deletion preserves donation history
 * 
 * Indexes:
 * - donations_user_id_idx: Donor's contribution history
 * - donations_status_idx: Filter by payment status
 * - donations_stripe_payment_intent_idx: Stripe webhook lookups
 * - donations_created_at_idx: Chronological reporting
 * 
 * Relationships:
 * - users → donations: SET NULL (preserve donation records)
 */
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default('usd'),
  status: text("status").notNull().default('pending'), // 'pending', 'completed', 'failed', 'refunded'
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  receiptEmail: text("receipt_email"),
  message: text("message"), // Optional donor message
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringInterval: text("recurring_interval"), // 'month', 'year'
  metadata: jsonb("metadata").$type<DonationMetadata>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  refundedAt: timestamp("refunded_at"),
  refundAmount: integer("refund_amount"), // Partial refunds supported
}, (table) => [
  index("donations_user_id_idx").on(table.userId),
  index("donations_status_idx").on(table.status),
  index("donations_stripe_payment_intent_idx").on(table.stripePaymentIntentId),
  index("donations_created_at_idx").on(table.createdAt),
]);

// ==================== Zod Schemas & Type Exports ====================

export const donationStatusSchema = z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']);
export const recurringIntervalSchema = z.enum(['month', 'year', 'week']);
export const currencySchema = z.enum(['usd', 'eur', 'gbp', 'cad', 'aud']);

export const insertDonationSchema = createInsertSchema(donations)
  .extend({
    amount: z.number().min(100).max(1000000), // $1 to $10,000 in cents
    currency: currencySchema.default('usd'),
    status: donationStatusSchema.default('pending'),
    recurringInterval: recurringIntervalSchema.optional(),
    receiptEmail: z.string().email().optional(),
    refundAmount: z.number().positive().optional(),
  });

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;
/**
 * Pricing Management Schema
 * 
 * Tables for dynamic pricing, price optimization, and performance tracking.
 * Supports demand-based pricing and competitor analysis.
 */

import { sql } from "drizzle-orm";
import { pgTable, varchar, integer, timestamp, boolean, index, jsonb, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== Tables ====================

/**
 * Pricing Rules Table
 * 
 * Defines dynamic pricing rules and factors for products.
 * Supports multi-factor optimization with configurable weights.
 * 
 * Fields:
 * - id: UUID primary key
 * - productId: Unique product identifier
 * - productName: Product name for display
 * - basePrice: Base price point
 * - minPrice: Minimum allowed price
 * - maxPrice: Maximum allowed price
 * - factors: Pricing factors and weights
 * - isActive: Whether rule is active
 * - metadata: Additional product metadata
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - productId: For product lookup
 * - isActive: For filtering active rules
 */
export const pricingRules = pgTable("pricing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  productName: varchar("product_name").notNull(),
  basePrice: real("base_price").notNull(),
  minPrice: real("min_price").notNull(),
  maxPrice: real("max_price").notNull(),
  factors: jsonb("factors").$type<{
    demandWeight?: number; // 0-1 weight for demand factor
    competitionWeight?: number; // 0-1 weight for competition
    inventoryWeight?: number; // 0-1 weight for inventory levels
    behaviorWeight?: number; // 0-1 weight for user behavior
    seasonalWeight?: number; // 0-1 weight for seasonal trends
    elasticity?: number; // Price elasticity coefficient
    demandThresholds?: {
      high: number; // Threshold for high demand
      low: number; // Threshold for low demand
    };
    inventoryThresholds?: {
      high: number; // Threshold for high inventory
      low: number; // Threshold for low inventory
    };
  }>().notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<{
    category?: string;
    tags?: string[];
    competitors?: string[];
    updateFrequency?: string; // hourly, daily, weekly
    lastOptimized?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pricing_rules_product_id_idx").on(table.productId),
  index("pricing_rules_is_active_idx").on(table.isActive),
]);

/**
 * Price History Table
 * 
 * Tracks all price changes with reasons and context.
 * Used for analysis and rollback capabilities.
 * 
 * Fields:
 * - id: Serial primary key
 * - productId: Product identifier
 * - price: New price
 * - previousPrice: Previous price
 * - changeReason: Reason for change
 * - demandLevel: Current demand level (0-100)
 * - inventoryLevel: Current inventory level (0-100)
 * - competitorPrice: Competitor's price at time of change
 * - metadata: Additional change context
 * - changedAt: Change timestamp
 * 
 * Indexes:
 * - productId: For product history lookup
 * - changedAt: For temporal queries
 */
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id").notNull(),
  price: real("price").notNull(),
  previousPrice: real("previous_price"),
  changeReason: varchar("change_reason"), // demand_surge, inventory_high, competition, manual, scheduled
  demandLevel: real("demand_level"), // 0-100 demand score
  inventoryLevel: real("inventory_level"), // 0-100 inventory score
  competitorPrice: real("competitor_price"),
  metadata: jsonb("metadata").$type<{
    demandMetrics?: {
      views?: number;
      clicks?: number;
      conversions?: number;
      cartAdds?: number;
    };
    competitorData?: Array<{
      name: string;
      price: number;
      source: string;
    }>;
    weatherImpact?: string;
    eventImpact?: string;
  }>(),
  changedAt: timestamp("changed_at").defaultNow(),
}, (table) => [
  index("price_history_product_id_idx").on(table.productId),
  index("price_history_changed_at_idx").on(table.changedAt),
]);

/**
 * Pricing Performance Table
 * 
 * Tracks pricing performance metrics over time periods.
 * Measures conversion rates, revenue, and price elasticity.
 * 
 * Fields:
 * - id: UUID primary key
 * - productId: Product identifier
 * - pricePoint: Price during this period
 * - periodStart: Period start time
 * - periodEnd: Period end time
 * - conversionRate: Conversion rate (0-1)
 * - revenue: Total revenue
 * - unitsSold: Number of units sold
 * - profit: Calculated profit
 * - metrics: Additional performance metrics
 * - createdAt: Creation timestamp
 * 
 * Indexes:
 * - productId: For product performance lookup
 * - periodStart + periodEnd: For period queries
 */
export const pricingPerformance = pgTable("pricing_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  pricePoint: real("price_point").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  conversionRate: real("conversion_rate"), // 0-1 conversion percentage
  revenue: real("revenue").notNull().default(0),
  unitsSold: integer("units_sold").notNull().default(0),
  profit: real("profit"),
  metrics: jsonb("metrics").$type<{
    avgOrderValue?: number;
    repeatPurchaseRate?: number;
    customerSatisfaction?: number;
    cartAbandonmentRate?: number;
    competitivePosition?: string; // below_market, at_market, above_market
    marginPercentage?: number;
    elasticityScore?: number; // How sensitive demand was to price
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pricing_performance_product_id_idx").on(table.productId),
  index("pricing_performance_period_idx").on(table.periodStart, table.periodEnd),
]);

// ==================== Zod Schemas & Type Exports ====================

export const changeReasonSchema = z.enum(['demand_surge', 'inventory_high', 'competition', 'manual', 'scheduled']);
export const updateFrequencySchema = z.enum(['hourly', 'daily', 'weekly', 'monthly']);
export const competitivePositionSchema = z.enum(['below_market', 'at_market', 'above_market']);

// Pricing Rules
export const insertPricingRulesSchema = createInsertSchema(pricingRules)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    basePrice: z.number().positive(),
    minPrice: z.number().nonnegative(),
    maxPrice: z.number().positive(),
    isActive: z.boolean().default(true),
    factors: z.object({
      demandWeight: z.number().min(0).max(1).optional(),
      competitionWeight: z.number().min(0).max(1).optional(),
      inventoryWeight: z.number().min(0).max(1).optional(),
      behaviorWeight: z.number().min(0).max(1).optional(),
      seasonalWeight: z.number().min(0).max(1).optional(),
      elasticity: z.number().optional(),
      demandThresholds: z.object({
        high: z.number(),
        low: z.number(),
      }).optional(),
      inventoryThresholds: z.object({
        high: z.number(),
        low: z.number(),
      }).optional(),
    }).default({}),
  })
  .refine(data => data.minPrice <= data.basePrice && data.basePrice <= data.maxPrice, {
    message: "Price range must satisfy: minPrice <= basePrice <= maxPrice",
  });

export type InsertPricingRules = z.infer<typeof insertPricingRulesSchema>;
export type PricingRules = typeof pricingRules.$inferSelect;

// Price History
export const insertPriceHistorySchema = createInsertSchema(priceHistory)
  .omit({
    id: true,
    changedAt: true,
  })
  .extend({
    price: z.number().positive(),
    previousPrice: z.number().positive().optional(),
    changeReason: changeReasonSchema.optional(),
    demandLevel: z.number().min(0).max(100).optional(),
    inventoryLevel: z.number().min(0).max(100).optional(),
    competitorPrice: z.number().positive().optional(),
  });

export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;

// Pricing Performance
export const insertPricingPerformanceSchema = createInsertSchema(pricingPerformance)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    pricePoint: z.number().positive(),
    conversionRate: z.number().min(0).max(1).optional(),
    revenue: z.number().nonnegative().default(0),
    unitsSold: z.number().nonnegative().default(0),
    profit: z.number().optional(),
    metrics: z.object({
      avgOrderValue: z.number().optional(),
      repeatPurchaseRate: z.number().min(0).max(1).optional(),
      customerSatisfaction: z.number().min(0).max(10).optional(),
      cartAbandonmentRate: z.number().min(0).max(1).optional(),
      competitivePosition: competitivePositionSchema.optional(),
      marginPercentage: z.number().optional(),
      elasticityScore: z.number().optional(),
    }).optional(),
  });

export type InsertPricingPerformance = z.infer<typeof insertPricingPerformanceSchema>;
export type PricingPerformance = typeof pricingPerformance.$inferSelect;
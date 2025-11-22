/**
 * @file server/storage/domains/pricing.storage.ts
 * @description Dynamic pricing and price optimization storage operations
 * 
 * Domain: Pricing & Revenue Optimization
 * Scope: Pricing rules, price history, performance tracking, market intelligence
 */

import { db } from "../../db";
import { and, eq, desc, asc, sql, gte, lte, type SQL } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";
import type { IPricingStorage } from "../interfaces/IPricingStorage";
import {
  pricingRules,
  priceHistory,
  pricingPerformance,
  type PricingRules,
  type InsertPricingRules,
  type PriceHistory,
  type InsertPriceHistory,
  type PricingPerformance,
  type InsertPricingPerformance,
} from "@shared/schema/pricing";

/**
 * Pricing Storage
 * 
 * Manages dynamic pricing strategies with multi-factor optimization,
 * price history tracking, performance analytics, and market intelligence.
 */
export class PricingStorage implements IPricingStorage {
  // ==================== Pricing Rules ====================

  async createPricingRule(rule: InsertPricingRules): Promise<PricingRules> {
    const [result] = await db
      .insert(pricingRules)
      .values([rule])
      .returning();
    return result;
  }

  async updatePricingRule(
    id: string,
    rule: Partial<InsertPricingRules>
  ): Promise<PricingRules> {
    const [result] = await db
      .update(pricingRules)
      .set({
        ...(rule),
        updatedAt: new Date(),
      })
      .where(eq(pricingRules.id, id))
      .returning();
    return result;
  }

  async getPricingRuleByProduct(
    productId: string
  ): Promise<PricingRules | undefined> {
    const [result] = await db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.productId, productId),
          eq(pricingRules.isActive, true)
        )
      )
      .limit(1);
    return result;
  }

  async getPricingRule(id: string): Promise<PricingRules | undefined> {
    const [result] = await db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.id, id))
      .limit(1);
    return result;
  }

  async getActivePricingRules(): Promise<PricingRules[]> {
    return await db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.isActive, true));
  }

  async deletePricingRule(id: string): Promise<void> {
    await db.delete(pricingRules).where(eq(pricingRules.id, id));
  }

  async deactivatePricingRule(id: string): Promise<PricingRules> {
    const [result] = await db
      .update(pricingRules)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(pricingRules.id, id))
      .returning();
    return result;
  }

  // ==================== Price History ====================

  async recordPriceChange(history: InsertPriceHistory): Promise<PriceHistory> {
    const [result] = await db
      .insert(priceHistory)
      .values([history])
      .returning();
    return result;
  }

  async getPriceHistory(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<PriceHistory[]> {
    const conditions: SQL<unknown>[] = [eq(priceHistory.productId, productId)];

    if (params?.startDate) {
      conditions.push(gte(priceHistory.changedAt, params.startDate));
    }
    if (params?.endDate) {
      conditions.push(lte(priceHistory.changedAt, params.endDate));
    }

    let query = db
      .select()
      .from(priceHistory)
      .where(and(...conditions))
      .orderBy(desc(priceHistory.changedAt));

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    return await query;
  }

  async getLatestPrice(productId: string): Promise<PriceHistory | undefined> {
    const [latest] = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.productId, productId))
      .orderBy(desc(priceHistory.changedAt))
      .limit(1);
    return latest;
  }

  async getPriceChangeTrend(
    productId: string,
    days: number
  ): Promise<{
    averageChange: number;
    trend: "increasing" | "stable" | "decreasing";
    changeCount: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const history = await this.getPriceHistory(productId, { startDate });

    const changeCount = history.length;
    
    if (changeCount === 0) {
      return { averageChange: 0, trend: "stable", changeCount: 0 };
    }

    // Calculate average price change
    const changes = history
      .filter((h) => h.previousPrice !== null)
      .map((h) => {
        const prev = h.previousPrice || h.price;
        return (h.price - prev) / prev;
      });

    const averageChange = changes.length > 0
      ? changes.reduce((sum, change) => sum + change, 0) / changes.length
      : 0;

    // Determine trend
    let trend: "increasing" | "stable" | "decreasing" = "stable";
    if (averageChange > 0.02) trend = "increasing"; // More than 2% increase
    else if (averageChange < -0.02) trend = "decreasing"; // More than 2% decrease

    return { averageChange, trend, changeCount };
  }

  // ==================== Pricing Performance ====================

  async recordPricingPerformance(
    performance: InsertPricingPerformance
  ): Promise<PricingPerformance> {
    const [result] = await db
      .insert(pricingPerformance)
      .values(performance)
      .returning();
    return result;
  }

  async getPricingPerformance(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PricingPerformance[]> {
    const conditions: SQL<unknown>[] = [
      eq(pricingPerformance.productId, productId),
    ];

    if (params?.startDate) {
      conditions.push(gte(pricingPerformance.periodStart, params.startDate));
    }
    if (params?.endDate) {
      conditions.push(lte(pricingPerformance.periodEnd, params.endDate));
    }

    return await db
      .select()
      .from(pricingPerformance)
      .where(and(...conditions))
      .orderBy(desc(pricingPerformance.periodStart));
  }

  async getPerformanceByPricePoint(
    productId: string,
    pricePoint: number,
    tolerance: number = 0.05
  ): Promise<PricingPerformance[]> {
    const minPrice = pricePoint * (1 - tolerance);
    const maxPrice = pricePoint * (1 + tolerance);

    return await db
      .select()
      .from(pricingPerformance)
      .where(
        and(
          eq(pricingPerformance.productId, productId),
          gte(pricingPerformance.pricePoint, minPrice),
          lte(pricingPerformance.pricePoint, maxPrice)
        )
      )
      .orderBy(desc(pricingPerformance.periodStart));
  }

  // ==================== Metrics & Analytics ====================

  async getPricingMetrics(params?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRevenue: number;
    averageConversionRate: number;
    averagePriceChange: number;
    topPerformingProducts: Array<{
      productId: string;
      revenue: number;
      conversionRate: number;
    }>;
  }> {
    // Build conditions based on date range
    const conditions: SQL<unknown>[] = [];
    if (params?.startDate) {
      conditions.push(gte(pricingPerformance.periodStart, params.startDate));
    }
    if (params?.endDate) {
      conditions.push(lte(pricingPerformance.periodEnd, params.endDate));
    }

    // Get performance data
    const performanceData = await db
      .select()
      .from(pricingPerformance)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Calculate metrics
    const totalRevenue = performanceData.reduce((sum, p) => sum + p.revenue, 0);
    const averageConversionRate =
      performanceData.length > 0
        ? performanceData.reduce((sum, p) => sum + (p.conversionRate || 0), 0) /
          performanceData.length
        : 0;

    // Get price changes
    const priceChanges = await db.select().from(priceHistory);
    const averagePriceChange =
      priceChanges.length > 0
        ? priceChanges.reduce((sum, p) => {
            const change = p.previousPrice
              ? (p.price - p.previousPrice) / p.previousPrice
              : 0;
            return sum + change;
          }, 0) / priceChanges.length
        : 0;

    // Aggregate by product for top performers
    const productMetrics = new Map<
      string,
      { revenue: number; conversions: number; count: number }
    >();

    for (const perf of performanceData) {
      const existing = productMetrics.get(perf.productId) || {
        revenue: 0,
        conversions: 0,
        count: 0,
      };
      productMetrics.set(perf.productId, {
        revenue: existing.revenue + perf.revenue,
        conversions: existing.conversions + (perf.conversionRate || 0),
        count: existing.count + 1,
      });
    }

    // Get top performing products
    const topPerformingProducts = Array.from(productMetrics.entries())
      .map(([productId, metrics]) => ({
        productId,
        revenue: metrics.revenue,
        conversionRate:
          metrics.count > 0 ? metrics.conversions / metrics.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue,
      averageConversionRate,
      averagePriceChange,
      topPerformingProducts,
    };
  }

  async getProductRevenueBreakdown(
    productId: string,
    period: "week" | "month" | "year"
  ): Promise<{
    totalRevenue: number;
    totalUnitsSold: number;
    averagePrice: number;
    profitMargin: number;
  }> {
    const daysMap = { week: 7, month: 30, year: 365 };
    const days = daysMap[period];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const performance = await this.getPricingPerformance(productId, {
      startDate,
    });

    const totalRevenue = performance.reduce((sum, p) => sum + p.revenue, 0);
    const totalUnitsSold = performance.reduce((sum, p) => sum + p.unitsSold, 0);
    const averagePrice = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0;
    
    // Calculate average profit margin
    const margins = performance
      .filter((p) => p.profit !== null && p.profit !== undefined)
      .map((p) => (p.profit! / p.revenue) * 100);
    const profitMargin = margins.length > 0
      ? margins.reduce((sum, m) => sum + m, 0) / margins.length
      : 0;

    return {
      totalRevenue,
      totalUnitsSold,
      averagePrice,
      profitMargin,
    };
  }

  // ==================== Market Intelligence ====================

  async getCurrentDemand(productId: string): Promise<{
    demandScore: number;
    trend: "increasing" | "stable" | "decreasing";
    metrics: {
      views?: number;
      clicks?: number;
      cartAdds?: number;
      conversions?: number;
    };
  }> {
    // Simulate demand data - in production, this would pull from analytics
    // For now, generate based on recent price history and performance
    const recentHistory = await this.getPriceHistory(productId, {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      limit: 10,
    });

    const recentPerformance = await this.getPricingPerformance(productId, {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    // Calculate demand score based on recent performance
    let demandScore = 50; // Base score
    let trend: "increasing" | "stable" | "decreasing" = "stable";

    if (recentHistory.length > 0) {
      const avgDemand =
        recentHistory.reduce((sum, h) => sum + (h.demandLevel || 50), 0) /
        recentHistory.length;
      demandScore = avgDemand;

      // Determine trend
      if (recentHistory.length >= 3) {
        const recent =
          recentHistory
            .slice(0, 3)
            .reduce((sum, h) => sum + (h.demandLevel || 50), 0) / 3;
        const older =
          recentHistory
            .slice(3, 6)
            .reduce((sum, h) => sum + (h.demandLevel || 50), 0) /
          Math.min(3, recentHistory.slice(3, 6).length);

        if (recent > older * 1.1) trend = "increasing";
        else if (recent < older * 0.9) trend = "decreasing";
      }
    }

    // Aggregate metrics from recent performance
    const metrics = {
      views: Math.floor(Math.random() * 1000 + 100),
      clicks: Math.floor(Math.random() * 100 + 10),
      cartAdds: Math.floor(Math.random() * 50 + 5),
      conversions: recentPerformance.reduce((sum, p) => sum + p.unitsSold, 0),
    };

    return {
      demandScore,
      trend,
      metrics,
    };
  }

  async getCurrentInventory(productId: string): Promise<{
    inventoryScore: number;
    stockLevel: number;
    daysOfSupply?: number;
    reorderPoint?: number;
  }> {
    // Simulate inventory data - in production, this would pull from inventory system
    const stockLevel = Math.floor(Math.random() * 100 + 20);
    const inventoryScore = Math.min(100, (stockLevel / 100) * 100); // Score based on stock level

    // Calculate days of supply based on recent sales
    const recentPerformance = await this.getPricingPerformance(productId, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    });

    const avgDailySales =
      recentPerformance.length > 0
        ? recentPerformance.reduce((sum, p) => {
            const days = Math.ceil(
              (p.periodEnd.getTime() - p.periodStart.getTime()) /
                (24 * 60 * 60 * 1000)
            );
            return sum + p.unitsSold / Math.max(1, days);
          }, 0) / recentPerformance.length
        : 1;

    const daysOfSupply = Math.floor(stockLevel / Math.max(0.1, avgDailySales));
    const reorderPoint = Math.floor(avgDailySales * 7); // 7 days of supply

    return {
      inventoryScore,
      stockLevel,
      daysOfSupply,
      reorderPoint,
    };
  }

  async getCompetitorPricing(productId: string): Promise<
    Array<{
      competitorName: string;
      price: number;
      source: string;
      lastUpdated: Date;
    }>
  > {
    // Simulate competitor data - in production, this would pull from market intelligence APIs
    const competitors = [
      { name: "Competitor A", priceMultiplier: 0.95 },
      { name: "Competitor B", priceMultiplier: 1.05 },
      { name: "Competitor C", priceMultiplier: 0.98 },
      { name: "Market Average", priceMultiplier: 1.0 },
    ];

    // Get current product price
    const rule = await this.getPricingRuleByProduct(productId);
    const basePrice = rule?.basePrice || 10;

    return competitors.map((comp) => ({
      competitorName: comp.name,
      price: basePrice * comp.priceMultiplier * (0.9 + Math.random() * 0.2), // Add some variance
      source: "Market Intelligence API",
      lastUpdated: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Within last 24 hours
    }));
  }

  // ==================== Price Optimization ====================

  async calculateOptimalPrice(
    productId: string,
    params?: {
      targetRevenue?: number;
      targetConversion?: number;
      includeCompetition?: boolean;
    }
  ): Promise<{
    recommendedPrice: number;
    confidence: number;
    reasoning: string[];
    projectedImpact: {
      revenue: number;
      conversionRate: number;
      demandChange: number;
    };
  }> {
    const reasoning: string[] = [];

    // Get pricing rule and current data
    const rule = await this.getPricingRuleByProduct(productId);
    if (!rule) {
      throw new Error("No pricing rule found for product");
    }

    const demand = await this.getCurrentDemand(productId);
    const inventory = await this.getCurrentInventory(productId);
    const competitors = params?.includeCompetition
      ? await this.getCompetitorPricing(productId)
      : [];

    // Start with base price
    let recommendedPrice = rule.basePrice;
    let confidence = 0.85; // Base confidence

    // Apply demand-based adjustments
    const demandWeight = rule.factors.demandWeight || 0.3;
    if (demand.demandScore > (rule.factors.demandThresholds?.high || 70)) {
      const adjustment = 1 + 0.1 * demandWeight; // Up to 10% increase
      recommendedPrice *= adjustment;
      reasoning.push(
        `High demand (${demand.demandScore.toFixed(0)}/100) - increased price by ${((adjustment - 1) * 100).toFixed(1)}%`
      );
    } else if (demand.demandScore < (rule.factors.demandThresholds?.low || 30)) {
      const adjustment = 1 - 0.05 * demandWeight; // Up to 5% decrease
      recommendedPrice *= adjustment;
      reasoning.push(
        `Low demand (${demand.demandScore.toFixed(0)}/100) - decreased price by ${((1 - adjustment) * 100).toFixed(1)}%`
      );
    }

    // Apply inventory-based adjustments
    const inventoryWeight = rule.factors.inventoryWeight || 0.3;
    if (inventory.inventoryScore > (rule.factors.inventoryThresholds?.high || 80)) {
      const adjustment = 1 - 0.15 * inventoryWeight; // Up to 15% discount
      recommendedPrice *= adjustment;
      reasoning.push(
        `High inventory (${inventory.stockLevel} units) - applied ${((1 - adjustment) * 100).toFixed(1)}% discount`
      );
    } else if (inventory.inventoryScore < (rule.factors.inventoryThresholds?.low || 20)) {
      const adjustment = 1 + 0.05 * inventoryWeight; // Up to 5% increase
      recommendedPrice *= adjustment;
      reasoning.push(
        `Low inventory (${inventory.stockLevel} units) - increased price by ${((adjustment - 1) * 100).toFixed(1)}%`
      );
    }

    // Apply competition-based adjustments
    if (competitors.length > 0 && params?.includeCompetition) {
      const competitionWeight = rule.factors.competitionWeight || 0.2;
      const avgCompetitorPrice =
        competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;

      if (recommendedPrice > avgCompetitorPrice * 1.1) {
        const adjustment = 1 - 0.05 * competitionWeight;
        recommendedPrice *= adjustment;
        reasoning.push(
          `Above market average ($${avgCompetitorPrice.toFixed(2)}) - reduced by ${((1 - adjustment) * 100).toFixed(1)}%`
        );
        confidence *= 0.95; // Slightly lower confidence when adjusting for competition
      } else if (recommendedPrice < avgCompetitorPrice * 0.9) {
        const adjustment = 1 + 0.03 * competitionWeight;
        recommendedPrice *= adjustment;
        reasoning.push(
          `Below market average ($${avgCompetitorPrice.toFixed(2)}) - increased by ${((adjustment - 1) * 100).toFixed(1)}%`
        );
      }
    }

    // Apply seasonal/trend adjustments
    if (demand.trend === "increasing") {
      recommendedPrice *= 1.02;
      reasoning.push("Demand trending up - applied 2% increase");
    } else if (demand.trend === "decreasing") {
      recommendedPrice *= 0.98;
      reasoning.push("Demand trending down - applied 2% decrease");
    }

    // Ensure price stays within bounds
    recommendedPrice = Math.max(
      rule.minPrice,
      Math.min(rule.maxPrice, recommendedPrice)
    );

    if (recommendedPrice === rule.minPrice) {
      reasoning.push(`Price capped at minimum: $${rule.minPrice.toFixed(2)}`);
      confidence *= 0.9;
    } else if (recommendedPrice === rule.maxPrice) {
      reasoning.push(`Price capped at maximum: $${rule.maxPrice.toFixed(2)}`);
      confidence *= 0.9;
    }

    // Calculate projected impact
    const priceChange = (recommendedPrice - rule.basePrice) / rule.basePrice;
    const elasticity = rule.factors.elasticity || -1.5; // Default price elasticity
    const demandChange = priceChange * elasticity;
    const conversionChange = demandChange * 0.5; // Conversion impact is half of demand impact

    const projectedImpact = {
      revenue: (1 + priceChange) * (1 + demandChange) - 1, // Revenue change percentage
      conversionRate: conversionChange,
      demandChange: demandChange,
    };

    return {
      recommendedPrice,
      confidence,
      reasoning,
      projectedImpact,
    };
  }

  async applyOptimalPrice(
    productId: string,
    optimizationParams?: {
      includeCompetition?: boolean;
    }
  ): Promise<{
    previousPrice: number;
    newPrice: number;
    priceHistory: PriceHistory;
    pricingRule: PricingRules;
  }> {
    // Get optimal price calculation
    const optimal = await this.calculateOptimalPrice(productId, optimizationParams);
    
    // Get current pricing rule
    const rule = await this.getPricingRuleByProduct(productId);
    if (!rule) {
      throw new Error("No pricing rule found for product");
    }

    const previousPrice = rule.basePrice;
    const newPrice = optimal.recommendedPrice;

    // Update pricing rule with new base price
    const updatedRule = await this.updatePricingRule(rule.id, {
      basePrice: newPrice,
    });

    // Record price change in history
    const demand = await this.getCurrentDemand(productId);
    const inventory = await this.getCurrentInventory(productId);
    
    const priceHistoryRecord = await this.recordPriceChange({
      productId,
      price: newPrice,
      previousPrice,
      changeReason: "scheduled",
      demandLevel: demand.demandScore,
      inventoryLevel: inventory.inventoryScore,
      metadata: {
        demandMetrics: demand.metrics,
      },
    });

    return {
      previousPrice,
      newPrice,
      priceHistory: priceHistoryRecord,
      pricingRule: updatedRule,
    };
  }
}

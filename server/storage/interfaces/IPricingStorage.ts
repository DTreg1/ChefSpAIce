/**
 * @file server/storage/interfaces/IPricingStorage.ts
 * @description Interface for dynamic pricing and price optimization operations
 */

import type {
  PricingRules,
  InsertPricingRules,
  PriceHistory,
  InsertPriceHistory,
  PricingPerformance,
  InsertPricingPerformance,
} from "@shared/schema/pricing";

export interface IPricingStorage {
  // ==================== Pricing Rules ====================
  createPricingRule(rule: InsertPricingRules): Promise<PricingRules>;
  updatePricingRule(
    id: string,
    rule: Partial<InsertPricingRules>
  ): Promise<PricingRules>;
  getPricingRuleByProduct(
    productId: string
  ): Promise<PricingRules | undefined>;
  getPricingRule(id: string): Promise<PricingRules | undefined>;
  getActivePricingRules(): Promise<PricingRules[]>;
  deletePricingRule(id: string): Promise<void>;
  deactivatePricingRule(id: string): Promise<PricingRules>;

  // ==================== Price History ====================
  recordPriceChange(history: InsertPriceHistory): Promise<PriceHistory>;
  getPriceHistory(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<PriceHistory[]>;
  getLatestPrice(productId: string): Promise<PriceHistory | undefined>;
  getPriceChangeTrend(
    productId: string,
    days: number
  ): Promise<{
    averageChange: number;
    trend: "increasing" | "stable" | "decreasing";
    changeCount: number;
  }>;

  // ==================== Pricing Performance ====================
  recordPricingPerformance(
    performance: InsertPricingPerformance
  ): Promise<PricingPerformance>;
  getPricingPerformance(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PricingPerformance[]>;
  getPerformanceByPricePoint(
    productId: string,
    pricePoint: number,
    tolerance?: number
  ): Promise<PricingPerformance[]>;

  // ==================== Metrics & Analytics ====================
  getPricingMetrics(params?: {
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
  }>;
  getProductRevenueBreakdown(
    productId: string,
    period: "week" | "month" | "year"
  ): Promise<{
    totalRevenue: number;
    totalUnitsSold: number;
    averagePrice: number;
    profitMargin: number;
  }>;

  // ==================== Market Intelligence ====================
  getCurrentDemand(productId: string): Promise<{
    demandScore: number;
    trend: "increasing" | "stable" | "decreasing";
    metrics: {
      views?: number;
      clicks?: number;
      cartAdds?: number;
      conversions?: number;
    };
  }>;
  getCurrentInventory(productId: string): Promise<{
    inventoryScore: number;
    stockLevel: number;
    daysOfSupply?: number;
    reorderPoint?: number;
  }>;
  getCompetitorPricing(productId: string): Promise<
    Array<{
      competitorName: string;
      price: number;
      source: string;
      lastUpdated: Date;
    }>
  >;

  // ==================== Price Optimization ====================
  calculateOptimalPrice(
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
  }>;
  applyOptimalPrice(
    productId: string,
    optimizationParams?: {
      includeCompetition?: boolean;
    }
  ): Promise<{
    previousPrice: number;
    newPrice: number;
    priceHistory: PriceHistory;
    pricingRule: PricingRules;
  }>;
}

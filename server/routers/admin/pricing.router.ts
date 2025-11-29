/**
 * Pricing API Router
 * 
 * Handles dynamic pricing optimization using AI and machine learning.
 * Integrates OpenAI for market analysis and TensorFlow.js for demand prediction.
 */

import { Router } from "express";
import { storage } from "../../storage/index";
import { insertPricingRulesSchema, insertPriceHistorySchema, insertPricingPerformanceSchema } from "@shared/schema";
import OpenAI from "openai";
import * as tf from "@tensorflow/tfjs-node";
import { z } from "zod";

// Initialize OpenAI with Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const router = Router();

// Middleware for error handling
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * TensorFlow.js Demand Prediction Model
 * Simple neural network for predicting demand based on historical data
 */
class DemandPredictor {
  private model: tf.Sequential | null = null;
  
  constructor() {
    this.initializeModel();
  }
  
  private initializeModel() {
    // Create a simple sequential model
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 10, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    // Compile the model
    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
  }
  
  // Predict demand score (0-100)
  async predictDemand(features: {
    price: number;
    dayOfWeek: number;
    hour: number;
    previousDemand: number;
    competitorPrice: number;
  }): Promise<number> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }
    
    // Normalize features
    const normalizedFeatures = [
      features.price / 100, // Normalize price
      features.dayOfWeek / 7, // Day of week (0-6) to 0-1
      features.hour / 24, // Hour (0-23) to 0-1
      features.previousDemand / 100, // Previous demand to 0-1
      features.competitorPrice / 100 // Competitor price to 0-1
    ];
    
    // Create tensor
    const input = tf.tensor2d([normalizedFeatures]);
    
    // Predict
    const prediction = this.model.predict(input) as tf.Tensor;
    const result = await prediction.data();
    
    // Clean up tensors
    input.dispose();
    prediction.dispose();
    
    // Return demand score (0-100)
    return Math.min(100, Math.max(0, result[0] * 100));
  }
  
  // Train the model with new data
  async train(data: Array<{
    features: [number, number, number, number, number];
    demand: number;
  }>) {
    if (!this.model || data.length === 0) return;
    
    const xs = tf.tensor2d(data.map(d => d.features));
    const ys = tf.tensor2d(data.map(d => [d.demand / 100]));
    
    await this.model.fit(xs, ys, {
      epochs: 10,
      batchSize: 32,
      shuffle: true,
      verbose: 0
    });
    
    xs.dispose();
    ys.dispose();
  }
}

// Initialize demand predictor
const demandPredictor = new DemandPredictor();

/**
 * GET /api/pricing/optimize
 * Get optimal price recommendation for a product
 */
router.get("/optimize/:productId", asyncHandler(async (req: any, res: any) => {
  const { productId } = req.params;
  const includeCompetition = req.query.includeCompetition === 'true';
  const useAI = req.query.useAI !== 'false'; // Default to true
  
  try {
    // Get current pricing rule
    const rule = await storage.admin.pricing.getPricingRuleByProduct(productId);
    
    if (!rule) {
      return res.status(404).json({ error: "No pricing rule found for product" });
    }
    
    // Get current market conditions
    const demand = await storage.admin.pricing.getCurrentDemand(productId);
    const inventory = await storage.admin.pricing.getCurrentInventory(productId);
    
    // Use TensorFlow.js to predict future demand
    const now = new Date();
    const predictedDemand = await demandPredictor.predictDemand({
      price: rule.basePrice,
      dayOfWeek: now.getDay(),
      hour: now.getHours(),
      previousDemand: demand.demandScore,
      competitorPrice: rule.basePrice // Will be updated if competition analysis is included
    });
    
    // Get AI-powered market analysis if enabled
    let aiAnalysis = null;
    if (useAI) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "You are a pricing optimization expert. Analyze market conditions and provide strategic pricing recommendations."
            },
            {
              role: "user",
              content: `Analyze pricing for product "${rule.productName}":
                Current Price: $${rule.basePrice}
                Price Range: $${rule.minPrice} - $${rule.maxPrice}
                Current Demand Score: ${demand.demandScore}/100
                Predicted Demand: ${predictedDemand.toFixed(0)}/100
                Demand Trend: ${demand.trend}
                Inventory Score: ${inventory.inventoryScore}/100
                Stock Level: ${inventory.stockLevel} units
                Days of Supply: ${inventory.daysOfSupply || 'N/A'}
                
                Provide:
                1. Market positioning recommendation
                2. Price adjustment strategy
                3. Risk factors to consider
                4. Expected impact on sales volume`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });
        
        aiAnalysis = completion.choices[0]?.message?.content || null;
      } catch (error) {
        console.error("OpenAI analysis error:", error);
        // Continue without AI analysis
      }
    }
    
    // Calculate optimal price using storage method
    const optimization = await storage.admin.pricing.calculateOptimalPrice(productId, {
      includeCompetition,
      targetRevenue: req.query.targetRevenue ? parseFloat(req.query.targetRevenue) : undefined,
      targetConversion: req.query.targetConversion ? parseFloat(req.query.targetConversion) : undefined
    });
    
    // Adjust recommendation based on predicted demand
    if (predictedDemand > demand.demandScore * 1.2) {
      optimization.recommendedPrice *= 1.03; // Increase price if demand is predicted to rise
      optimization.reasoning.push(`Demand predicted to increase to ${predictedDemand.toFixed(0)}/100 - added 3% premium`);
    } else if (predictedDemand < demand.demandScore * 0.8) {
      optimization.recommendedPrice *= 0.97; // Decrease price if demand is predicted to fall
      optimization.reasoning.push(`Demand predicted to decrease to ${predictedDemand.toFixed(0)}/100 - applied 3% discount`);
    }
    
    // Ensure price stays within bounds
    optimization.recommendedPrice = Math.max(rule.minPrice, Math.min(rule.maxPrice, optimization.recommendedPrice));
    
    res.json({
      productId,
      productName: rule.productName,
      currentPrice: rule.basePrice,
      recommendedPrice: optimization.recommendedPrice,
      priceChange: ((optimization.recommendedPrice - rule.basePrice) / rule.basePrice * 100).toFixed(2) + '%',
      confidence: optimization.confidence,
      reasoning: optimization.reasoning,
      projectedImpact: {
        revenue: (optimization.projectedImpact.revenue * 100).toFixed(2) + '%',
        conversionRate: (optimization.projectedImpact.conversionRate * 100).toFixed(2) + '%',
        demandChange: (optimization.projectedImpact.demandChange * 100).toFixed(2) + '%'
      },
      marketConditions: {
        currentDemand: demand.demandScore,
        predictedDemand: predictedDemand.toFixed(0),
        demandTrend: demand.trend,
        inventoryScore: inventory.inventoryScore,
        stockLevel: inventory.stockLevel,
        daysOfSupply: inventory.daysOfSupply
      },
      aiAnalysis
    });
  } catch (error: any) {
    console.error("Error optimizing price:", error);
    res.status(500).json({ error: error.message || "Failed to optimize price" });
  }
}));

/**
 * POST /api/pricing/simulate
 * Simulate pricing scenarios
 */
router.post("/simulate", asyncHandler(async (req: any, res: any) => {
  const simulationSchema = z.object({
    productId: z.string(),
    scenarios: z.array(z.object({
      price: z.number().positive(),
      demandLevel: z.number().min(0).max(100).optional(),
      inventoryLevel: z.number().min(0).max(100).optional(),
      competitorPrice: z.number().positive().optional()
    }))
  });
  
  try {
    const { productId, scenarios } = simulationSchema.parse(req.body);
    
    // Get pricing rule
    const rule = await storage.admin.pricing.getPricingRuleByProduct(productId);
    if (!rule) {
      return res.status(404).json({ error: "No pricing rule found for product" });
    }
    
    const results = [];
    
    for (const scenario of scenarios) {
      // Predict demand for this scenario
      const now = new Date();
      const predictedDemand = await demandPredictor.predictDemand({
        price: scenario.price,
        dayOfWeek: now.getDay(),
        hour: now.getHours(),
        previousDemand: scenario.demandLevel || 50,
        competitorPrice: scenario.competitorPrice || scenario.price
      });
      
      // Calculate elasticity impact
      const priceChange = (scenario.price - rule.basePrice) / rule.basePrice;
      const elasticity = rule.factors.elasticity || -1.5;
      const demandChange = priceChange * elasticity;
      
      // Estimate revenue impact
      const baseRevenue = 100 * rule.basePrice; // Assume 100 base units
      const newUnits = 100 * (1 + demandChange);
      const newRevenue = newUnits * scenario.price;
      const revenueChange = (newRevenue - baseRevenue) / baseRevenue;
      
      results.push({
        price: scenario.price,
        predictedDemand: predictedDemand.toFixed(0),
        estimatedUnits: Math.max(0, Math.round(newUnits)),
        estimatedRevenue: newRevenue.toFixed(2),
        revenueChange: (revenueChange * 100).toFixed(2) + '%',
        profitMargin: ((scenario.price - (rule.minPrice * 0.6)) / scenario.price * 100).toFixed(2) + '%'
      });
    }
    
    res.json({
      productId,
      productName: rule.productName,
      basePrice: rule.basePrice,
      scenarios: results
    });
  } catch (error: any) {
    console.error("Error simulating pricing:", error);
    res.status(400).json({ error: error.message || "Invalid simulation data" });
  }
}));

/**
 * GET /api/pricing/competition
 * Get competitor pricing analysis
 */
router.get("/competition/:productId", asyncHandler(async (req: any, res: any) => {
  const { productId } = req.params;
  const useAI = req.query.useAI !== 'false';
  
  try {
    const competitors = await storage.admin.pricing.getCompetitorPricing(productId);
    const rule = await storage.admin.pricing.getPricingRuleByProduct(productId);
    
    if (!rule) {
      return res.status(404).json({ error: "No pricing rule found for product" });
    }
    
    // Calculate market position
    const avgCompetitorPrice = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
    const pricePosition = rule.basePrice > avgCompetitorPrice * 1.05 ? 'above_market' :
                         rule.basePrice < avgCompetitorPrice * 0.95 ? 'below_market' : 'at_market';
    
    // Get AI competitive analysis
    let aiInsights = null;
    if (useAI && competitors.length > 0) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "You are a competitive pricing analyst. Provide strategic insights on competitive positioning."
            },
            {
              role: "user",
              content: `Analyze competitive landscape for "${rule.productName}":
                Our Price: $${rule.basePrice}
                Market Average: $${avgCompetitorPrice.toFixed(2)}
                Price Position: ${pricePosition}
                Competitors: ${competitors.map(c => `${c.competitorName}: $${c.price.toFixed(2)}`).join(', ')}
                
                Provide:
                1. Competitive advantage assessment
                2. Recommended positioning strategy
                3. Price adjustment opportunities
                4. Risks of current pricing`
            }
          ],
          temperature: 0.7,
          max_tokens: 400
        });
        
        aiInsights = completion.choices[0]?.message?.content || null;
      } catch (error) {
        console.error("OpenAI competitive analysis error:", error);
      }
    }
    
    res.json({
      productId,
      productName: rule.productName,
      ourPrice: rule.basePrice,
      marketAverage: avgCompetitorPrice.toFixed(2),
      pricePosition,
      priceGap: ((rule.basePrice - avgCompetitorPrice) / avgCompetitorPrice * 100).toFixed(2) + '%',
      competitors: competitors.map(c => ({
        ...c,
        priceDifference: ((c.price - rule.basePrice) / rule.basePrice * 100).toFixed(2) + '%'
      })),
      recommendation: pricePosition === 'above_market' ? 
        'Consider price reduction to improve competitiveness' :
        pricePosition === 'below_market' ?
        'Opportunity to increase price while remaining competitive' :
        'Maintain current pricing strategy',
      aiInsights
    });
  } catch (error: any) {
    console.error("Error analyzing competition:", error);
    res.status(500).json({ error: error.message || "Failed to analyze competition" });
  }
}));

/**
 * PUT /api/pricing/rules
 * Create or update pricing rules
 */
router.put("/rules", asyncHandler(async (req: any, res: any) => {
  try {
    const ruleData = insertPricingRulesSchema.parse(req.body);
    
    // Check if rule exists for this product
    const existingRule = await storage.admin.pricing.getPricingRuleByProduct(ruleData.productId);
    
    let result;
    if (existingRule) {
      // Update existing rule
      result = await storage.admin.pricing.updatePricingRule(existingRule.id, ruleData);
    } else {
      // Create new rule
      result = await storage.admin.pricing.createPricingRule(ruleData);
    }
    
    // Record initial price in history
    await storage.admin.pricing.recordPriceChange({
      productId: ruleData.productId,
      price: ruleData.basePrice,
      previousPrice: existingRule?.basePrice,
      changeReason: existingRule ? 'manual' : 'scheduled',
      demandLevel: 50,
      inventoryLevel: 50,
      metadata: {
        demandMetrics: {
          views: 0,
          clicks: 0,
          conversions: 0,
          cartAdds: 0
        }
      }
    });
    
    res.json({
      success: true,
      rule: result,
      message: existingRule ? 'Pricing rule updated' : 'Pricing rule created'
    });
  } catch (error: any) {
    console.error("Error updating pricing rules:", error);
    res.status(400).json({ error: error.message || "Invalid pricing rule data" });
  }
}));

/**
 * GET /api/pricing/report
 * Get comprehensive pricing performance report
 */
router.get("/report", asyncHandler(async (req: any, res: any) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  
  try {
    // Get overall metrics
    const metrics = await storage.admin.pricing.getPricingMetrics({ startDate, endDate });
    
    // Get all active pricing rules
    const activeRules = await storage.admin.pricing.getActivePricingRules();
    
    // Get detailed performance for each product
    const productReports = await Promise.all(
      activeRules.map(async (rule) => {
        const performance = await storage.admin.pricing.getPricingPerformance(rule.productId, { startDate, endDate });
        const history = await storage.admin.pricing.getPriceHistory(rule.productId, { startDate, endDate, limit: 10 });
        const demand = await storage.admin.pricing.getCurrentDemand(rule.productId);
        const inventory = await storage.admin.pricing.getCurrentInventory(rule.productId);
        
        // Calculate key metrics
        const avgPrice = history.length > 0 
          ? history.reduce((sum, h) => sum + h.price, 0) / history.length 
          : rule.basePrice;
        
        const totalRevenue = performance.reduce((sum, p) => sum + p.revenue, 0);
        const totalUnits = performance.reduce((sum, p) => sum + p.unitsSold, 0);
        const avgConversion = performance.length > 0
          ? performance.reduce((sum, p) => sum + (p.conversionRate || 0), 0) / performance.length
          : 0;
        
        return {
          productId: rule.productId,
          productName: rule.productName,
          currentPrice: rule.basePrice,
          averagePrice: avgPrice.toFixed(2),
          priceVolatility: history.length > 1 ? 
            (Math.max(...history.map(h => h.price)) - Math.min(...history.map(h => h.price))) / avgPrice : 0,
          totalRevenue: totalRevenue.toFixed(2),
          totalUnits,
          averageConversionRate: (avgConversion * 100).toFixed(2) + '%',
          currentDemand: demand.demandScore,
          demandTrend: demand.trend,
          inventoryScore: inventory.inventoryScore,
          priceChanges: history.length,
          lastPriceChange: history[0]?.changedAt || null
        };
      })
    );
    
    // Generate AI-powered insights
    let aiSummary = null;
    if (req.query.includeAI !== 'false' && productReports.length > 0) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "You are a pricing strategy advisor. Analyze pricing performance and provide actionable insights."
            },
            {
              role: "user",
              content: `Analyze pricing performance for ${productReports.length} products:
                Total Revenue: $${metrics.totalRevenue.toFixed(2)}
                Average Conversion Rate: ${(metrics.averageConversionRate * 100).toFixed(2)}%
                Average Price Change: ${(metrics.averagePriceChange * 100).toFixed(2)}%
                
                Top Performers: ${metrics.topPerformingProducts.slice(0, 3).map(p => 
                  `Product ${p.productId}: $${p.revenue.toFixed(2)} revenue`
                ).join(', ')}
                
                Provide:
                1. Overall performance assessment
                2. Key success factors
                3. Areas for improvement
                4. Strategic recommendations for next period`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });
        
        aiSummary = completion.choices[0]?.message?.content || null;
      } catch (error) {
        console.error("OpenAI summary error:", error);
      }
    }
    
    res.json({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalRevenue: metrics.totalRevenue.toFixed(2),
        averageConversionRate: (metrics.averageConversionRate * 100).toFixed(2) + '%',
        averagePriceChange: (metrics.averagePriceChange * 100).toFixed(2) + '%',
        activeProducts: activeRules.length,
        topPerformers: metrics.topPerformingProducts.slice(0, 5)
      },
      products: productReports,
      aiSummary,
      recommendations: [
        metrics.averagePriceChange > 0.1 ? 
          "High price volatility detected - consider stabilizing prices" : null,
        metrics.averageConversionRate < 0.02 ?
          "Low conversion rates - review pricing strategy" : null,
        productReports.some(p => p.inventoryScore > 80) ?
          "High inventory on some products - consider promotional pricing" : null,
        productReports.some(p => p.demandTrend === 'increasing' && Number(p.currentPrice) === Number(p.averagePrice)) ?
          "Opportunity to increase prices on trending products" : null
      ].filter(Boolean)
    });
  } catch (error: any) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: error.message || "Failed to generate report" });
  }
}));

/**
 * POST /api/pricing/apply
 * Apply recommended price to a product
 */
router.post("/apply/:productId", asyncHandler(async (req: any, res: any) => {
  const { productId } = req.params;
  const { price, reason } = req.body;
  
  if (!price || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: "Valid price is required" });
  }
  
  try {
    // Get current rule
    const rule = await storage.admin.pricing.getPricingRuleByProduct(productId);
    if (!rule) {
      return res.status(404).json({ error: "No pricing rule found for product" });
    }
    
    // Validate price is within bounds
    if (price < rule.minPrice || price > rule.maxPrice) {
      return res.status(400).json({ 
        error: `Price must be between $${rule.minPrice} and $${rule.maxPrice}` 
      });
    }
    
    // Get current conditions
    const demand = await storage.admin.pricing.getCurrentDemand(productId);
    const inventory = await storage.admin.pricing.getCurrentInventory(productId);
    
    // Record price change
    await storage.admin.pricing.recordPriceChange({
      productId,
      price,
      previousPrice: rule.basePrice,
      changeReason: reason || 'manual',
      demandLevel: demand.demandScore,
      inventoryLevel: inventory.inventoryScore,
      metadata: {
        demandMetrics: demand.metrics
      }
    });
    
    // Update base price in rule
    await storage.admin.pricing.updatePricingRule(rule.id, { basePrice: price });
    
    res.json({
      success: true,
      productId,
      productName: rule.productName,
      previousPrice: rule.basePrice,
      newPrice: price,
      priceChange: ((price - rule.basePrice) / rule.basePrice * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error applying price:", error);
    res.status(500).json({ error: error.message || "Failed to apply price" });
  }
}));

/**
 * GET /api/pricing/history/:productId
 * Get price history for a product
 */
router.get("/history/:productId", asyncHandler(async (req: any, res: any) => {
  const { productId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  
  try {
    const history = await storage.admin.pricing.getPriceHistory(productId, { startDate, endDate, limit });
    
    res.json({
      productId,
      count: history.length,
      history: history.map(h => ({
        ...h,
        priceChange: h.previousPrice ? 
          ((h.price - h.previousPrice) / h.previousPrice * 100).toFixed(2) + '%' : null
      }))
    });
  } catch (error: any) {
    console.error("Error getting price history:", error);
    res.status(500).json({ error: error.message || "Failed to get price history" });
  }
}));

export default router;
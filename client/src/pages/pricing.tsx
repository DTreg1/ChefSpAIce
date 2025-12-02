/**
 * Pricing Optimization Page
 *
 * Main interface for AI-driven dynamic pricing system.
 * Integrates all pricing components for comprehensive price management.
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  Activity,
  BarChart3,
  Calculator,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";

// Import pricing components
import { PricingDashboard } from "@/components/pricing/pricing-dashboard";
import { DemandCurve } from "@/components/pricing/demand-curve";
import { PriceSimulator } from "@/components/pricing/price-simulator";
import { CompetitorPricing } from "@/components/pricing/competitor-pricing";
import { RevenueImpact } from "@/components/pricing/revenue-impact";

interface PricingRule {
  id: string;
  productId: string;
  productName: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  factors: {
    elasticity?: number;
    demandWeight?: number;
    competitionWeight?: number;
    inventoryWeight?: number;
  };
  isActive: boolean;
}

interface OptimizationResult {
  productId: string;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChange: string;
  confidence: number;
  reasoning: string[];
  projectedImpact: {
    revenue: string;
    conversionRate: string;
    demandChange: string;
  };
  marketConditions: {
    currentDemand: number;
    predictedDemand: string;
    demandTrend: string;
    inventoryScore: number;
  };
  aiAnalysis: string | null;
}

export default function PricingPage() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [optimizationResult, setOptimizationResult] =
    useState<OptimizationResult | null>(null);

  // Fetch pricing rules
  const { data: rules, isLoading: rulesLoading } = useQuery<PricingRule[]>({
    queryKey: [API_ENDPOINTS.admin.pricing.rules],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.admin.pricing.rules);
      if (!response.ok) return [];
      const data = await response.json();
      // Since we're getting active rules from the API
      return data;
    },
  });

  // Fetch optimization for selected product
  const {
    data: optimization,
    isLoading: optLoading,
    refetch: refetchOptimization,
  } = useQuery<OptimizationResult>({
    queryKey: [API_ENDPOINTS.admin.pricing.optimize, selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) throw new Error("No product selected");
      const response = await fetch(
        `${API_ENDPOINTS.admin.pricing.optimize}/${selectedProduct}?includeCompetition=true&useAI=true`,
      );
      if (!response.ok) throw new Error("Failed to fetch optimization");
      return response.json();
    },
    enabled: !!selectedProduct,
  });

  // Get selected product rule
  const selectedRule = rules?.find((r) => r.productId === selectedProduct);

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    if (productId) {
      refetchOptimization();
    }
  };

  // Loading state
  if (rulesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // No products configured
  if (!rules || rules.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTitle>No Products Configured</AlertTitle>
          <AlertDescription>
            No products have pricing rules configured yet. Add products from
            your inventory to start optimizing prices.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dynamic Pricing Optimization
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered pricing to maximize revenue and optimize inventory
          </p>
        </div>

        {/* Product Selector */}
        <Select
          value={selectedProduct || ""}
          onValueChange={handleProductSelect}
        >
          <SelectTrigger className="w-[280px]" data-testid="product-selector">
            <SelectValue placeholder="Select a product to analyze" />
          </SelectTrigger>
          <SelectContent>
            {rules.map((rule) => (
              <SelectItem key={rule.productId} value={rule.productId}>
                {rule.productName} - ${rule.basePrice.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <Activity className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="optimization"
            disabled={!selectedProduct}
            data-testid="tab-optimization"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Optimize
          </TabsTrigger>
          <TabsTrigger
            value="demand"
            disabled={!selectedProduct}
            data-testid="tab-demand"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Demand
          </TabsTrigger>
          <TabsTrigger
            value="simulator"
            disabled={!selectedProduct}
            data-testid="tab-simulator"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Simulate
          </TabsTrigger>
          <TabsTrigger
            value="competition"
            disabled={!selectedProduct}
            data-testid="tab-competition"
          >
            <Users className="mr-2 h-4 w-4" />
            Competition
          </TabsTrigger>
          <TabsTrigger
            value="impact"
            disabled={!selectedProduct || !optimization}
            data-testid="tab-impact"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Impact
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <PricingDashboard />
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization">
          {selectedProduct && optimization && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Price Optimization</CardTitle>
                  <CardDescription>
                    AI-powered recommendations for {optimization.productName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Price Recommendation */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Recommended Price
                        </p>
                        <p className="text-3xl font-bold">
                          ${optimization.recommendedPrice.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Current: ${optimization.currentPrice.toFixed(2)} (
                          {optimization.priceChange})
                        </p>
                      </div>
                      <Button
                        size="lg"
                        onClick={async () => {
                          const response = await fetch(
                            `${API_ENDPOINTS.admin.pricing.rules}/${selectedProduct}/apply`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                price: optimization.recommendedPrice,
                                reason: "ai_optimization",
                              }),
                            },
                          );
                          if (response.ok) {
                            refetchOptimization();
                          }
                        }}
                        data-testid="apply-price-button"
                      >
                        Apply Price
                      </Button>
                    </div>

                    {/* Market Conditions */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Current Demand
                        </p>
                        <p className="text-xl font-medium">
                          {optimization.marketConditions.currentDemand}/100
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Predicted Demand
                        </p>
                        <p className="text-xl font-medium">
                          {optimization.marketConditions.predictedDemand}/100
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Trend</p>
                        <p className="text-xl font-medium capitalize">
                          {optimization.marketConditions.demandTrend}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Inventory
                        </p>
                        <p className="text-xl font-medium">
                          {optimization.marketConditions.inventoryScore}/100
                        </p>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Optimization Reasoning</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {optimization.reasoning.map((reason, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground"
                          >
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* AI Analysis */}
                    {optimization.aiAnalysis && (
                      <div className="space-y-2">
                        <h4 className="font-medium">AI Market Analysis</h4>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {optimization.aiAnalysis
                            .split("\n")
                            .map((paragraph, idx) => (
                              <p
                                key={idx}
                                className="text-sm text-muted-foreground"
                              >
                                {paragraph}
                              </p>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {selectedProduct && optLoading && (
            <Card>
              <CardContent className="p-8">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Demand Curve Tab */}
        <TabsContent value="demand">
          {selectedProduct && selectedRule && (
            <DemandCurve
              productId={selectedProduct}
              productName={selectedRule.productName}
              basePrice={selectedRule.basePrice}
              minPrice={selectedRule.minPrice}
              maxPrice={selectedRule.maxPrice}
              elasticity={selectedRule.factors.elasticity}
            />
          )}
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator">
          {selectedProduct && selectedRule && (
            <PriceSimulator
              productId={selectedProduct}
              productName={selectedRule.productName}
              basePrice={selectedRule.basePrice}
              minPrice={selectedRule.minPrice}
              maxPrice={selectedRule.maxPrice}
            />
          )}
        </TabsContent>

        {/* Competition Tab */}
        <TabsContent value="competition">
          {selectedProduct && selectedRule && (
            <CompetitorPricing
              productId={selectedProduct}
              productName={selectedRule.productName}
              basePrice={selectedRule.basePrice}
            />
          )}
        </TabsContent>

        {/* Impact Tab */}
        <TabsContent value="impact">
          {selectedProduct && optimization && (
            <RevenueImpact
              productId={selectedProduct}
              productName={optimization.productName}
              currentPrice={optimization.currentPrice}
              recommendedPrice={optimization.recommendedPrice}
              projectedImpact={optimization.projectedImpact}
              confidence={optimization.confidence}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Pricing Dashboard Component
 * 
 * Main overview component for dynamic pricing system.
 * Displays key metrics, recommendations, and quick actions.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, Minus, AlertCircle, DollarSign, Package, Users, Activity } from "lucide-react";
import { format } from "date-fns";

interface PricingMetrics {
  totalRevenue: string;
  averageConversionRate: string;
  averagePriceChange: string;
  activeProducts: number;
  topPerformers: Array<{
    productId: string;
    revenue: number;
    conversionRate: number;
  }>;
}

interface ProductReport {
  productId: string;
  productName: string;
  currentPrice: number;
  averagePrice: string;
  priceVolatility: number;
  totalRevenue: string;
  totalUnits: number;
  averageConversionRate: string;
  currentDemand: number;
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  inventoryScore: number;
  priceChanges: number;
  lastPriceChange: string | null;
}

interface PricingReport {
  summary: PricingMetrics;
  products: ProductReport[];
  recommendations: string[];
  aiSummary: string | null;
}

export function PricingDashboard() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch pricing report
  const { data: report, isLoading, error } = useQuery<PricingReport>({
    queryKey: ['/api/pricing/report'],
    queryFn: async () => {
      const response = await fetch('/api/pricing/report?includeAI=true');
      if (!response.ok) throw new Error('Failed to fetch pricing report');
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Optimize single product
  const handleOptimizePrice = async (productId: string) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/pricing/optimize/${productId}?includeCompetition=true&useAI=true`);
      const optimization = await response.json();
      
      if (optimization.recommendedPrice) {
        // Apply the recommended price
        await apiRequest(`/api/pricing/apply/${productId}`, 'POST', {
          price: optimization.recommendedPrice,
          reason: 'ai_optimization'
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/pricing/report'] });
      }
    } catch (error) {
      console.error('Error optimizing price:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get demand color
  const getDemandColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get inventory color
  const getInventoryColor = (score: number) => {
    if (score >= 80) return 'text-red-600 dark:text-red-400'; // Too high
    if (score >= 20) return 'text-green-600 dark:text-green-400'; // Good
    return 'text-yellow-600 dark:text-yellow-400'; // Too low
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load pricing dashboard. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="pricing-dashboard">
      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${report.summary.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.averageConversionRate}</div>
            <p className="text-xs text-muted-foreground">Average across products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Changes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.averagePriceChange}</div>
            <p className="text-xs text-muted-foreground">Average adjustment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.activeProducts}</div>
            <p className="text-xs text-muted-foreground">With pricing rules</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {report.aiSummary.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-2 text-sm">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Recommendations</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm">{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Product Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <CardDescription>
            Click on a product to view details and optimize pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.products.map((product) => (
              <div
                key={product.productId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedProduct(
                  selectedProduct === product.productId ? null : product.productId
                )}
                data-testid={`product-row-${product.productId}`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{product.productName}</h4>
                    {getTrendIcon(product.demandTrend)}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Current: ${product.currentPrice.toFixed(2)}</span>
                    <span>Avg: ${product.averagePrice}</span>
                    <span className={getDemandColor(product.currentDemand)}>
                      Demand: {product.currentDemand}/100
                    </span>
                    <span className={getInventoryColor(product.inventoryScore)}>
                      Inventory: {product.inventoryScore}/100
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">${product.totalRevenue}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.totalUnits} units • {product.averageConversionRate} conv.
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptimizePrice(product.productId);
                    }}
                    disabled={refreshing}
                    data-testid={`optimize-button-${product.productId}`}
                  >
                    Optimize
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      {report.summary.topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>
              Products generating the highest revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.summary.topPerformers.map((performer, idx) => (
                <div key={performer.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{idx + 1}</Badge>
                    <span className="text-sm font-medium">Product {performer.productId}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      ${performer.revenue.toFixed(2)}
                    </span>
                    <Badge variant="secondary">
                      {(performer.conversionRate * 100).toFixed(1)}% conv.
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
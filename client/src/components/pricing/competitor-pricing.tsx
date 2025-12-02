/**
 * Competitor Pricing Component
 *
 * Tracks and displays competitor pricing information.
 * Shows market positioning and competitive analysis.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

interface CompetitorData {
  competitorName: string;
  price: number;
  source: string;
  lastUpdated: Date;
  priceDifference: string;
}

interface CompetitorAnalysis {
  productId: string;
  productName: string;
  ourPrice: number;
  marketAverage: string;
  pricePosition: "above_market" | "at_market" | "below_market";
  priceGap: string;
  competitors: CompetitorData[];
  recommendation: string;
  aiInsights: string | null;
}

interface CompetitorPricingProps {
  productId: string;
  productName: string;
  basePrice: number;
}

export function CompetitorPricing({
  productId,
  productName,
  basePrice,
}: CompetitorPricingProps) {
  // Fetch competitor analysis
  const { data, isLoading, error, refetch } = useQuery<CompetitorAnalysis>({
    queryKey: [API_ENDPOINTS.admin.pricing.rules, "competition", productId],
    queryFn: async () => {
      const response = await fetch(
        `${API_ENDPOINTS.admin.pricing.rules}/competition/${productId}?useAI=true`,
      );
      if (!response.ok) throw new Error("Failed to fetch competitor data");
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Get position color
  const getPositionColor = (position: string) => {
    switch (position) {
      case "above_market":
        return "destructive";
      case "below_market":
        return "secondary";
      default:
        return "default";
    }
  };

  // Get position icon
  const getPositionIcon = (position: string) => {
    switch (position) {
      case "above_market":
        return <TrendingUp className="h-4 w-4" />;
      case "below_market":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  // Calculate price range
  const getPriceRange = (competitors: CompetitorData[]) => {
    const prices = competitors.map((c) => c.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      spread: Math.max(...prices) - Math.min(...prices),
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load competitor pricing data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const priceRange = getPriceRange(data.competitors);
  const chartData = data.competitors.map((comp) => ({
    name: comp.competitorName,
    price: comp.price,
    color:
      comp.price > basePrice
        ? "hsl(var(--destructive))"
        : comp.price < basePrice
          ? "hsl(var(--chart-2))"
          : "hsl(var(--chart-1))",
  }));

  // Add our price to chart
  chartData.push({
    name: "Our Price",
    price: basePrice,
    color: "hsl(var(--primary))",
  });

  return (
    <div className="space-y-6" data-testid="competitor-pricing">
      {/* Market Position Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Market Position</CardTitle>
              <CardDescription>
                Competitive analysis for {productName}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-testid="refresh-competitors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Position Badges */}
            <div className="flex gap-2">
              <Badge
                variant={getPositionColor(data.pricePosition)}
                className="gap-1"
              >
                {getPositionIcon(data.pricePosition)}
                {data.pricePosition.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge variant="outline">Gap: {data.priceGap}</Badge>
              <Badge variant="outline">Market Avg: ${data.marketAverage}</Badge>
            </div>

            {/* Price Range Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Price Range</span>
                <span>
                  ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)}
                </span>
              </div>
              <div className="relative">
                <Progress value={0} className="h-2" />
                <div
                  className="absolute top-0 h-2 bg-primary rounded-full"
                  style={{
                    left: `${((basePrice - priceRange.min) / priceRange.spread) * 100}%`,
                    width: "4px",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min</span>
                <span>Our Price: ${basePrice.toFixed(2)}</span>
                <span>Max</span>
              </div>
            </div>

            {/* Recommendation */}
            <Alert>
              <Target className="h-4 w-4" />
              <AlertTitle>Recommendation</AlertTitle>
              <AlertDescription>{data.recommendation}</AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Competitor Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price Comparison</CardTitle>
          <CardDescription>How we compare to competitors</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                className="text-xs"
              />
              <YAxis
                label={{
                  value: "Price ($)",
                  angle: -90,
                  position: "insideLeft",
                }}
                className="text-xs"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-2 shadow-lg">
                      <p className="text-sm font-medium">{data.name}</p>
                      <p className="text-sm">${data.price.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="price">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Competitor Details */}
      <Card>
        <CardHeader>
          <CardTitle>Competitor Details</CardTitle>
          <CardDescription>
            Individual competitor pricing and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.competitors.map((comp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 border rounded-lg"
                data-testid={`competitor-${idx}`}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{comp.competitorName}</h4>
                  <p className="text-sm text-muted-foreground">
                    via {comp.source} • Updated{" "}
                    {new Date(comp.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">${comp.price.toFixed(2)}</p>
                    <Badge
                      variant={
                        parseFloat(comp.priceDifference) > 0
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {comp.priceDifference}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {data.aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Competitive Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {data.aiInsights.split("\n").map((paragraph, idx) => (
                <p key={idx} className="mb-2 text-sm">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

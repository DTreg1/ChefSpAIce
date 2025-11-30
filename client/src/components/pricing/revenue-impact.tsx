/**
 * Revenue Impact Component
 * 
 * Projects revenue impact of pricing changes.
 * Shows forecasts and potential outcomes.
 */

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Target, Info } from "lucide-react";

interface RevenueImpactProps {
  productId: string;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  projectedImpact: {
    revenue: string;
    conversionRate: string;
    demandChange: string;
  };
  confidence: number;
}

// Helper function to parse formatted numeric strings (e.g., "+$12.3K", "-5.2%")
const parseFormattedValue = (value: string): number => {
  if (typeof value !== 'string') return 0;
  
  // Remove currency symbols, spaces, and percent signs
  let cleaned = value.replace(/[$%\s]/g, '');
  
  // Handle K (thousands) and M (millions) suffixes
  if (cleaned.endsWith('K')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000 || 0;
  }
  if (cleaned.endsWith('M')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000000 || 0;
  }
  
  // Parse as regular number
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export function RevenueImpact({
  productId,
  productName,
  currentPrice,
  recommendedPrice,
  projectedImpact,
  confidence
}: RevenueImpactProps) {
  // Calculate price change percentage
  const priceChange = ((recommendedPrice - currentPrice) / currentPrice) * 100;
  
  // Parse impact values robustly
  const revenueImpact = parseFormattedValue(projectedImpact.revenue);
  const conversionImpact = parseFormattedValue(projectedImpact.conversionRate);
  const demandImpact = parseFormattedValue(projectedImpact.demandChange);

  // Generate projection data (30 days)
  const projectionData = useMemo(() => {
    const data: Array<{
      day: number;
      current: number;
      projected: number;
      optimistic: number;
      pessimistic: number;
      cumulative: number;
    }> = [];
    const baseRevenue = 1000; // Base daily revenue
    const days = 30;
    
    for (let i = 0; i <= days; i++) {
      // Gradual adoption curve
      const adoptionRate = 1 - Math.exp(-i / 10);
      const currentRevenue = baseRevenue;
      const projectedRevenue = baseRevenue * (1 + (revenueImpact / 100) * adoptionRate);
      const optimisticRevenue = baseRevenue * (1 + (revenueImpact / 100) * 1.2 * adoptionRate);
      const pessimisticRevenue = baseRevenue * (1 + (revenueImpact / 100) * 0.8 * adoptionRate);
      
      data.push({
        day: i,
        current: currentRevenue,
        projected: projectedRevenue,
        optimistic: optimisticRevenue,
        pessimistic: pessimisticRevenue,
        cumulative: data.length > 0 ? 
          data[data.length - 1].cumulative + projectedRevenue : 
          projectedRevenue
      });
    }
    
    return data;
  }, [revenueImpact]);

  // Calculate total impact over 30 days
  const totalCurrentRevenue = 30 * 1000;
  const totalProjectedRevenue = projectionData.reduce((sum, d) => sum + d.projected, 0);
  const totalImpactAmount = totalProjectedRevenue - totalCurrentRevenue;

  // Generate conversion funnel data
  const funnelData = [
    { stage: 'Views', current: 1000, projected: 1000 * (1 + demandImpact / 100) },
    { stage: 'Clicks', current: 200, projected: 200 * (1 + demandImpact / 100 * 0.8) },
    { stage: 'Cart Adds', current: 100, projected: 100 * (1 + demandImpact / 100 * 0.6) },
    { stage: 'Purchases', current: 50, projected: 50 * (1 + conversionImpact / 100) }
  ];

  // Determine impact severity
  const getImpactSeverity = (impact: number) => {
    if (impact > 10) return 'positive';
    if (impact > 0) return 'neutral';
    if (impact > -10) return 'warning';
    return 'negative';
  };

  const impactSeverity = getImpactSeverity(revenueImpact);

  return (
    <div className="space-y-6" data-testid="revenue-impact">
      {/* Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Impact Analysis</CardTitle>
          <CardDescription>
            Projected outcomes for {productName} price change
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Price Change Summary */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Price Change</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-medium">${currentPrice.toFixed(2)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-lg font-medium">${recommendedPrice.toFixed(2)}</span>
                </div>
              </div>
              <Badge 
                variant={priceChange > 0 ? "default" : "secondary"}
                className="text-lg px-3 py-1"
              >
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
              </Badge>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Revenue Impact</span>
                  {revenueImpact > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className={`text-xl font-bold ${revenueImpact > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {revenueImpact > 0 ? '+' : ''}{projectedImpact.revenue}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conversion Impact</span>
                  {conversionImpact > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className={`text-xl font-bold ${conversionImpact > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {conversionImpact > 0 ? '+' : ''}{projectedImpact.conversionRate}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Demand Impact</span>
                  {demandImpact > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className={`text-xl font-bold ${demandImpact > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {demandImpact > 0 ? '+' : ''}{projectedImpact.demandChange}
                </p>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Prediction Confidence</span>
                <span>{(confidence * 100).toFixed(0)}%</span>
              </div>
              <Progress value={confidence * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 30-Day Revenue Projection */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Revenue Projection</CardTitle>
          <CardDescription>
            Expected revenue trajectory with confidence bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                className="text-xs"
              />
              <YAxis 
                label={{ value: 'Daily Revenue ($)', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload) return null;
                  const data = payload[0]?.payload;
                  return (
                    <div className="bg-background border rounded-lg p-2 shadow-lg">
                      <p className="text-sm font-medium">Day {data.day}</p>
                      <p className="text-sm text-gray-600">Current: ${data.current.toFixed(0)}</p>
                      <p className="text-sm text-blue-600">Projected: ${data.projected.toFixed(0)}</p>
                      <p className="text-sm text-green-600">Optimistic: ${data.optimistic.toFixed(0)}</p>
                      <p className="text-sm text-yellow-600">Pessimistic: ${data.pessimistic.toFixed(0)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="optimistic"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.1}
                strokeWidth={0}
              />
              <Area
                type="monotone"
                dataKey="pessimistic"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.1}
                strokeWidth={0}
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="hsl(var(--muted-foreground))"
                fill="transparent"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">30-Day Impact</p>
                <p className="text-lg font-bold">
                  {totalImpactAmount > 0 ? '+' : ''}${totalImpactAmount.toFixed(0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Projected</p>
                <p className="text-lg font-bold">${totalProjectedRevenue.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel Impact</CardTitle>
          <CardDescription>
            How price changes affect the customer journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="stage" 
                className="text-xs"
              />
              <YAxis 
                className="text-xs"
              />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Current"
              />
              <Line 
                type="monotone" 
                dataKey="projected" 
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                name="Projected"
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Impact Alert */}
      {impactSeverity === 'positive' && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>Strong Positive Impact Expected:</strong> This price optimization shows 
            significant revenue potential with {projectedImpact.revenue} increase projected.
          </AlertDescription>
        </Alert>
      )}
      {impactSeverity === 'negative' && (
        <Alert variant="destructive">
          <TrendingDown className="h-4 w-4" />
          <AlertDescription>
            <strong>Negative Impact Warning:</strong> This price change may reduce revenue 
            by {projectedImpact.revenue}. Consider alternative strategies.
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Customer Sensitivity</span>
              <Badge variant={Math.abs(demandImpact) > 20 ? "destructive" : "secondary"}>
                {Math.abs(demandImpact) > 20 ? 'High' : 'Moderate'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Revenue Risk</span>
              <Badge variant={revenueImpact < -10 ? "destructive" : "secondary"}>
                {revenueImpact < -10 ? 'High' : revenueImpact < 0 ? 'Medium' : 'Low'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Implementation Complexity</span>
              <Badge variant="outline">Low</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Reversibility</span>
              <Badge variant="outline">High</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
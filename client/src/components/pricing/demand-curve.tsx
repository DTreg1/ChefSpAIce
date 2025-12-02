/**
 * Demand Curve Visualization Component
 *
 * Displays demand curve and price elasticity visualization.
 * Shows how demand changes with price adjustments.
 */

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

interface DemandCurveProps {
  productId: string;
  productName: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  elasticity?: number;
}

export function DemandCurve({
  productId,
  productName,
  basePrice,
  minPrice,
  maxPrice,
  elasticity = -1.5,
}: DemandCurveProps) {
  // Fetch historical demand data
  const { data: history, isLoading } = useQuery({
    queryKey: [API_ENDPOINTS.admin.pricing.rules, "history", productId],
    queryFn: async () => {
      const response = await fetch(
        `${API_ENDPOINTS.admin.pricing.rules}/history/${productId}?limit=30`,
      );
      if (!response.ok) throw new Error("Failed to fetch price history");
      return response.json();
    },
  });

  // Generate demand curve data
  const curveData = useMemo(() => {
    const points = [];
    const priceStep = (maxPrice - minPrice) / 20;

    for (let i = 0; i <= 20; i++) {
      const price = minPrice + priceStep * i;
      const priceChange = (price - basePrice) / basePrice;
      const demandChange = priceChange * elasticity;
      const demand = Math.max(0, 100 * (1 + demandChange));
      const revenue = price * demand;

      points.push({
        price: price.toFixed(2),
        demand: demand.toFixed(0),
        revenue: revenue.toFixed(0),
        isBase: Math.abs(price - basePrice) < priceStep / 2,
        profit: (((price - minPrice * 0.6) / price) * 100).toFixed(1), // Assume 40% cost
      });
    }

    return points;
  }, [minPrice, maxPrice, basePrice, elasticity]);

  // Process historical data for visualization
  const historicalData = useMemo(() => {
    if (!history?.history) return [];

    return history.history
      .slice(0, 15)
      .reverse()
      .map((h: any) => ({
        date: new Date(h.changedAt).toLocaleDateString(),
        price: h.price,
        demand: h.demandLevel || 50,
        inventory: h.inventoryLevel || 50,
        reason: h.changeReason,
      }));
  }, [history]);

  // Find optimal price (max revenue)
  const optimalPrice = useMemo(() => {
    const optimal = curveData.reduce((max, point) =>
      parseFloat(point.revenue) > parseFloat(max.revenue) ? point : max,
    );
    return optimal;
  }, [curveData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="demand-curve">
      {/* Demand Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Demand Curve Analysis</CardTitle>
          <CardDescription>
            Price elasticity and demand relationship for {productName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="flex gap-4">
              <Badge variant="outline">Current: ${basePrice.toFixed(2)}</Badge>
              <Badge variant="secondary">Optimal: ${optimalPrice.price}</Badge>
              <Badge
                variant={
                  parseFloat(optimalPrice.price) > basePrice
                    ? "default"
                    : "destructive"
                }
              >
                {parseFloat(optimalPrice.price) > basePrice ? "↑" : "↓"}
                {Math.abs(parseFloat(optimalPrice.price) - basePrice).toFixed(
                  2,
                )}
              </Badge>
              <Badge variant="outline">Elasticity: {elasticity}</Badge>
            </div>

            {/* Demand vs Price Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={curveData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="price"
                  label={{
                    value: "Price ($)",
                    position: "insideBottom",
                    offset: -5,
                  }}
                  className="text-xs"
                />
                <YAxis
                  yAxisId="demand"
                  label={{
                    value: "Demand (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  className="text-xs"
                />
                <YAxis
                  yAxisId="revenue"
                  orientation="right"
                  label={{
                    value: "Revenue ($)",
                    angle: 90,
                    position: "insideRight",
                  }}
                  className="text-xs"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="text-sm font-medium">
                          Price: ${data.price}
                        </p>
                        <p className="text-sm text-blue-600">
                          Demand: {data.demand}%
                        </p>
                        <p className="text-sm text-green-600">
                          Revenue: ${data.revenue}
                        </p>
                        <p className="text-sm text-gray-600">
                          Margin: {data.profit}%
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="demand"
                  type="monotone"
                  dataKey="demand"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                />
                <ReferenceLine
                  x={basePrice.toFixed(2)}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  label="Current"
                />
                <ReferenceLine
                  x={optimalPrice.price}
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="5 5"
                  label="Optimal"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Historical Price Performance */}
      {historicalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price History</CardTitle>
            <CardDescription>
              Recent price changes and their impact on demand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis
                  yAxisId="price"
                  label={{
                    value: "Price ($)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  className="text-xs"
                />
                <YAxis
                  yAxisId="metrics"
                  orientation="right"
                  label={{
                    value: "Score (%)",
                    angle: 90,
                    position: "insideRight",
                  }}
                  className="text-xs"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="text-sm font-medium">{data.date}</p>
                        <p className="text-sm">Price: ${data.price}</p>
                        <p className="text-sm text-blue-600">
                          Demand: {data.demand}%
                        </p>
                        <p className="text-sm text-yellow-600">
                          Inventory: {data.inventory}%
                        </p>
                        {data.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {data.reason}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="price"
                  dataKey="price"
                  fill="hsl(var(--chart-1))"
                  opacity={0.6}
                />
                <Line
                  yAxisId="metrics"
                  type="monotone"
                  dataKey="demand"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={true}
                />
                <Line
                  yAxisId="metrics"
                  type="monotone"
                  dataKey="inventory"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={true}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="flex gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm text-muted-foreground">Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-muted-foreground">Demand</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm text-muted-foreground">Inventory</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

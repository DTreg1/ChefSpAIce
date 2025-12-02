/**
 * Sentiment Trend Chart Component
 *
 * Displays sentiment trends over time using Recharts
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";

export interface TrendData {
  period: string;
  avgSentiment: number;
  count: number;
  positive?: number;
  negative?: number;
  neutral?: number;
  mixed?: number;
}

interface SentimentTrendChartProps {
  data: TrendData[];
  periodType?: "hour" | "day" | "week" | "month";
  title?: string;
  description?: string;
  height?: number;
  showCounts?: boolean;
  className?: string;
  onPeriodChange?: (period: string) => void;
}

export function SentimentTrendChart({
  data,
  periodType = "day",
  title = "Sentiment Trend",
  description,
  height = 300,
  showCounts = false,
  className,
  onPeriodChange,
}: SentimentTrendChartProps) {
  // Process data for chart display
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      period: formatPeriod(item.period, periodType),
      avgSentimentPercent: ((item.avgSentiment + 1) / 2) * 100, // Convert -1 to 1 scale to 0-100
      positivePercent: item.positive || 0,
      negativePercent: item.negative || 0,
      neutralPercent: item.neutral || 0,
    }));
  }, [data, periodType]);

  // Calculate overall trend
  const trend = useMemo(() => {
    if (data.length < 2) return "stable";
    const firstValue = data[0].avgSentiment;
    const lastValue = data[data.length - 1].avgSentiment;
    const diff = lastValue - firstValue;
    if (diff > 0.1) return "up";
    if (diff < -0.1) return "down";
    return "stable";
  }, [data]);

  const trendIcon = {
    up: (
      <TrendingUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
    ),
    down: (
      <TrendingDownIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
    ),
    stable: <MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
  };

  const trendLabel = {
    up: "Improving",
    down: "Declining",
    stable: "Stable",
  };

  function formatPeriod(period: string, type: string): string {
    const date = new Date(period);

    switch (type) {
      case "hour":
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      case "day":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      case "week":
        return `Week ${period.split("-W")[1]}`;
      case "month":
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      default:
        return period;
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Sentiment:</span>
              <Badge
                variant={
                  data.avgSentiment > 0
                    ? "default"
                    : data.avgSentiment < 0
                      ? "destructive"
                      : "secondary"
                }
              >
                {data.avgSentiment > 0 ? "+" : ""}
                {data.avgSentiment.toFixed(2)}
              </Badge>
            </div>
            {showCounts && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Analyzed:</span>
                <span className="text-xs font-medium">{data.count}</span>
              </div>
            )}
            {data.positive !== undefined && (
              <div className="pt-1 border-t space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Positive:
                  </span>
                  <span className="text-xs">{data.positive}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-red-600 dark:text-red-400">
                    Negative:
                  </span>
                  <span className="text-xs">{data.negative}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Neutral:
                  </span>
                  <span className="text-xs">{data.neutral}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge variant="outline" className="ml-2">
                {trendIcon[trend]}
                <span className="ml-1">{trendLabel[trend]}</span>
              </Badge>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {onPeriodChange && (
            <Select value={periodType} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-32" data-testid="period-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              vertical={false}
            />
            <XAxis
              dataKey="period"
              className="text-xs"
              tick={{ fill: "currentColor", fontSize: 12 }}
            />
            <YAxis
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tick={{ fill: "currentColor", fontSize: 12 }}
              label={{
                value: "Sentiment",
                angle: -90,
                position: "insideLeft",
                style: { fill: "currentColor", fontSize: 12 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="avgSentiment"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorPositive)"
              fillOpacity={1}
              data-testid="sentiment-trend-line"
            />
            {showCounts && (
              <Line
                type="monotone"
                dataKey="count"
                stroke="#9333ea"
                strokeWidth={1}
                strokeDasharray="5 5"
                yAxisId="right"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

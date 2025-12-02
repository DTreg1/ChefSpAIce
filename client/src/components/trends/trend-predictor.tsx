import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Trend {
  id: string;
  trendName: string;
  trendType: string;
  strength: number;
  confidence: number;
  growthRate: number;
  dataPoints?: any;
}

interface TrendPredictorProps {
  currentTrends: Trend[];
  historicalData?: any;
}

export function TrendPredictor({
  currentTrends,
  historicalData,
}: TrendPredictorProps) {
  // Generate prediction data based on current trends
  const generatePredictions = () => {
    const predictions = currentTrends.map((trend) => {
      // Simple linear projection
      const currentValue = trend.strength * 100;
      const growthFactor = trend.growthRate / 100;

      // Generate future data points
      const futurePoints: any[] = [];
      let value = currentValue;

      for (let i = 1; i <= 7; i++) {
        value = value * (1 + growthFactor * Math.exp(-i * 0.1)); // Decay growth over time
        futurePoints.push({
          day: `Day ${i}`,
          predicted: Math.round(value),
          confidence: Math.round(trend.confidence * 100 * Math.exp(-i * 0.05)),
        });
      }

      return {
        trend,
        prediction: {
          nextWeekGrowth: Math.round(
            ((value - currentValue) / currentValue) * 100,
          ),
          peakDay:
            futurePoints.reduce(
              (max, p, i) =>
                p.predicted > futurePoints[max].predicted ? i : max,
              0,
            ) + 1,
          confidence: trend.confidence,
          futurePoints,
        },
      };
    });

    return predictions.slice(0, 5); // Top 5 predictions
  };

  const predictions = generatePredictions();

  // Aggregate chart data
  const chartData =
    predictions.length > 0
      ? predictions[0].prediction.futurePoints.map((point, index) => ({
          day: point.day,
          ...predictions.reduce(
            (acc, p) => ({
              ...acc,
              [p.trend.trendName]:
                p.prediction.futurePoints[index]?.predicted || 0,
            }),
            {},
          ),
        }))
      : [];

  // Identify opportunities
  const opportunities = predictions
    .filter(
      (p) => p.prediction.nextWeekGrowth > 50 && p.prediction.confidence > 0.6,
    )
    .map((p) => ({
      title: `${p.trend.trendName} opportunity`,
      description: `Expected ${p.prediction.nextWeekGrowth}% growth in the next week`,
      action: "Increase focus on this area",
      urgency: p.prediction.peakDay <= 3 ? "high" : "medium",
    }));

  // Risk alerts
  const risks = currentTrends
    .filter((t) => t.growthRate < -20)
    .map((t) => ({
      title: `Declining trend: ${t.trendName}`,
      description: `${Math.abs(t.growthRate)}% decline detected`,
      action: "Consider intervention strategies",
      urgency: t.strength > 0.5 ? "high" : "low",
    }));

  return (
    <div className="space-y-4">
      {/* Prediction Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Predicted Growth
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictions.length > 0
                ? `+${Math.round(predictions.reduce((sum, p) => sum + p.prediction.nextWeekGrowth, 0) / predictions.length)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average 7-day forecast
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
            <p className="text-xs text-muted-foreground">
              High-growth potential areas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{risks.length}</div>
            <p className="text-xs text-muted-foreground">
              Areas needing attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prediction Chart */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              7-Day Trend Forecast
            </CardTitle>
            <CardDescription>
              AI-powered predictions based on current trend momentum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                {predictions.slice(0, 3).map((p, index) => (
                  <Area
                    key={p.trend.id}
                    type="monotone"
                    dataKey={p.trend.trendName}
                    stroke={`hsl(${index * 120}, 70%, 50%)`}
                    fill={`hsl(${index * 120}, 70%, 50%)`}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Growth Opportunities
            </CardTitle>
            <CardDescription>
              Recommended actions based on trend predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunities.map((opp, index) => (
                <Alert key={index} className="hover-elevate">
                  <Target className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    {opp.title}
                    <Badge
                      variant={
                        opp.urgency === "high" ? "destructive" : "secondary"
                      }
                      className="ml-2"
                    >
                      {opp.urgency} priority
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <p>{opp.description}</p>
                    <p className="font-medium mt-2">
                      Recommended: {opp.action}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Alerts */}
      {risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Alerts
            </CardTitle>
            <CardDescription>
              Declining trends requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risks.map((risk, index) => (
                <Alert
                  key={index}
                  variant="destructive"
                  className="hover-elevate"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{risk.title}</AlertTitle>
                  <AlertDescription>
                    <p>{risk.description}</p>
                    <p className="font-medium mt-2">Action: {risk.action}</p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Trend Predictions */}
      <div className="grid gap-4 md:grid-cols-2">
        {predictions.map(({ trend, prediction }) => (
          <Card key={trend.id} className="hover-elevate">
            <CardHeader>
              <CardTitle className="text-lg">{trend.trendName}</CardTitle>
              <CardDescription>
                Current strength: {(trend.strength * 100).toFixed(0)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Predicted Growth
                  </span>
                  <span className="font-bold text-lg">
                    {prediction.nextWeekGrowth > 0 ? "+" : ""}
                    {prediction.nextWeekGrowth}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Peak Expected
                  </span>
                  <span className="font-medium">Day {prediction.peakDay}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">
                      Confidence
                    </span>
                    <span className="text-sm">
                      {(prediction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={prediction.confidence * 100}
                    className="h-2"
                  />
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  View Details
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Predictions Message */}
      {predictions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-12 h-12 mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              No Predictions Available
            </h3>
            <p className="text-muted-foreground mb-4">
              Run trend analysis first to generate AI-powered predictions
            </p>
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analyze Trends
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

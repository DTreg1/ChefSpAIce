import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Calculator,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  type AbTest,
  type AbTestVariantMetric,
  type AbTestInsight,
} from "@shared/schema";

interface TestWithDetails extends AbTest {
  variantMetrics?: AbTestVariantMetric[];
  insights?: AbTestInsight[];
}

interface SignificanceCalculatorProps {
  test: TestWithDetails;
}

export default function SignificanceCalculator({
  test,
}: SignificanceCalculatorProps) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<any>(null);

  const latestMetric = test.variantMetrics?.[0];

  useEffect(() => {
    setAnalysis(null);
  }, [test.id, test]);

  const analyzeTest = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/ab/analyze", "POST", { testId: test.id });
    },
    onSuccess: (data) => {
      setAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ab"] });
      toast({
        title: "Analysis complete",
        description: "Statistical significance has been calculated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze test",
        variant: "destructive",
      });
    },
  });

  const significanceData = analysis?.significance || latestMetric;
  const metricData = analysis?.insights || latestMetric;

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.99)
      return {
        label: "Very High",
        color: "text-green-600 dark:text-green-400",
      };
    if (confidence >= 0.95)
      return { label: "High", color: "text-green-600 dark:text-green-400" };
    if (confidence >= 0.9)
      return {
        label: "Moderate",
        color: "text-yellow-600 dark:text-yellow-400",
      };
    return { label: "Low", color: "text-red-600 dark:text-red-400" };
  };

  const chartData = significanceData
    ? [
        {
          name: "Variant A",
          "Conversion Rate": (significanceData.conversionRateA || 0) * 100,
          "Sample Size": significanceData.sampleSizeA || 0,
        },
        {
          name: "Variant B",
          "Conversion Rate": (significanceData.conversionRateB || 0) * 100,
          "Sample Size": significanceData.sampleSizeB || 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Statistical Significance
              </CardTitle>
              <CardDescription>
                Analyze test results for statistical confidence
              </CardDescription>
            </div>
            <Button
              onClick={() => analyzeTest.mutate()}
              disabled={analyzeTest.isPending}
              data-testid="button-analyze"
            >
              {analyzeTest.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {analyzeTest.isPending ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {metricData && (
            <>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard
                  label="P-Value"
                  value={(metricData.pValue || 0).toFixed(4)}
                  description="Statistical significance"
                  highlight={metricData.pValue && metricData.pValue < 0.05}
                />
                <MetricCard
                  label="Confidence"
                  value={`${((metricData.confidence || 0) * 100).toFixed(1)}%`}
                  description={
                    getConfidenceLevel(metricData.confidence || 0).label
                  }
                  className={
                    getConfidenceLevel(metricData.confidence || 0).color
                  }
                />
                <MetricCard
                  label="Conversion Rate"
                  value={`${((metricData.conversionRate || 0) * 100).toFixed(1)}%`}
                  description="Performance metric"
                  highlight={
                    metricData.conversionRate && metricData.conversionRate > 0.1
                  }
                />
                <MetricCard
                  label="Result"
                  value={
                    metricData.isSignificant
                      ? metricData.variant
                      : "Inconclusive"
                  }
                  description={metricData.recommendation || "Continue testing"}
                  highlight={metricData.isSignificant}
                />
              </div>

              {/* Confidence Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Statistical Confidence
                  </span>
                  <span className="font-medium">
                    {((metricData.confidence || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={(metricData.confidence || 0) * 100}
                  className="h-3"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>95% (Target)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">
                    Conversion Rate Comparison
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Conversion Rate" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recommendation */}
              {metricData.recommendation && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Recommendation</p>
                      <p className="text-sm">{metricData.recommendation}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Significance Status */}
              {metricData.isSignificant && (
                <div className="space-y-3">
                  <h3 className="font-medium">Key Findings</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">
                        {metricData.variant} shows statistically significant
                        improvement
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">
                        Confidence level:{" "}
                        {((metricData.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings for inconclusive tests */}
              {!metricData.isSignificant &&
                metricData.sampleSize &&
                metricData.sampleSize < 100 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Important Considerations</p>
                        <p className="text-sm">
                          Sample size ({metricData.sampleSize}) may be too small
                          for reliable results. Continue testing to gather more
                          data.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
            </>
          )}

          {!metricData && !analyzeTest.isPending && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Click "Run Analysis" to calculate statistical significance and
                get AI-powered insights for this test.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  description?: string;
  highlight?: boolean;
  className?: string;
}

function MetricCard({
  label,
  value,
  description,
  highlight,
  className,
}: MetricCardProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`text-2xl font-bold ${highlight ? "text-primary" : ""} ${className || ""}`}
        data-testid={`text-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {value}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, DollarSign, Clock, Target, Activity } from "lucide-react";
import { type AbTest, type AbTestResult } from "@shared/schema";

interface TestWithDetails extends AbTest {
  results?: AbTestResult[];
  aggregated?: {
    variantA: AbTestResult;
    variantB: AbTestResult;
  };
}

interface VariantComparisonProps {
  test: TestWithDetails;
}

export default function VariantComparison({ test }: VariantComparisonProps) {
  const { aggregated } = test;

  if (!aggregated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variant Comparison</CardTitle>
          <CardDescription>No data available yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const conversionRateA = aggregated.variantA.visitors > 0 
    ? (aggregated.variantA.conversions / aggregated.variantA.visitors) * 100 
    : 0;
  const conversionRateB = aggregated.variantB.visitors > 0 
    ? (aggregated.variantB.conversions / aggregated.variantB.visitors) * 100 
    : 0;

  const revenuePerVisitorA = aggregated.variantA.visitors > 0 
    ? aggregated.variantA.revenue / aggregated.variantA.visitors 
    : 0;
  const revenuePerVisitorB = aggregated.variantB.visitors > 0 
    ? aggregated.variantB.revenue / aggregated.variantB.visitors 
    : 0;

  const getVariantColor = (isWinner: boolean) => {
    return isWinner ? "text-green-600 dark:text-green-400" : "";
  };

  const isVariantBWinner = conversionRateB > conversionRateA;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variant Comparison</CardTitle>
        <CardDescription>Side-by-side performance metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variant A */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Variant A</Badge>
              <span className="text-sm font-medium">{test.variantA}</span>
            </div>
            {!isVariantBWinner && conversionRateA > 0 && (
              <Badge variant="default">Leading</Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Visitors"
              value={aggregated.variantA.visitors.toLocaleString()}
              className={getVariantColor(!isVariantBWinner)}
            />
            <MetricCard
              icon={<Target className="h-4 w-4" />}
              label="Conversions"
              value={aggregated.variantA.conversions.toLocaleString()}
              className={getVariantColor(!isVariantBWinner)}
            />
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label="Conversion Rate"
              value={`${conversionRateA.toFixed(2)}%`}
              className={getVariantColor(!isVariantBWinner)}
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Revenue/Visitor"
              value={`$${revenuePerVisitorA.toFixed(2)}`}
              className={getVariantColor(!isVariantBWinner)}
            />
          </div>

          <Progress value={conversionRateA} className="h-2" />
        </div>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">vs</span>
          </div>
        </div>

        {/* Variant B */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Variant B</Badge>
              <span className="text-sm font-medium">{test.variantB}</span>
            </div>
            {isVariantBWinner && conversionRateB > 0 && (
              <Badge variant="default">Leading</Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Visitors"
              value={aggregated.variantB.visitors.toLocaleString()}
              className={getVariantColor(isVariantBWinner)}
            />
            <MetricCard
              icon={<Target className="h-4 w-4" />}
              label="Conversions"
              value={aggregated.variantB.conversions.toLocaleString()}
              className={getVariantColor(isVariantBWinner)}
            />
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label="Conversion Rate"
              value={`${conversionRateB.toFixed(2)}%`}
              className={getVariantColor(isVariantBWinner)}
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Revenue/Visitor"
              value={`$${revenuePerVisitorB.toFixed(2)}`}
              className={getVariantColor(isVariantBWinner)}
            />
          </div>

          <Progress value={conversionRateB} className="h-2" />
        </div>

        {/* Lift Summary */}
        {(conversionRateA > 0 || conversionRateB > 0) && (
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Performance Lift</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {conversionRateA > 0 
                    ? `${(((conversionRateB - conversionRateA) / conversionRateA) * 100).toFixed(1)}%`
                    : "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isVariantBWinner ? "Variant B is winning" : "Variant A is winning"}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}

function MetricCard({ icon, label, value, className }: MetricCardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-xl font-semibold ${className || ""}`} data-testid={`text-${label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
        {value}
      </div>
    </div>
  );
}
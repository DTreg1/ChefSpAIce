import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type AbTest, type AbTestVariantMetric } from "@shared/schema";

interface TestWithDetails extends AbTest {
  variantMetrics?: AbTestVariantMetric[];
}

interface RecommendationCardProps {
  test: TestWithDetails;
  onImplement: () => void;
}

export default function RecommendationCard({
  test,
  onImplement,
}: RecommendationCardProps) {
  const { toast } = useToast();
  const latestMetric = test.variantMetrics?.[0];

  const implementWinner = useMutation({
    mutationFn: async (variant: "A" | "B") => {
      return apiRequest("/api/ab/implement", "POST", {
        testId: test.id,
        variant,
      });
    },
    onSuccess: () => {
      toast({
        title: "Winner implemented",
        description: "The winning variant has been implemented successfully",
      });
      onImplement();
    },
    onError: (error: Error) => {
      toast({
        title: "Implementation failed",
        description: error.message || "Failed to implement winner",
        variant: "destructive",
      });
    },
  });

  const getRecommendationType = () => {
    if (!latestMetric?.recommendation) return null;
    const rec = latestMetric.recommendation.toLowerCase();
    if (rec.includes("implement")) return "implement";
    if (rec.includes("continue")) return "continue";
    if (rec.includes("stop")) return "stop";
    return null;
  };

  const recommendationType = getRecommendationType();

  const getRecommendationIcon = () => {
    if (!latestMetric)
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;

    switch (recommendationType) {
      case "implement":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "continue":
        return <Zap className="h-5 w-5 text-blue-500" />;
      case "stop":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getRecommendationColor = () => {
    if (!latestMetric) return "secondary";

    switch (recommendationType) {
      case "implement":
        return "default";
      case "continue":
        return "secondary";
      case "stop":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getLiftIcon = () => {
    if (!latestMetric?.conversionRate) return null;

    const baseline = 0.1;
    return latestMetric.conversionRate > baseline ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Card data-testid={`card-recommendation-${test.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{test.testName}</CardTitle>
            <CardDescription>
              Control vs{" "}
              {test.configuration?.variants?.[0]?.name || "Variant B"}
            </CardDescription>
          </div>
          {getRecommendationIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestMetric && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Confidence</p>
              <p className="font-medium text-lg">
                {latestMetric.confidence
                  ? `${(latestMetric.confidence * 100).toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Conversion Rate</p>
              <div className="flex items-center gap-1">
                {getLiftIcon()}
                <span className="font-medium text-lg">
                  {(latestMetric.conversionRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {latestMetric?.isSignificant && (
          <div className="flex items-center gap-2">
            <Badge variant={getRecommendationColor()}>
              {latestMetric.variant} Shows Significance
            </Badge>
            <Badge variant="outline">{recommendationType || "Review"}</Badge>
          </div>
        )}

        {latestMetric?.recommendation && (
          <Alert className="border-0 bg-muted">
            <AlertDescription className="text-sm">
              {latestMetric.recommendation}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {latestMetric?.isSignificant && recommendationType === "implement" && (
          <Button
            className="w-full"
            onClick={() =>
              implementWinner.mutate(
                latestMetric.variant === "control" ? "A" : "B",
              )
            }
            disabled={implementWinner.isPending}
            data-testid={`button-implement-${test.id}`}
          >
            {implementWinner.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Implement {latestMetric.variant}
          </Button>
        )}
        {recommendationType === "continue" && (
          <Button className="w-full" variant="secondary" disabled>
            Continue Testing
          </Button>
        )}
        {recommendationType === "stop" && (
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => {
              toast({
                title: "Test stopped",
                description: "This test has been marked as stopped",
              });
            }}
            data-testid={`button-stop-${test.id}`}
          >
            Stop Test
          </Button>
        )}
        {!latestMetric && (
          <Button className="w-full" variant="outline" disabled>
            Awaiting Analysis
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

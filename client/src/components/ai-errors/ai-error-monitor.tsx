/**
 * AI Error Monitor Dashboard
 *
 * Dashboard component for monitoring AI service errors and metrics
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  WifiOff,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { errorCodeToIcon, getErrorTitle } from "@/hooks/use-ai-error-handler";

interface ErrorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorsByCode: Record<string, number>;
  recentErrors: ErrorLog[];
  circuitBreakerStatus: CircuitStatus;
}

interface ErrorLog {
  id: string;
  timestamp: Date;
  code: string;
  message: string;
  endpoint: string;
  retryable: boolean;
  resolved: boolean;
  retryCount: number;
}

interface CircuitStatus {
  state: "closed" | "open" | "half-open";
  failures: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

export function AIErrorMonitor() {
  // Fetch metrics with proper type
  const {
    data: metrics,
    isLoading,
    refetch,
  } = useQuery<ErrorMetrics>({
    queryKey: ["/api/admin/ai-metrics"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    select: (data) => {
      // Parse ISO string timestamps to Date objects
      return {
        ...data,
        recentErrors:
          data.recentErrors?.map((error) => ({
            ...error,
            timestamp:
              typeof error.timestamp === "string"
                ? parseISO(error.timestamp)
                : error.timestamp,
          })) || [],
        circuitBreakerStatus: {
          ...data.circuitBreakerStatus,
          lastFailureTime: data.circuitBreakerStatus?.lastFailureTime
            ? typeof data.circuitBreakerStatus.lastFailureTime === "string"
              ? parseISO(data.circuitBreakerStatus.lastFailureTime)
              : data.circuitBreakerStatus.lastFailureTime
            : undefined,
          nextAttemptTime: data.circuitBreakerStatus?.nextAttemptTime
            ? typeof data.circuitBreakerStatus.nextAttemptTime === "string"
              ? parseISO(data.circuitBreakerStatus.nextAttemptTime)
              : data.circuitBreakerStatus.nextAttemptTime
            : undefined,
        },
      };
    },
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState("1h");

  const successRate = metrics?.successRate || 0;
  const isHealthy = successRate >= 95;
  const isWarning = successRate >= 85 && successRate < 95;
  const isCritical = successRate < 85;

  return (
    <div className="space-y-6" data-testid="container-error-monitor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Service Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of AI service health and errors
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-metrics"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Success Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {successRate.toFixed(1)}%
              </span>
              {isHealthy && <CheckCircle className="h-5 w-5 text-green-500" />}
              {isWarning && <AlertCircle className="h-5 w-5 text-yellow-500" />}
              {isCritical && <AlertCircle className="h-5 w-5 text-red-500" />}
            </div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        {/* Total Requests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {metrics?.totalRequests || 0}
              </span>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last {selectedTimeRange}
            </p>
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {((metrics?.averageResponseTime || 0) / 1000).toFixed(2)}s
              </span>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(metrics?.averageResponseTime || 0) > 3000
                ? "Slower than usual"
                : "Normal"}
            </p>
          </CardContent>
        </Card>

        {/* Circuit Breaker Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Circuit Breaker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  metrics?.circuitBreakerStatus?.state === "closed"
                    ? "default"
                    : metrics?.circuitBreakerStatus?.state === "half-open"
                      ? "secondary"
                      : "destructive"
                }
              >
                {metrics?.circuitBreakerStatus?.state || "closed"}
              </Badge>
              <Zap
                className={`h-5 w-5 ${
                  metrics?.circuitBreakerStatus?.state === "open"
                    ? "text-red-500"
                    : "text-green-500"
                }`}
              />
            </div>
            {metrics?.circuitBreakerStatus?.nextAttemptTime && (
              <p className="text-xs text-muted-foreground mt-2">
                Next attempt in{" "}
                {formatDistanceToNow(
                  metrics.circuitBreakerStatus.nextAttemptTime,
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="errors" className="w-full">
        <TabsList>
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
          <TabsTrigger value="distribution">Error Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Recent Errors */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Last 50 errors from AI service calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {metrics?.recentErrors?.map((error: ErrorLog) => (
                    <div
                      key={error.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`error-log-${error.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {errorCodeToIcon[error.code] || "❓"}
                        </span>
                        <div>
                          <div className="font-medium">
                            {getErrorTitle(error.code)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {error.message}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {error.endpoint}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(error.timestamp, {
                                addSuffix: true,
                              })}
                            </span>
                            {error.retryCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {error.retryCount} retries
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {error.resolved ? (
                          <Badge variant="default" className="text-xs">
                            Resolved
                          </Badge>
                        ) : error.retryable ? (
                          <Badge variant="secondary" className="text-xs">
                            Retryable
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {!metrics?.recentErrors?.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      No errors recorded in the selected time range
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Distribution */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Distribution</CardTitle>
              <CardDescription>Breakdown of errors by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics?.errorsByCode || {}).map(
                  ([code, count]) => {
                    const percentage =
                      ((count as number) / (metrics?.failedRequests || 1)) *
                      100;
                    return (
                      <div key={code} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{errorCodeToIcon[code] || "❓"}</span>
                            <span className="font-medium">
                              {getErrorTitle(code)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{count}</span>
                            <span className="text-xs text-muted-foreground">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  },
                )}

                {!Object.keys(metrics?.errorsByCode || {}).length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No error distribution data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Trends</CardTitle>
              <CardDescription>Performance trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Success rate trend */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Success Rate Trend</div>
                    <div className="text-sm text-muted-foreground">
                      Compared to previous period
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {successRate >= 95 ? (
                      <>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium text-green-500">
                          Improving
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-red-500">
                          Declining
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Response time trend */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Response Time Trend</div>
                    <div className="text-sm text-muted-foreground">
                      Average over last hour
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {((metrics?.averageResponseTime || 0) / 1000).toFixed(2)}s
                      avg
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

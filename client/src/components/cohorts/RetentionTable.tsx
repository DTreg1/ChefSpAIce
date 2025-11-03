import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Users, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Cohort } from "@shared/schema";

interface RetentionData {
  cohortId: string;
  retention: Array<{
    period: number;
    rate: number;
    count: number;
  }>;
}

interface RetentionTableProps {
  cohorts: Cohort[];
  periods?: number[];
}

export function RetentionTable({ cohorts, periods = [0, 1, 7, 14, 30, 60, 90] }: RetentionTableProps) {
  const retentionQueries = useQuery({
    queryKey: ["/api/cohorts/retention", cohorts.map(c => c.id), periods],
    queryFn: async () => {
      const retentionData = await Promise.all(
        cohorts.map(async (cohort) => {
          const response = await fetch(`/api/cohorts/${cohort.id}/retention`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ periods }),
          });
          const data = await response.json();
          return { ...data.retention, cohortName: cohort.name, cohortDate: cohort.createdAt };
        })
      );
      return retentionData;
    },
    enabled: cohorts.length > 0,
  });
  
  const getHeatmapColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500 dark:bg-green-600";
    if (rate >= 60) return "bg-green-400 dark:bg-green-500";
    if (rate >= 40) return "bg-yellow-400 dark:bg-yellow-500";
    if (rate >= 20) return "bg-orange-400 dark:bg-orange-500";
    if (rate >= 10) return "bg-red-400 dark:bg-red-500";
    return "bg-red-500 dark:bg-red-600";
  };
  
  const getTextColor = (rate: number) => {
    return rate >= 50 ? "text-white" : "text-foreground";
  };
  
  const formatPeriodLabel = (period: number) => {
    if (period === 0) return "Day 0";
    if (period === 1) return "Day 1";
    if (period === 7) return "Week 1";
    if (period === 14) return "Week 2";
    if (period === 30) return "Month 1";
    if (period === 60) return "Month 2";
    if (period === 90) return "Month 3";
    return `Day ${period}`;
  };
  
  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 1) return null;
    
    return diff > 0 ? (
      <TrendingUp className="h-3 w-3 text-green-500" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-500" />
    );
  };
  
  if (!cohorts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Retention Heatmap
          </CardTitle>
          <CardDescription>
            No cohorts selected. Create or select cohorts to view retention analysis.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (retentionQueries.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Retention Data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (retentionQueries.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {(retentionQueries.error as Error).message}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const retentionData = retentionQueries.data || [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Retention Heatmap
        </CardTitle>
        <CardDescription>
          User retention rates across different cohorts and time periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Cohort</th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>Users</span>
                  </div>
                </th>
                {periods.map((period) => (
                  <th key={period} className="text-center py-3 px-2 font-medium text-sm">
                    {formatPeriodLabel(period)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort, cohortIndex) => {
                const cohortRetention = retentionData[cohortIndex];
                const baseCount = cohortRetention?.retention?.find(r => r.period === 0)?.count || cohort.userCount || 100;
                
                return (
                  <tr key={cohort.id} className="border-b" data-testid={`row-cohort-${cohort.id}`}>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="font-medium">{cohort.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(cohort.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="secondary">
                        {baseCount}
                      </Badge>
                    </td>
                    {periods.map((period, periodIndex) => {
                      const retentionPoint = cohortRetention?.retention?.find(r => r.period === period);
                      const rate = retentionPoint?.rate || 0;
                      const count = retentionPoint?.count || 0;
                      const previousPoint = periodIndex > 0 ? 
                        cohortRetention?.retention?.find(r => r.period === periods[periodIndex - 1]) : 
                        null;
                      
                      return (
                        <td key={period} className="text-center py-2 px-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`
                                    rounded-md px-2 py-1.5 text-xs font-medium cursor-pointer
                                    transition-all hover:scale-105 hover:shadow-md
                                    ${getHeatmapColor(rate)} ${getTextColor(rate)}
                                  `}
                                  data-testid={`cell-${cohort.id}-${period}`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    {period === 0 ? "100%" : `${rate.toFixed(1)}%`}
                                    {getTrendIcon(rate, previousPoint?.rate)}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">{cohort.name}</p>
                                  <p>{formatPeriodLabel(period)}</p>
                                  <p className="text-sm">
                                    {count} of {baseCount} users
                                  </p>
                                  <p className="text-sm font-medium">
                                    {rate.toFixed(1)}% retention
                                  </p>
                                  {previousPoint && (
                                    <p className="text-xs text-muted-foreground">
                                      {rate > previousPoint.rate ? "+" : ""}{(rate - previousPoint.rate).toFixed(1)}% from {formatPeriodLabel(periods[periodIndex - 1])}
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Retention Rate Legend</p>
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-xs">80%+</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-green-400" />
                <span className="text-xs">60-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-yellow-400" />
                <span className="text-xs">40-60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-orange-400" />
                <span className="text-xs">20-40%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-red-400" />
                <span className="text-xs">10-20%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-xs">&lt;10%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
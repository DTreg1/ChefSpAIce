import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown, AlertCircle, Activity } from "lucide-react";
import type { AnalyticsInsight } from "@shared/schema";
import { cn } from "@/lib/utils";

interface InsightDigestProps {
  insights: AnalyticsInsight[];
  date?: string;
}

export function InsightDigest({ insights, date }: InsightDigestProps) {
  const groupedByCategory = insights.reduce((acc, insight) => {
    const category = insight.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(insight);
    return acc;
  }, {} as Record<string, AnalyticsInsight[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "trend":
        return <Activity className="w-4 h-4" />;
      case "anomaly":
        return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "prediction":
        return <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Today";
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  return (
    <Card data-testid="card-insight-digest">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Daily Insights Digest</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(date)}
            </CardDescription>
          </div>
          <Badge variant="outline" data-testid="text-total-insights">
            {insights.length} insights
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, categoryInsights]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 pb-1">
                  {getCategoryIcon(category)}
                  <h4 className="text-sm font-medium capitalize">
                    {category === "anomaly" ? "Anomalies" : 
                     category === "trend" ? "Trends" :
                     category === "prediction" ? "Predictions" :
                     category === "comparison" ? "Comparisons" : "Other"}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {categoryInsights.length}
                  </Badge>
                </div>
                
                <div className="space-y-2 pl-6">
                  {categoryInsights.slice(0, 3).map((insight) => (
                    <div 
                      key={insight.id} 
                      className="pb-2 border-b last:border-b-0"
                      data-testid={`digest-item-${insight.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {insight.title.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                        {insight.metrics?.percentageChange !== undefined && (
                          <div className={cn(
                            "flex items-center gap-1 text-sm font-medium",
                            insight.metrics.percentageChange > 0 ? "text-green-600 dark:text-green-400" : 
                            insight.metrics.percentageChange < 0 ? "text-red-600 dark:text-red-400" : 
                            "text-muted-foreground"
                          )}>
                            {insight.metrics.percentageChange > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : insight.metrics.percentageChange < 0 ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : null}
                            {Math.abs(insight.metrics.percentageChange).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      {insight.recommendations && insight.recommendations.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs text-muted-foreground">
                            💡 {insight.recommendations[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {categoryInsights.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-2">
                      +{categoryInsights.length - 3} more {category} insights
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {insights.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No insights for this period</p>
                <p className="text-xs mt-1">Check back later for new insights</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
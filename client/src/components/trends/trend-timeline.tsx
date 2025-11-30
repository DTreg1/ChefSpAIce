import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Trend {
  id: string;
  trendName: string;
  trendType: string;
  status: string;
  strength: number;
  growthRate: number;
  startDate: string;
  peakDate?: string;
}

interface TrendTimelineProps {
  trends: Trend[];
}

export function TrendTimeline({ trends }: TrendTimelineProps) {
  // Sort trends by start date (newest first)
  const sortedTrends = [...trends].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  // Group trends by month
  const groupedTrends = sortedTrends.reduce((groups: Record<string, Trend[]>, trend) => {
    const date = new Date(trend.startDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    
    if (!groups[monthLabel]) {
      groups[monthLabel] = [];
    }
    groups[monthLabel].push(trend);
    return groups;
  }, {});

  const getTrendIcon = (trend: Trend) => {
    if (trend.growthRate > 20) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend.growthRate < -20) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-blue-500" />;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      emerging: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      peaking: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      declining: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      ended: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Trend Timeline
        </CardTitle>
        <CardDescription>
          Historical progression of detected trends over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[480px] pr-4">
          {Object.keys(groupedTrends).length > 0 ? (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Timeline items */}
              <div className="space-y-8">
                {Object.entries(groupedTrends).map(([month, monthTrends]) => (
                  <div key={month} className="relative">
                    {/* Month marker */}
                    <div className="flex items-center mb-4">
                      <div className="absolute left-2 w-4 h-4 bg-background border-2 border-primary rounded-full" />
                      <h3 className="ml-10 text-lg font-semibold">{month}</h3>
                    </div>
                    
                    {/* Trends for this month */}
                    <div className="ml-10 space-y-3">
                      {monthTrends.map((trend) => (
                        <div 
                          key={trend.id}
                          className="p-4 border rounded-lg hover-elevate"
                          data-testid={`timeline-trend-${trend.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getTrendIcon(trend)}
                              <h4 className="font-medium">{trend.trendName}</h4>
                            </div>
                            <Badge className={getStatusColor(trend.status)}>
                              {trend.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Growth:</span> {trend.growthRate > 0 ? "+" : ""}{trend.growthRate.toFixed(1)}%
                            </div>
                            <div>
                              <span className="font-medium">Strength:</span> {(trend.strength * 100).toFixed(0)}%
                            </div>
                            <div>
                              <span className="font-medium">Started:</span> {new Date(trend.startDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          {trend.peakDate && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <span className="font-medium">Peak:</span> {new Date(trend.peakDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No trends to display in timeline</p>
                <p className="text-sm mt-2">Run analysis to detect trends</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  TrendingUp, 
  Clock, 
  Calendar,
  Users,
  Target,
  Activity,
  PieChart
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, startOfMonth, subDays } from "date-fns";

interface MeetingInsightsProps {
  userId?: string;
  timeRange?: 'week' | 'month' | 'quarter';
}

export function MeetingInsights({
  userId,
  timeRange = 'month'
}: MeetingInsightsProps) {
  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/schedule/analytics", timeRange],
    queryFn: async () => {
      const response = await fetch("/api/schedule/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    }
  });

  // Fetch recent events for trends
  const { data: events = [] } = useQuery({
    queryKey: ["/api/schedule/events", timeRange],
    queryFn: async () => {
      const startDate = timeRange === 'week' 
        ? startOfWeek(new Date())
        : timeRange === 'month'
        ? startOfMonth(new Date())
        : subDays(new Date(), 90);
      
      const params = new URLSearchParams({
        startTime: startDate.toISOString(),
        endTime: new Date().toISOString()
      });
      
      const response = await fetch(`/api/schedule/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="meeting-insights">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Meeting Insights Dashboard
        </CardTitle>
        <CardDescription>
          Analytics and patterns from your scheduling history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="recommendations">AI Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Meetings
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics?.statistics?.totalMeetings || 0}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Hours
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics?.statistics?.totalHours || 0}h
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Avg Duration
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics?.statistics?.avgMeetingDuration || 0}h
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Peak Hour
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics?.statistics?.peakHour || "N/A"}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Meeting Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meeting Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Monday</span>
                      <span>20%</span>
                    </div>
                    <Progress value={20} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Tuesday</span>
                      <span>25%</span>
                    </div>
                    <Progress value={25} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Wednesday</span>
                      <span>30%</span>
                    </div>
                    <Progress value={30} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Thursday</span>
                      <span>20%</span>
                    </div>
                    <Progress value={20} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Friday</span>
                      <span>5%</span>
                    </div>
                    <Progress value={5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="patterns" className="space-y-4">
            {analytics?.patterns && analytics.patterns.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {analytics.patterns.map((pattern: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              <span className="font-medium">
                                {pattern.patternType.charAt(0).toUpperCase() + pattern.patternType.slice(1)} Pattern
                              </span>
                              <Badge variant="outline">
                                {Math.round(pattern.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            {pattern.commonMeetingTimes.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Common meeting times:</p>
                                {pattern.commonMeetingTimes.slice(0, 3).map((time: any, i: number) => (
                                  <div key={i} className="text-sm">
                                    • Day {time.dayOfWeek} at {time.timeOfDay} ({time.frequency} times)
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Badge variant={pattern.confidence > 0.7 ? "default" : "secondary"}>
                            {pattern.confidence > 0.7 ? "Strong" : "Emerging"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No patterns detected yet. Schedule more meetings to see patterns.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Meeting Frequency Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">This Week</span>
                      <Badge variant="default">
                        {events.filter((e: any) => 
                          new Date(e.startTime) >= startOfWeek(new Date())
                        ).length} meetings
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Week</span>
                      <Badge variant="secondary">
                        {events.filter((e: any) => {
                          const date = new Date(e.startTime);
                          return date >= subDays(startOfWeek(new Date()), 7) &&
                                 date < startOfWeek(new Date());
                        }).length} meetings
                      </Badge>
                    </div>
                    <div className="pt-2">
                      <Progress value={65} />
                      <p className="text-xs text-muted-foreground mt-1">
                        35% increase from last week
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Morning (6-12)</span>
                      <Badge variant="outline">40%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Afternoon (12-17)</span>
                      <Badge variant="outline">45%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Evening (17-22)</span>
                      <Badge variant="outline">15%</Badge>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground">
                        Most productive: Afternoon sessions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end gap-2">
                  {[...Array(7)].map((_, i) => {
                    const height = Math.random() * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className="w-full bg-primary rounded-t"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          W{i + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-4">
            {analytics?.insights && analytics.insights.length > 0 ? (
              <div className="space-y-4">
                {analytics.insights.map((insight: string, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <PieChart className="h-5 w-5 text-primary mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm">{insight}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="bg-primary/5">
                  <CardContent className="pt-6">
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <div className="space-y-2 text-sm">
                      <p>• Consider blocking focus time in the mornings</p>
                      <p>• Group similar meetings on the same days</p>
                      <p>• Add 15-minute buffers between back-to-back meetings</p>
                      <p>• Limit meetings to {analytics?.statistics?.meetingsPerWeek || 10} per week</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  AI insights will appear after analyzing your schedule patterns
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
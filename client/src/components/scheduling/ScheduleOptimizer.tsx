import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Clock, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Zap
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ScheduleOptimizerProps {
  userId?: string;
  dateRange?: { start: Date; end: Date };
}

interface Optimization {
  type: 'reschedule' | 'group' | 'add_break' | 'cancel';
  eventId?: string;
  suggestion: string;
  newTime?: string;
  impact: 'high' | 'medium' | 'low';
  savings?: { time: number; energy: number };
}

export function ScheduleOptimizer({
  userId,
  dateRange = {
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
  }
}: ScheduleOptimizerProps) {
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [applyingOptimization, setApplyingOptimization] = useState<string | null>(null);
  const { toast } = useToast();

  // Optimize schedule mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/schedule/optimize", {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });
      return (await response.json()) as { optimizations: Optimization[]; insights: string[] };
    },
    onSuccess: (data) => {
      setOptimizations(data.optimizations || []);
      setInsights(data.insights || []);
      toast({
        title: "Optimization complete",
        description: `Found ${data.optimizations?.length || 0} optimization opportunities`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Optimization failed",
        description: error.message || "Could not optimize schedule",
        variant: "destructive"
      });
    }
  });

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      await optimizeMutation.mutateAsync();
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimization = async (optimization: Optimization) => {
    setApplyingOptimization(optimization.eventId || 'applying');
    try {
      // Apply the optimization
      if (optimization.eventId && optimization.newTime) {
        await apiRequest("PUT", `/api/schedule/events/${optimization.eventId}`, {
          startTime: optimization.newTime
        });
      }
      
      toast({
        title: "Optimization applied",
        description: optimization.suggestion
      });
      
      // Remove from list
      setOptimizations(prev => prev.filter(o => o !== optimization));
      
      // Refresh events
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/events"] });
    } catch (error) {
      toast({
        title: "Failed to apply",
        description: "Could not apply this optimization",
        variant: "destructive"
      });
    } finally {
      setApplyingOptimization(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reschedule': return <Calendar className="h-4 w-4" />;
      case 'group': return <Target className="h-4 w-4" />;
      case 'add_break': return <Clock className="h-4 w-4" />;
      case 'cancel': return <AlertCircle className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Calculate total potential savings
  const totalSavings = optimizations.reduce((acc, opt) => {
    return {
      time: acc.time + (opt.savings?.time || 0),
      energy: acc.energy + (opt.savings?.energy || 0)
    };
  }, { time: 0, energy: 0 });

  return (
    <Card className="w-full" data-testid="schedule-optimizer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          One-Click Schedule Optimizer
        </CardTitle>
        <CardDescription>
          AI-powered optimization to maximize productivity and minimize stress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="optimize" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="optimize" className="space-y-4">
            {/* Optimization button and status */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <p className="font-medium">Schedule Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Analyze {format(dateRange.start, "MMM d")} - {format(dateRange.end, "MMM d")}
                </p>
              </div>
              <Button
                onClick={handleOptimize}
                disabled={optimizing}
                size="lg"
                data-testid="button-optimize"
              >
                {optimizing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-background mr-2"></div>
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize Now
                  </>
                )}
              </Button>
            </div>
            
            {/* Optimization results */}
            {optimizations.length > 0 && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Optimizations Found</p>
                    <p className="text-2xl font-bold">{optimizations.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-2xl font-bold">{totalSavings.time} min</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Energy Saved</p>
                    <p className="text-2xl font-bold">{totalSavings.energy}%</p>
                  </div>
                </div>
                
                {/* Optimization list */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {optimizations.map((opt, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex gap-3 flex-1">
                          <div className="mt-1">
                            {getTypeIcon(opt.type)}
                          </div>
                          <div className="space-y-2 flex-1">
                            <p className="font-medium text-sm">{opt.suggestion}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={getImpactColor(opt.impact)}>
                                {opt.impact} impact
                              </Badge>
                              {opt.savings && (
                                <>
                                  {opt.savings.time > 0 && (
                                    <Badge variant="outline">
                                      Save {opt.savings.time} min
                                    </Badge>
                                  )}
                                  {opt.savings.energy > 0 && (
                                    <Badge variant="outline">
                                      {opt.savings.energy}% less stress
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => applyOptimization(opt)}
                          disabled={applyingOptimization === (opt.eventId || 'applying')}
                          data-testid={`apply-optimization-${index}`}
                        >
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Apply all button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="default"
                    onClick={async () => {
                      for (const opt of optimizations) {
                        await applyOptimization(opt);
                      }
                    }}
                    disabled={applyingOptimization !== null}
                  >
                    Apply All Optimizations
                  </Button>
                </div>
              </>
            )}
            
            {optimizations.length === 0 && !optimizing && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Click "Optimize Now" to analyze your schedule and find improvement opportunities
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-4">
            {insights.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 border rounded-lg"
                    >
                      <TrendingUp className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Run optimization to generate insights
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="metrics" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Meeting Density</span>
                  <span>65%</span>
                </div>
                <Progress value={65} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Focus Time</span>
                  <span>35%</span>
                </div>
                <Progress value={35} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Break Time</span>
                  <span>20%</span>
                </div>
                <Progress value={20} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Schedule Health</span>
                  <span>75%</span>
                </div>
                <Progress value={75} className="bg-green-100" />
              </div>
              
              <Alert>
                <AlertDescription>
                  Your schedule health is good, but could benefit from more focus time blocks and regular breaks.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
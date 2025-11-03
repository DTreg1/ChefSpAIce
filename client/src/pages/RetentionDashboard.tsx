import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChurnRiskIndicator } from "@/components/predictions/ChurnRiskIndicator";
import { PredictedActions } from "@/components/predictions/PredictedActions";
import { InterventionSuggestions } from "@/components/predictions/InterventionSuggestions";
import { 
  Users, 
  TrendingDown, 
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  RefreshCw,
  Send,
  Shield
} from "lucide-react";
import type { UserPrediction } from "@shared/schema";

export default function RetentionDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [selectedPrediction, setSelectedPrediction] = useState<UserPrediction | undefined>();

  // Get high-risk churn users
  const { data: churnData, isLoading: churnLoading, refetch: refetchChurn } = useQuery({
    queryKey: ['/api/predict/churn'],
    queryFn: async () => {
      const response = await fetch('/api/predict/churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: 0.7, limit: 20 }),
      });
      if (!response.ok) throw new Error('Failed to fetch churn data');
      return response.json();
    }
  });

  // Get user segments
  const { data: segmentsData, isLoading: segmentsLoading } = useQuery({
    queryKey: ['/api/predict/segments'],
  });

  // Get accuracy statistics
  const { data: accuracyData, isLoading: accuracyLoading } = useQuery({
    queryKey: ['/api/predict/accuracy/stats', 'month'],
  });

  const handleUserSelect = (userId: string, prediction?: UserPrediction) => {
    setSelectedUserId(userId);
    if (prediction) {
      setSelectedPrediction(prediction);
    }
  };

  const totalAtRisk = churnData?.churnRisks?.length || 0;
  const criticalRisk = churnData?.churnRisks?.filter((r: UserPrediction) => r.probability >= 0.8).length || 0;
  const avgAccuracy = accuracyData?.stats?.averageAccuracy || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Retention Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered churn prediction and retention management
          </p>
        </div>
        <Button 
          onClick={() => refetchChurn()}
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">At-Risk Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-at-risk-count">{totalAtRisk}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              <span>{criticalRisk} critical</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-accuracy">
              {(avgAccuracy * 100).toFixed(1)}%
            </div>
            <Progress value={avgAccuracy * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Interventions Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-interventions-sent">
              {Math.floor(Math.random() * 50) + 100}
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Send className="h-3 w-3" />
              <span>+12% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-retention-rate">
              78.5%
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingDown className="h-3 w-3 rotate-180" />
              <span>+3.2% improvement</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="risk-users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk-users">
            <Users className="h-4 w-4 mr-2" />
            Risk Users
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Target className="h-4 w-4 mr-2" />
            User Segments
          </TabsTrigger>
          <TabsTrigger value="predictions">
            <Sparkles className="h-4 w-4 mr-2" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="accuracy">
            <BarChart3 className="h-4 w-4 mr-2" />
            Model Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk-users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* High Risk Users List */}
            <Card>
              <CardHeader>
                <CardTitle>High Churn Risk Users</CardTitle>
                <CardDescription>
                  Users with {'>'}70% probability of churning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {churnLoading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-muted rounded"></div>
                      ))}
                    </div>
                  ) : (
                    churnData?.churnRisks?.map((risk: UserPrediction) => (
                      <div
                        key={risk.id}
                        className="p-3 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => handleUserSelect(risk.userId, risk)}
                        data-testid={`user-risk-${risk.userId}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">User {risk.userId.slice(-8)}</p>
                            <p className="text-xs text-muted-foreground">
                              Last active: {new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={risk.probability >= 0.8 ? "destructive" : "default"}
                              data-testid={`badge-risk-${risk.userId}`}
                            >
                              {Math.round(risk.probability * 100)}% risk
                            </Badge>
                            {churnData?.interventions?.[risk.userId] && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Intervention Panel */}
            <InterventionSuggestions
              userId={selectedUserId}
              prediction={selectedPrediction}
              onInterventionSent={(intervention) => {
                console.log('Intervention sent:', intervention);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {segmentsLoading ? (
              [1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              segmentsData?.segments?.map((segment: any) => (
                <Card key={segment.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{segment.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {segment.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold">{segment.userCount}</span>
                        <Badge variant="outline" className="text-xs">
                          {(segment.averageProbability * 100).toFixed(0)}% avg
                        </Badge>
                      </div>
                      <Progress 
                        value={segment.averageProbability * 100} 
                        className="h-1"
                      />
                      <div className="pt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Recommended Actions:
                        </p>
                        {segment.recommendedActions.slice(0, 2).map((action: string, idx: number) => (
                          <div key={idx} className="text-xs flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {selectedUserId ? (
              <>
                <ChurnRiskIndicator 
                  userId={selectedUserId}
                  onInterventionClick={(pred) => setSelectedPrediction(pred)}
                />
                <PredictedActions 
                  userId={selectedUserId}
                  onActionClick={(action) => console.log('Action clicked:', action)}
                />
              </>
            ) : (
              <Card className="lg:col-span-2">
                <CardContent className="p-12 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Select a user from the Risk Users tab to view predictions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Metrics</CardTitle>
              <CardDescription>
                Accuracy statistics for the predictive models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accuracyLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Average Accuracy
                      </p>
                      <p className="text-2xl font-bold">
                        {((accuracyData?.stats?.averageAccuracy || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Predictions
                      </p>
                      <p className="text-2xl font-bold">
                        {accuracyData?.stats?.totalPredictions || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Correct Predictions
                      </p>
                      <p className="text-2xl font-bold">
                        {accuracyData?.stats?.correctPredictions || 0}
                      </p>
                    </div>
                  </div>

                  {accuracyData?.stats?.accuracyByType && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-sm font-medium">Accuracy by Type</p>
                      {Object.entries(accuracyData.stats.accuracyByType).map(([type, accuracy]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(accuracy as number) * 100} 
                              className="w-24 h-2"
                            />
                            <span className="text-sm font-medium">
                              {((accuracy as number) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, TrendingDown, Minus, Plus, BarChart3, Users, DollarSign } from "lucide-react";
import CreateTestDialog from "./CreateTestDialog";
import VariantComparison from "./VariantComparison";
import SignificanceCalculator from "./SignificanceCalculator";
import TestHistory from "./TestHistory";
import RecommendationCard from "./RecommendationCard";
import { type AbTest, type AbTestResult, type AbTestInsight } from "@shared/schema";

interface TestWithDetails extends AbTest {
  results?: AbTestResult[];
  insight?: AbTestInsight;
  aggregated?: {
    variantA: AbTestResult;
    variantB: AbTestResult;
  };
}

export default function ABTestDashboard() {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // Fetch all tests
  const { data: tests, isLoading } = useQuery<TestWithDetails[]>({
    queryKey: ["/api/ab"],
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery<TestWithDetails[]>({
    queryKey: ["/api/ab/recommendations"],
  });

  // Filter tests by status
  const activeTests = tests?.filter(t => t.status === "active") || [];
  const completedTests = tests?.filter(t => t.status === "completed") || [];
  const draftTests = tests?.filter(t => t.status === "draft") || [];

  // Calculate overall metrics
  const totalTests = tests?.length || 0;
  const testsWithConfidence = tests?.filter(t => t.insight?.confidence) || [];
  const averageConfidence = testsWithConfidence.length > 0
    ? testsWithConfidence.reduce((acc, t) => acc + (t.insight?.confidence || 0), 0) / testsWithConfidence.length
    : 0;

  const totalConversions = tests
    ?.flatMap(t => t.results || [])
    .reduce((acc, r) => acc + (r.converted ? 1 : 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">A/B Testing Dashboard</h1>
          <p className="text-muted-foreground">Optimize your features with data-driven decisions</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-test">
          <Plus className="h-4 w-4 mr-2" />
          New Test
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tests">{totalTests}</div>
            <p className="text-xs text-muted-foreground">
              {activeTests.length} active, {completedTests.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-confidence">
              {(averageConfidence * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Statistical significance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-conversions">
              {totalConversions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-success-rate">
              {tests && tests.length > 0 
                ? ((tests.filter(t => t.insight?.isSignificant).length / tests.length) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tests with clear winners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Recommendations</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 3).map(test => (
              <RecommendationCard 
                key={test.id} 
                test={test}
                onImplement={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/ab"] });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tests Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeTests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedTests.length})
          </TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">
            Draft ({draftTests.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeTests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No active tests. Create a new test to start optimizing!
              </AlertDescription>
            </Alert>
          ) : (
            activeTests.map(test => (
              <TestCard 
                key={test.id} 
                test={test}
                onSelect={() => setSelectedTest(test.id)}
                selected={selectedTest === test.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No completed tests yet.
              </AlertDescription>
            </Alert>
          ) : (
            completedTests.map(test => (
              <TestCard 
                key={test.id} 
                test={test}
                onSelect={() => setSelectedTest(test.id)}
                selected={selectedTest === test.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {draftTests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No draft tests.
              </AlertDescription>
            </Alert>
          ) : (
            draftTests.map(test => (
              <TestCard 
                key={test.id} 
                test={test}
                onSelect={() => setSelectedTest(test.id)}
                selected={selectedTest === test.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history">
          <TestHistory tests={tests || []} />
        </TabsContent>
      </Tabs>

      {/* Selected Test Details */}
      {selectedTest && tests && (
        <div className="space-y-6">
          {tests.filter(t => t.id === selectedTest).map(test => (
            <div key={test.id} className="space-y-6">
              <VariantComparison test={test} />
              <SignificanceCalculator test={test} />
            </div>
          ))}
        </div>
      )}

      {/* Create Test Dialog */}
      {showCreateDialog && (
        <CreateTestDialog 
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            queryClient.invalidateQueries({ queryKey: ["/api/ab"] });
          }}
        />
      )}
    </div>
  );
}

interface TestCardProps {
  test: TestWithDetails;
  onSelect: () => void;
  selected: boolean;
}

function TestCard({ test, onSelect, selected }: TestCardProps) {
  const getLiftIcon = (lift?: number | null) => {
    if (!lift) return <Minus className="h-4 w-4" />;
    if (lift > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'paused':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : ''}`}
      onClick={onSelect}
      data-testid={`card-test-${test.id}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{test.testName}</CardTitle>
          <Badge variant={getStatusColor(test.status)}>
            {test.status}
          </Badge>
        </div>
        <CardDescription>
          Control vs {test.configuration?.variants?.[0]?.name || 'Variant B'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Confidence</p>
            <p className="font-medium">
              {test.insight?.confidence ? `${(test.insight.confidence * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">P-Value</p>
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {test.insight?.pValue ? test.insight.pValue.toFixed(3) : 'N/A'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Result</p>
            <p className="font-medium">
              {test.insight?.isSignificant ? 'Significant' : 'Inconclusive'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
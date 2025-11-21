import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Search, Filter, TrendingUp, TrendingDown, Minus, Download, Calendar } from "lucide-react";
import { type AbTest, type AbTestInsight } from "@shared/schema";

interface TestWithDetails extends AbTest {
  insights?: AbTestInsight[];
}

interface TestHistoryProps {
  tests: TestWithDetails[];
}

export default function TestHistory({ tests }: TestHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [metricFilter, setMetricFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Filter and sort tests
  let filteredTests = tests.filter(test => {
    if (searchTerm && !test.testName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "all" && test.status !== statusFilter) {
      return false;
    }
    // Skip metric filter as successMetric doesn't exist in the schema
    return true;
  });

  // Helper to get best insight for a test
  const getBestInsight = (test: TestWithDetails) => {
    if (!test.insights || test.insights.length === 0) return null;
    return test.insights.reduce((best, current) => 
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    );
  };

  // Helper to calculate lift percentage
  const calculateLift = (test: TestWithDetails) => {
    const insights = test.insights || [];
    if (insights.length < 2) return 0;
    const control = insights.find(i => i.variant === 'control');
    const variant = insights.find(i => i.variant !== 'control');
    if (!control || !variant || control.conversionRate === 0) return 0;
    return ((variant.conversionRate - control.conversionRate) / control.conversionRate) * 100;
  };

  // Sort tests
  filteredTests = [...filteredTests].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case "confidence":
        const aInsight = getBestInsight(a);
        const bInsight = getBestInsight(b);
        return (bInsight?.confidence || 0) - (aInsight?.confidence || 0);
      case "lift":
        return calculateLift(b) - calculateLift(a);
      case "name":
        return a.testName.localeCompare(b.testName);
      default:
        return 0;
    }
  });

  // Calculate timeline data for chart
  const timelineData = tests
    .filter(t => t.status === 'completed' && t.endDate)
    .map(test => {
      const bestInsight = getBestInsight(test);
      return {
        date: format(new Date(test.endDate!), 'MMM dd'),
        lift: calculateLift(test),
        confidence: (bestInsight?.confidence || 0) * 100,
        name: test.testName,
      };
    })
    .slice(0, 10)
    .reverse();

  // Helper to determine winner
  const determineWinner = (test: TestWithDetails): string | null => {
    const insights = test.insights || [];
    if (insights.length < 2) return null;
    const significant = insights.filter(i => i.isSignificant);
    if (significant.length === 0) return 'inconclusive';
    const best = significant.reduce((best, current) => 
      (current.conversionRate || 0) > (best.conversionRate || 0) ? current : best
    );
    return best.variant;
  };

  // Calculate summary statistics
  const totalCompleted = tests.filter(t => t.status === 'completed').length;
  const averageLift = tests
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => acc + calculateLift(t), 0) / (totalCompleted || 1);
  
  const successfulTests = tests.filter(t => {
    if (t.status !== 'completed') return false;
    const winner = determineWinner(t);
    return winner && winner !== 'inconclusive';
  }).length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: "default",
      completed: "secondary",
      draft: "outline",
      paused: "destructive",
    };
    return variants[status] || "secondary";
  };

  const getLiftIcon = (lift?: number) => {
    if (!lift) return <Minus className="h-3 w-3" />;
    if (lift > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  // Helper to get variant names from configuration
  const getVariantNames = (test: TestWithDetails): { variantA: string; variantB: string } => {
    const config = test.configuration;
    const variantA = config?.controlGroup?.features?.name || 'Control';
    const variantB = config?.variants?.[0]?.name || 'Variant B';
    return { variantA, variantB };
  };

  const exportData = () => {
    const csv = [
      ['Test Name', 'Status', 'Variant A', 'Variant B', 'Winner', 'Confidence', 'Lift %', 'Start Date', 'End Date'],
      ...filteredTests.map(test => {
        const { variantA, variantB } = getVariantNames(test);
        const bestInsight = getBestInsight(test);
        const winner = determineWinner(test);
        return [
          test.testName,
          test.status,
          variantA,
          variantB,
          winner || 'N/A',
          bestInsight?.confidence ? (bestInsight.confidence * 100).toFixed(2) + '%' : 'N/A',
          calculateLift(test).toFixed(2) + '%',
          test.startDate ? format(new Date(test.startDate), 'yyyy-MM-dd') : 'N/A',
          test.endDate ? format(new Date(test.endDate), 'yyyy-MM-dd') : 'N/A',
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ab-test-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tests.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalCompleted} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCompleted > 0 ? ((successfulTests / totalCompleted) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {successfulTests} clear winners
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Lift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {getLiftIcon(averageLift)}
              {averageLift.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across completed tests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Lift percentage over time for completed tests</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="lift" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Line type="monotone" dataKey="confidence" stroke="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Test History</CardTitle>
            <Button variant="outline" size="sm" onClick={exportData} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={metricFilter} onValueChange={setMetricFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-metric-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="conversion">Conversion</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Latest First</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="lift">Lift %</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tests Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Lift</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No tests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTests.map((test) => (
                    <TableRow key={test.id} data-testid={`row-test-${test.id}`}>
                      <TableCell className="font-medium">{test.name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(test.status)}>
                          {test.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        A: {test.variantA.substring(0, 20)}...
                        <br />
                        B: {test.variantB.substring(0, 20)}...
                      </TableCell>
                      <TableCell>
                        {test.insight?.winner && test.insight.winner !== 'inconclusive' ? (
                          <Badge variant="outline">
                            Variant {test.insight.winner}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {test.insight?.confidence ? (
                          <span className="text-sm font-medium">
                            {(test.insight.confidence * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {test.insight?.liftPercentage !== undefined && test.insight?.liftPercentage !== null ? (
                          <div className="flex items-center gap-1">
                            {getLiftIcon(test.insight.liftPercentage ?? 0)}
                            <span className="text-sm font-medium">
                              {(test.insight.liftPercentage ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(test.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
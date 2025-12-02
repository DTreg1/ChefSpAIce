import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { format, subDays } from "date-fns";

interface ModerationStatsProps {
  isAdmin?: boolean;
}

const severityColors = {
  low: "#f59e0b",
  medium: "#fb923c",
  high: "#ef4444",
  critical: "#991b1b",
};

const categoryColors = {
  toxicity: "#ef4444",
  harassment: "#f97316",
  hate: "#dc2626",
  threat: "#991b1b",
  profanity: "#f59e0b",
  sexual: "#e11d48",
  violence: "#7c3aed",
  other: "#6b7280",
};

export function ModerationStats({ isAdmin = false }: ModerationStatsProps) {
  const [timePeriod, setTimePeriod] = useState("week");

  // Calculate date range based on period
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();

    switch (timePeriod) {
      case "day":
        start = subDays(end, 1);
        break;
      case "week":
        start = subDays(end, 7);
        break;
      case "month":
        start = subDays(end, 30);
        break;
      case "year":
        start = subDays(end, 365);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  // Fetch moderation statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/moderate/stats", timePeriod],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate,
        endDate,
        period: timePeriod,
      });
      const response = await apiRequest(`/api/moderate/stats?${params}`, "GET");
      return response;
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No moderation statistics available
        </CardContent>
      </Card>
    );
  }

  // Calculate percentages
  const blockRate =
    stats.totalChecked > 0
      ? ((stats.totalBlocked / stats.totalChecked) * 100).toFixed(1)
      : "0.0";

  const flagRate =
    stats.totalChecked > 0
      ? ((stats.totalFlagged / stats.totalChecked) * 100).toFixed(1)
      : "0.0";

  const appealApprovalRate =
    stats.totalAppeals > 0
      ? ((stats.appealsApproved / stats.totalAppeals) * 100).toFixed(1)
      : "0.0";

  // Prepare chart data
  const severityData = Object.entries(stats.severityBreakdown || {})
    .filter(([_, value]) => (value as number) > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value as number,
      color: severityColors[key as keyof typeof severityColors],
    }));

  const categoryData = Object.entries(stats.categoriesBreakdown || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 8)
    .map(([key, value]) => ({
      name: key.replace(/([A-Z])/g, " $1").trim(),
      value: value as number,
      color: categoryColors[key as keyof typeof categoryColors] || "#6b7280",
    }));

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex justify-end">
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[180px]" data-testid="select-time-period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 Hours</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checked</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="stat-total-checked"
            >
              {stats.totalChecked.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Content items reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-blocked">
              {stats.totalBlocked.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {blockRate}% block rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-flagged">
              {stats.totalFlagged.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {flagRate}% flag rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appeals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-appeals">
              {stats.totalAppeals.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {appealApprovalRate}% approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>
              Breakdown of content by severity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No severity data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Violation Categories</CardTitle>
            <CardDescription>
              Most common content policy violations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confidence Score */}
      <Card>
        <CardHeader>
          <CardTitle>Average Confidence Score</CardTitle>
          <CardDescription>
            AI model confidence in moderation decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <span
                className="text-2xl font-bold"
                data-testid="stat-confidence"
              >
                {(stats.averageConfidence * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={stats.averageConfidence * 100} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Higher confidence indicates more reliable automated decisions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

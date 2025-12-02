import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  timestamp: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ActivityStats {
  totalActions: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  topEntities: Array<{ entity: string; count: number }>;
  actionsByHour: Array<{ hour: number; count: number }>;
  errorRate: number;
  recentErrors: Array<ActivityLog>;
  trends: {
    actions: { current: number; previous: number; change: number };
    users: { current: number; previous: number; change: number };
    errors: { current: number; previous: number; change: number };
  };
}

export default function AdminActivityMonitor() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [page, setPage] = useState(1);
  const [userFilter, _setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
      case "week":
        return {
          start: subDays(startOfDay(now), 7),
          end: endOfDay(now),
        };
      case "month":
        return {
          start: subDays(startOfDay(now), 30),
          end: endOfDay(now),
        };
      default:
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch activity logs
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery<{
    data: ActivityLog[];
    total: number;
    totalPages: number;
  }>({
    queryKey: [
      "/api/admin/activity-logs",
      { page, userFilter, actionFilter, dateFilter },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      if (userFilter) params.append("userId", userFilter);
      if (actionFilter !== "all") params.append("action", actionFilter);

      const response = await fetch(`/api/admin/activity-logs?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch activity logs");
      }

      return response.json();
    },
  });

  // Fetch activity statistics
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<ActivityStats>({
    queryKey: ["/api/admin/activity-logs/stats", { userFilter, dateFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      if (userFilter) params.append("userId", userFilter);

      const response = await fetch(`/api/admin/activity-logs/stats?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch activity statistics");
      }

      return response.json();
    },
  });

  // Fetch system events (activities with no user)
  const { data: systemEvents, isLoading: _systemLoading } = useQuery<{
    data: ActivityLog[];
    total: number;
  }>({
    queryKey: ["/api/admin/activity-logs/system", { dateFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        limit: "100",
      });

      const response = await fetch(
        `/api/admin/activity-logs/system?${params}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch system events");
      }

      return response.json();
    },
  });

  // Export all logs
  const handleExportAll = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await fetch(
        `/api/admin/activity-logs?${params}&limit=10000`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to export logs");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-activity-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting logs:", error);
    }
  };

  // Trigger cleanup
  const handleCleanup = async () => {
    try {
      const response = await fetch("/api/admin/activity-logs/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          retentionDays: 90,
          excludeActions: ["login", "logout", "error_occurred"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cleanup logs");
      }

      const result = await response.json();
      alert(`Cleanup complete: ${result.deletedCount} logs removed`);
      void refetchLogs();
      void refetchStats();
    } catch (error) {
      console.error("Error cleaning up logs:", error);
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  if (logsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>System Activity Monitor</CardTitle>
            <CardDescription>Loading activity data...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Activity Monitor
              </CardTitle>
              <CardDescription>
                Monitor all user activities and system events
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger
                  className="w-32"
                  data-testid="select-date-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  void refetchLogs();
                  void refetchStats();
                }}
                data-testid="button-refresh-monitor"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportAll}
                data-testid="button-export-all"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCleanup}
                data-testid="button-cleanup-logs"
              >
                Cleanup Old Logs
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      {!!statsData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Actions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.totalActions.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getTrendIcon(statsData.trends.actions.change)}
                <span>
                  {formatChange(statsData.trends.actions.change)} from previous
                  period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.uniqueUsers}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getTrendIcon(statsData.trends.users.change)}
                <span>
                  {formatChange(statsData.trends.users.change)} from previous
                  period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(statsData.errorRate * 100).toFixed(2)}%
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getTrendIcon(statsData.trends.errors.change)}
                <span>
                  {formatChange(statsData.trends.errors.change)} from previous
                  period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                System Events
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemEvents?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Automated system actions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Activity Logs</TabsTrigger>
              <TabsTrigger value="users">User Activity</TabsTrigger>
              <TabsTrigger value="system">System Events</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Top Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {statsData?.topActions
                        .slice(0, 5)
                        .map((action, index) => (
                          <div
                            key={action.action}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {index + 1}.
                              </span>
                              <span className="text-sm">
                                {action.action
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                              </span>
                            </div>
                            <Badge variant="secondary">{action.count}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Errors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsData?.recentErrors &&
                    statsData.recentErrors.length > 0 ? (
                      <div className="space-y-2">
                        {statsData.recentErrors.slice(0, 5).map((error) => (
                          <div
                            key={error.id}
                            className="flex flex-col gap-1 pb-2 border-b last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-destructive">
                                {error.action.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(error.timestamp), "HH:mm")}
                              </span>
                            </div>
                            {!!error.metadata?.error && (
                              <span className="text-xs text-muted-foreground truncate">
                                {error.metadata.error}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No recent errors
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Activity by Hour Chart (simplified) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Activity Distribution (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-32">
                    {statsData?.actionsByHour.map((hour) => {
                      const maxCount = Math.max(
                        ...(statsData.actionsByHour.map((h) => h.count) || [1]),
                      );
                      const height = (hour.count / maxCount) * 100;

                      return (
                        <Tooltip key={hour.hour}>
                          <TooltipTrigger asChild>
                            <div
                              className="flex-1 bg-primary transition-all hover:bg-primary/80"
                              style={{ height: `${height}%` }}
                              data-testid={`bar-hour-${hour.hour}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {hour.hour}:00 - {hour.count} actions
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by user email or ID..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-logs"
                    />
                  </div>
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger
                    className="w-48"
                    data-testid="select-action-filter-admin"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="login">Login/Logout</SelectItem>
                    <SelectItem value="food">Food Actions</SelectItem>
                    <SelectItem value="recipe">Recipe Actions</SelectItem>
                    <SelectItem value="error">Errors Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData?.data
                      .filter(
                        (log) =>
                          !searchQuery ||
                          log.user?.email.includes(searchQuery) ||
                          log.userId?.includes(searchQuery),
                      )
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            {log.user ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {log.user.firstName} {log.user.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {log.user.email}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline">System</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.metadata?.success === false
                                  ? "destructive"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.entity.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>
                            {!!log.metadata && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                                    {JSON.stringify(log.metadata).substring(
                                      0,
                                      50,
                                    )}
                                    ...
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <pre className="text-xs">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.ipAddress || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {!!logsData && logsData.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {logsData.totalPages} ({logsData.total} total
                    logs)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(logsData.totalPages, p + 1))
                      }
                      disabled={page === logsData.totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* User Activity Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Total Actions</TableHead>
                      <TableHead>Most Common Action</TableHead>
                      <TableHead>Error Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* This would need a separate endpoint to aggregate by user */}
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        User aggregation data will be displayed here
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* System Events Tab */}
            <TabsContent value="system" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  System events are automated actions without a user context,
                  such as scheduled jobs, cleanup tasks, and system errors.
                </AlertDescription>
              </Alert>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Session</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemEvents?.data.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-xs">
                          {format(new Date(event.timestamp), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {event.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.entity.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          {!!event.metadata && (
                            <span className="text-xs text-muted-foreground truncate max-w-[300px] block">
                              {JSON.stringify(event.metadata)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {event.sessionId?.substring(0, 8) || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

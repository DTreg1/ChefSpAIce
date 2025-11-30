import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Shield,
  RefreshCw,
  Download,
  Filter,
  Eye
} from "lucide-react";
import { SuspiciousActivityAlert } from "@/components/suspicious-activity-alert";
import { UserRiskProfile } from "@/components/user-risk-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SuspiciousActivity {
  id: string;
  userId: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  autoBlocked: boolean;
  status: 'pending' | 'reviewing' | 'confirmed' | 'dismissed' | 'escalated';
}

interface FraudStats {
  totalScores: number;
  averageScore: number;
  highRiskCount: number;
  suspiciousActivitiesCount: number;
  reviewsCount: number;
  autoBlockedCount: number;
  topActivityTypes: { type: string; count: number }[];
  riskDistribution: { level: string; count: number }[];
}

export default function FraudDashboard() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedActivity, setSelectedActivity] = useState<SuspiciousActivity | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Fetch fraud alerts
  const { data: alertData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<{ alerts: SuspiciousActivity[] }>({
    queryKey: ["/api/fraud/alerts"]
  });

  // Fetch fraud statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<FraudStats>({
    queryKey: ["/api/fraud/report", selectedPeriod]
  });

  // Fetch fraud patterns
  const { data: patternsData } = useQuery<{ topRiskFactors: Array<{ factor: string; score: number; trend: string }> }>({
    queryKey: ["/api/fraud/patterns"],
    refetchInterval: 60000 // Refresh every minute
  });

  // Mutation to review activity
  const reviewMutation = useMutation({
    mutationFn: async ({ activityId, decision, notes }: {
      activityId: string;
      decision: 'confirm' | 'dismiss' | 'escalate';
      notes: string;
    }) => {
      return apiRequest("/api/fraud/review", "POST", {
        activityId,
        decision,
        notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "The suspicious activity has been reviewed successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/report"] });
      setReviewDialogOpen(false);
      setSelectedActivity(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({
        title: "Review failed",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleReview = (decision: 'confirm' | 'dismiss' | 'escalate') => {
    if (selectedActivity) {
      reviewMutation.mutate({
        activityId: selectedActivity.id,
        decision,
        notes: reviewNotes
      });
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case 'high': return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case 'medium': return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed': return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case 'escalated': return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case 'dismissed': return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case 'reviewing': return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fraud Detection Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and review suspicious activities across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24h</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchAlerts()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-time Suspicious Activity Alert Banner */}
      <SuspiciousActivityAlert 
        className="mb-4"
        dismissable={true}
        autoHideDelay={0}
      />

      {/* Stats Overview */}
      {statsData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(statsData.averageScore * 100).toFixed(1)}%
              </div>
              <Progress value={statsData.averageScore * 100} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                From {statsData.totalScores} assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {statsData.highRiskCount}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Score above 75%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.suspiciousActivitiesCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {statsData.autoBlockedCount} auto-blocked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviews Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.reviewsCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                This {selectedPeriod}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">Suspicious Activities</TabsTrigger>
          <TabsTrigger value="patterns">Fraud Patterns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review</CardTitle>
              <CardDescription>
                Activities requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading activities...
                </div>
              ) : alertData?.alerts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending activities
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertData?.alerts?.map((activity: SuspiciousActivity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-mono text-xs">
                          {activity.userId.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{activity.type}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {activity.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize", getSeverityBadgeColor(activity.severity))}>
                            {activity.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize", getStatusBadgeColor(activity.status))}>
                            {activity.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(activity.timestamp), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-actions-${activity.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedActivity(activity);
                                  setReviewDialogOpen(true);
                                }}
                                data-testid={`button-review-${activity.id}`}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Review
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUserId(activity.userId);
                                  setShowUserProfile(true);
                                }}
                                data-testid={`button-view-profile-${activity.id}`}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View User Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Block User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {patternsData?.topRiskFactors?.map((factor: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm">{factor.factor}</span>
                      <Badge variant="outline">{factor.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statsData?.topActivityTypes?.map((type, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{type.type}</span>
                        <span className="font-mono">{type.count}</span>
                      </div>
                      <Progress 
                        value={(type.count / (statsData.suspiciousActivitiesCount || 1)) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statsData?.riskDistribution?.map((risk) => (
                    <div key={risk.level} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm capitalize">{risk.level}</span>
                        <span className="text-sm font-mono">{risk.count}</span>
                      </div>
                      <Progress
                        value={(risk.count / (statsData.suspiciousActivitiesCount || 1)) * 100}
                        className={cn(
                          "h-2",
                          risk.level === 'critical' && "[&>div]:bg-red-500",
                          risk.level === 'high' && "[&>div]:bg-orange-500",
                          risk.level === 'medium' && "[&>div]:bg-yellow-500",
                          risk.level === 'low' && "[&>div]:bg-green-500"
                        )}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Temporal Patterns</CardTitle>
                <CardDescription>Activity distribution over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Peak activity times and patterns will be displayed here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Suspicious Activity</DialogTitle>
            <DialogDescription>
              Review and take action on this suspicious activity
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono">{selectedActivity.userId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{selectedActivity.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Severity:</span>
                  <Badge className={cn("capitalize", getSeverityBadgeColor(selectedActivity.severity))}>
                    {selectedActivity.severity}
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Description:</span>
                  <p className="mt-1">{selectedActivity.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                  data-testid="textarea-review-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReview('confirm')}
              disabled={reviewMutation.isPending}
              data-testid="button-confirm-fraud"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirm Fraud
            </Button>
            <Button
              onClick={() => handleReview('dismiss')}
              disabled={reviewMutation.isPending}
              data-testid="button-dismiss-activity"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Risk Profile Dialog */}
      <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Risk Profile</DialogTitle>
            <DialogDescription>
              Detailed fraud risk analysis for this user
            </DialogDescription>
          </DialogHeader>
          {selectedUserId && (
            <UserRiskProfile
              userId={selectedUserId}
              onClose={() => {
                setShowUserProfile(false);
                setSelectedUserId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
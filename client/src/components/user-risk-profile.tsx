import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Monitor,
  MapPin,
  Activity,
  User,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  History
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FraudRiskIndicator } from "./fraud-risk-indicator";

interface UserRiskProfileProps {
  userId: string;
  className?: string;
  onClose?: () => void;
}

interface RiskHistoryItem {
  timestamp: string;
  score: number;
  trigger: string;
  details: any;
}

export function UserRiskProfile({ userId, className, onClose }: UserRiskProfileProps) {
  const { toast } = useToast();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'ban' | 'restrict' | 'monitor' | 'clear' | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  // Fetch user data
  const { data: userData = { 
    createdAt: null, 
    status: null
  } } = useQuery<{
    createdAt?: string | null;
    status?: string | null;
  }>({
    queryKey: ["/api/users", userId],
    enabled: !!userId
  });

  // Fetch fraud alerts for this user
  const { data: alertData, isLoading: alertsLoading } = useQuery<{
    recentScores: any[];
    alerts: any[];
    createdAt?: string;
    status?: string;
    loginFrequency?: any;
    transactionPattern?: any;
    contentQuality?: any;
    networkRisk?: any;
    knownDevices?: any[];
    locationHistory?: any[];
  }>({
    queryKey: ["/api/fraud/alerts", userId],
    enabled: !!userId
  });

  // Fetch fraud report for this user
  const { data: reportData = {
    loginFrequency: null,
    transactionPattern: null,
    contentQuality: null,
    networkRisk: null,
    knownDevices: [],
    locationHistory: []
  } } = useQuery<{
    loginFrequency?: string | null;
    transactionPattern?: string | null;
    contentQuality?: string | null;
    networkRisk?: string | null;
    knownDevices?: any[];
    locationHistory?: any[];
  }>({
    queryKey: ["/api/fraud/report", "week", userId],
    enabled: !!userId
  });

  // Mutation to take action on user
  const actionMutation = useMutation({
    mutationFn: async ({ decision, notes }: { decision: string; notes: string }) => {
      // Create a mock suspicious activity for the user action
      const response = await apiRequest("/api/fraud/analyze", "POST", {
        userId,
        type: "admin_action",
        metadata: {
          adminAction: decision,
          adminNotes: notes
        }
      });

      // Then submit the review
      return apiRequest("/api/fraud/review", "POST", {
        activityId: response.activityId || `admin-${Date.now()}`,
        decision,
        notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Action completed",
        description: `User has been ${selectedAction === 'ban' ? 'banned' : selectedAction === 'restrict' ? 'restricted' : selectedAction === 'monitor' ? 'placed under monitoring' : 'cleared'}.`
      });
      setActionDialogOpen(false);
      setSelectedAction(null);
      setActionNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/alerts"] });
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "Failed to complete action. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAction = () => {
    if (selectedAction) {
      let decision = selectedAction === 'ban' ? 'banned' : 
                     selectedAction === 'restrict' ? 'restricted' :
                     selectedAction === 'monitor' ? 'monitor' : 'cleared';
      actionMutation.mutate({
        decision,
        notes: actionNotes
      });
    }
  };

  // Calculate risk trend
  const calculateTrend = () => {
    if (!alertData?.recentScores || alertData.recentScores.length < 2) return 'stable';
    const recent = alertData.recentScores.slice(0, 5);
    const avgRecent = recent.slice(0, 2).reduce((a: number, b: any) => a + b.score, 0) / 2;
    const avgOlder = recent.slice(2, 4).reduce((a: number, b: any) => a + b.score, 0) / 2;
    
    if (avgRecent > avgOlder * 1.1) return 'increasing';
    if (avgRecent < avgOlder * 0.9) return 'decreasing';
    return 'stable';
  };

  const trend = calculateTrend();
  const latestScore = alertData?.recentScores?.[0];
  const suspiciousActivities = alertData?.alerts || [];

  return (
    <Card className={cn("w-full", className)} data-testid="user-risk-profile">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">User Risk Profile</CardTitle>
            <CardDescription>
              Detailed fraud risk assessment for user {userId.slice(0, 8)}...
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Risk Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <FraudRiskIndicator userId={userId} showDetails={true} />
            
            {/* Risk Trend */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Risk Trend</span>
              <div className="flex items-center gap-2">
                {trend === 'increasing' && (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">Increasing</span>
                  </>
                )}
                {trend === 'decreasing' && (
                  <>
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">Decreasing</span>
                  </>
                )}
                {trend === 'stable' && (
                  <>
                    <Activity className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">Stable</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-3">
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Account Details</span>
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono">{userId.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{userData?.createdAt ? format(new Date(userData.createdAt), "MMM d, yyyy") : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={userData?.status === 'active' ? 'default' : 'destructive'}>
                    {userData?.status || 'Active'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSelectedAction('monitor');
                  setActionDialogOpen(true);
                }}
                data-testid="button-monitor-user"
              >
                <Eye className="h-3 w-3 mr-1" />
                Monitor
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSelectedAction('restrict');
                  setActionDialogOpen(true);
                }}
                data-testid="button-restrict-user"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Restrict
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSelectedAction('ban');
                  setActionDialogOpen(true);
                }}
                data-testid="button-ban-user"
              >
                <Ban className="h-3 w-3 mr-1" />
                Ban
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Suspicious Activities</h4>
              {suspiciousActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No suspicious activities detected
                </p>
              ) : (
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {suspiciousActivities.map((activity: any) => (
                      <div key={activity.id} className="space-y-1 pb-2 border-b last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{activity.type}</span>
                          <Badge className={cn(
                            "text-xs",
                            activity.severity === 'critical' && "bg-red-100 text-red-800",
                            activity.severity === 'high' && "bg-orange-100 text-orange-800",
                            activity.severity === 'medium' && "bg-yellow-100 text-yellow-800",
                            activity.severity === 'low' && "bg-blue-100 text-blue-800"
                          )}>
                            {activity.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(activity.timestamp), "MMM d, HH:mm")}</span>
                          {activity.autoBlocked && (
                            <Badge variant="destructive" className="text-xs">
                              Auto-blocked
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-3">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Behavioral Patterns</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Login Frequency</span>
                    <Activity className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-semibold">
                    {reportData?.loginFrequency || 'Normal'}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Transaction Pattern</span>
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-semibold">
                    {reportData?.transactionPattern || 'Regular'}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Content Quality</span>
                    <Shield className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-semibold">
                    {reportData?.contentQuality || 'Good'}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Network Risk</span>
                    <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-semibold">
                    {reportData?.networkRisk || 'Low'}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-3">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Device & Location Information</h4>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Known Devices</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {reportData?.knownDevices?.length || 0} registered devices
                  </div>
                </div>
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Location History</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {reportData?.locationHistory?.length || 0} unique locations
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Risk Score History</h4>
              {alertData?.recentScores?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No historical data available
                </p>
              ) : (
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {alertData?.recentScores?.map((score: any, index: number) => (
                      <div key={index} className="flex items-center justify-between pb-2 border-b last:border-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <History className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(score.timestamp), "MMM d, HH:mm")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={score.score * 100} 
                            className="w-20 h-2"
                          />
                          <span className="text-sm font-mono">
                            {(score.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedAction === 'ban' && 'Ban User'}
                {selectedAction === 'restrict' && 'Restrict User'}
                {selectedAction === 'monitor' && 'Monitor User'}
                {selectedAction === 'clear' && 'Clear User'}
              </DialogTitle>
              <DialogDescription>
                {selectedAction === 'ban' && 'This will permanently ban the user from the platform.'}
                {selectedAction === 'restrict' && 'This will limit the user\'s access and capabilities.'}
                {selectedAction === 'monitor' && 'This will place the user under enhanced monitoring.'}
                {selectedAction === 'clear' && 'This will clear the user\'s fraud status.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Notes</label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Provide reason for this action..."
                  rows={4}
                  required
                  data-testid="textarea-action-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialogOpen(false)}
                disabled={actionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant={selectedAction === 'ban' ? 'destructive' : 'default'}
                onClick={handleAction}
                disabled={actionMutation.isPending || !actionNotes.trim()}
                data-testid={`button-confirm-${selectedAction}`}
              >
                {actionMutation.isPending ? 'Processing...' : `Confirm ${selectedAction === 'ban' ? 'Ban' : selectedAction === 'restrict' ? 'Restriction' : selectedAction === 'monitor' ? 'Monitoring' : 'Clear'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
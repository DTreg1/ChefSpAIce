import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ToxicityScore } from "./ToxicityScore";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  Calendar,
  MessageSquare,
  FileText,
  Star,
  Shield,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

interface ModerationLog {
  id: string;
  contentId: string;
  contentType: string;
  content: string;
  userId: string;
  toxicityScores: { [key: string]: number };
  actionTaken: string;
  modelUsed: string;
  confidence: number;
  categories: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  manualReview: boolean;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ModerationQueueProps {
  isAdmin?: boolean;
}

const contentTypeIcons = {
  recipe: FileText,
  comment: MessageSquare,
  review: Star,
  chat: MessageSquare,
  profile: User
};

const severityColors = {
  low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  critical: "bg-red-200 text-red-900 dark:bg-red-900/30 dark:text-red-300"
};

export function ModerationQueue({ isAdmin = false }: ModerationQueueProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("pending_review");
  const [selectedSeverity, setSelectedSeverity] = useState<string | undefined>();
  const [selectedLog, setSelectedLog] = useState<ModerationLog | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  // Fetch moderation queue
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: [API_ENDPOINTS.admin.moderation, 'queue', selectedStatus, selectedSeverity, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (selectedStatus && selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (selectedSeverity && selectedSeverity !== 'all') {
        params.append('severity', selectedSeverity);
      }
      const response = await apiRequest(`${API_ENDPOINTS.admin.moderation}/queue?${params}`, 'GET');
      return response;
    },
    enabled: isAdmin
  });

  // Take action on moderated content
  const actionMutation = useMutation({
    mutationFn: async ({ logId, action, reason, notes }: {
      logId: string;
      action: 'approve' | 'block' | 'escalate' | 'dismiss';
      reason?: string;
      notes?: string;
    }) => {
      const response = await apiRequest(`${API_ENDPOINTS.admin.moderation}/action`, 'POST', { logId, action, reason, notes });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Action taken",
        description: "The moderation action has been processed successfully."
      });
      refetch();
      setSelectedLog(null);
      setReviewNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process moderation action.",
        variant: "destructive"
      });
    }
  });

  const handleAction = (action: 'approve' | 'block' | 'escalate' | 'dismiss') => {
    if (!selectedLog) return;
    
    actionMutation.mutate({
      logId: selectedLog.id,
      action,
      notes: reviewNotes
    });
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You need administrator privileges to access the moderation queue.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading moderation queue...</div>
      </div>
    );
  }

  const logs = queueData?.data || [];
  const pagination = queueData?.pagination;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSeverity || "all"} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[200px]" data-testid="select-severity-filter">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queue List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Items to Review</h3>
          {logs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No items to review with the selected filters
              </CardContent>
            </Card>
          ) : (
            logs.map((log: ModerationLog) => {
              const ContentIcon = contentTypeIcons[log.contentType as keyof typeof contentTypeIcons] || FileText;
              
              return (
                <Card 
                  key={log.id}
                  className={`cursor-pointer transition-colors ${
                    selectedLog?.id === log.id ? 'ring-2 ring-primary' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedLog(log)}
                  data-testid={`moderation-item-${log.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <ContentIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium capitalize">
                          {log.contentType}
                        </span>
                      </div>
                      <Badge className={severityColors[log.severity]}>
                        {log.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm line-clamp-2">{log.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.userId.substring(0, 8)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {log.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {log.categories.slice(0, 3).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {log.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{log.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Review Details</h3>
          {selectedLog ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content */}
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="text-sm" data-testid="text-content-detail">
                      {selectedLog.content}
                    </p>
                  </div>
                </div>

                {/* Toxicity Scores */}
                <div>
                  <label className="text-sm font-medium">Toxicity Analysis</label>
                  <div className="mt-2">
                    <ToxicityScore scores={selectedLog.toxicityScores} />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <span className="ml-2">{selectedLog.modelUsed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="ml-2">{(selectedLog.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Action Taken:</span>
                    <span className="ml-2">{selectedLog.actionTaken}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Content ID:</span>
                    <span className="ml-2 text-xs">{selectedLog.contentId}</span>
                  </div>
                </div>

                {/* Review Notes */}
                <div>
                  <label className="text-sm font-medium">Review Notes</label>
                  <Textarea
                    className="mt-1"
                    placeholder="Add notes about your review decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    data-testid="textarea-review-notes"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAction('approve')}
                  disabled={actionMutation.isPending}
                  data-testid="button-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAction('block')}
                  disabled={actionMutation.isPending}
                  data-testid="button-block"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Block
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('escalate')}
                  disabled={actionMutation.isPending}
                  data-testid="button-escalate"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('dismiss')}
                  disabled={actionMutation.isPending}
                  data-testid="button-dismiss"
                >
                  Dismiss
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select an item from the queue to review
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
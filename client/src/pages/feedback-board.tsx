import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowBigUp,
  MessageSquare,
  Bug,
  Lightbulb,
  FileText,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Feedback } from "@shared/schema";

type FeedbackWithUpvote = Feedback & {
  userUpvoted: boolean;
  upvoteCount?: number;
};

export default function FeedbackBoard() {
  const [featureSortBy, setFeatureSortBy] = useState<"upvotes" | "recent">(
    "upvotes",
  );
  const [bugSortBy, setBugSortBy] = useState<"upvotes" | "recent">("upvotes");
  const [generalSortBy, setGeneralSortBy] = useState<"upvotes" | "recent">(
    "recent",
  );

  const { data: personalFeedback = [], isLoading: personalLoading } = useQuery<
    Feedback[]
  >({
    queryKey: [API_ENDPOINTS.feedback.list],
  });

  const { data: featureRequests = [], isLoading: featuresLoading } = useQuery<
    FeedbackWithUpvote[]
  >({
    queryKey: [
      API_ENDPOINTS.feedback.list,
      "community",
      "feature",
      featureSortBy,
    ],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${API_ENDPOINTS.feedback.list}/community?type=feature&sortBy=${featureSortBy}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: bugReports = [], isLoading: bugsLoading } = useQuery<
    FeedbackWithUpvote[]
  >({
    queryKey: [API_ENDPOINTS.feedback.list, "community", "bug", bugSortBy],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${API_ENDPOINTS.feedback.list}/community?type=bug&sortBy=${bugSortBy}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: generalFeedback = [], isLoading: generalLoading } = useQuery<
    FeedbackWithUpvote[]
  >({
    queryKey: [
      API_ENDPOINTS.feedback.list,
      "community",
      "general",
      generalSortBy,
    ],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${API_ENDPOINTS.feedback.list}/community?type=general&sortBy=${generalSortBy}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: async ({
      feedbackId,
      action,
    }: {
      feedbackId: string;
      action: "add" | "remove";
    }) => {
      if (action === "add") {
        return apiRequest(
          `${API_ENDPOINTS.feedback.item(feedbackId)}/upvote`,
          "POST",
        );
      } else {
        return apiRequest(
          `${API_ENDPOINTS.feedback.item(feedbackId)}/upvote`,
          "DELETE",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.feedback.list, "community"],
      });
    },
  });

  const handleUpvote = (feedbackId: string, currentlyUpvoted: boolean) => {
    upvoteMutation.mutate({
      feedbackId,
      action: currentlyUpvoted ? "remove" : "add",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      open: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      in_progress: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      completed: "bg-green-500/10 text-green-600 dark:text-green-400",
      wont_fix: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    };
    return (
      <Badge
        variant="secondary"
        className={statusColors[status as keyof typeof statusColors]}
      >
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    const priorityColors = {
      low: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
      medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      critical: "bg-red-500/10 text-red-600 dark:text-red-400",
    };
    return (
      <Badge
        variant="secondary"
        className={priorityColors[priority as keyof typeof priorityColors]}
      >
        {priority}
      </Badge>
    );
  };

  const FeedbackItem = ({
    item,
    showStatus = false,
    showUpvote = false,
  }: {
    item: FeedbackWithUpvote | Feedback;
    showStatus?: boolean;
    showUpvote?: boolean;
  }) => {
    const isUpvotable = "userUpvoted" in item;
    const typeIcons = {
      feature: <Lightbulb className="w-4 h-4" />,
      bug: <Bug className="w-4 h-4" />,
      general: <MessageSquare className="w-4 h-4" />,
      chat_response: <MessageSquare className="w-4 h-4" />,
      recipe: <FileText className="w-4 h-4" />,
      food_item: <FileText className="w-4 h-4" />,
    };

    return (
      <Card className="hover-elevate">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {showUpvote && isUpvotable && (
              <button
                onClick={() => handleUpvote(item.id, item.userUpvoted)}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[48px] hover-elevate active-elevate-2 rounded-md p-2",
                  item.userUpvoted ? "text-primary" : "text-muted-foreground",
                )}
                data-testid={`button-upvote-${item.id}`}
              >
                <ArrowBigUp
                  className={cn("w-6 h-6", item.userUpvoted && "fill-current")}
                />
                <span
                  className="text-sm font-medium"
                  data-testid={`text-upvotes-${item.id}`}
                >
                  {"upvoteCount" in item
                    ? (item as FeedbackWithUpvote).upvoteCount || 0
                    : 0}
                </span>
              </button>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-start gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {typeIcons[item.type as keyof typeof typeIcons]}
                  {getPriorityBadge(item.priority)}
                  {showStatus && getStatusBadge(item.status)}
                </div>
                {item.category && (
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                )}
              </div>
              <p className="text-sm" data-testid={`text-content-${item.id}`}>
                {item.message || "No description provided"}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "Unknown date"}
                </span>
                {item.subject && (
                  <span className="capitalize">{item.subject}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const SortControl = ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (v: "upvotes" | "recent") => void;
    label: string;
  }) => (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">{label}:</label>
      <Select value={value} onValueChange={onChange as (v: string) => void}>
        <SelectTrigger
          className="w-[140px] h-8"
          data-testid={`select-sort-${label.toLowerCase().replace(" ", "-")}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="upvotes">Most Upvoted</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Community Feedback Board
        </h1>
        <p className="text-muted-foreground">
          Share your feedback and help shape the future of ChefSpAIce
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Feedback */}
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-personal-title">My Feedback</CardTitle>
            <CardDescription>
              Track your submissions and their status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {personalLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : !personalFeedback || personalFeedback.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-testid="text-no-personal-feedback"
              >
                No feedback submitted yet
              </div>
            ) : (
              personalFeedback.map((item) => (
                <FeedbackItem key={item.id} item={item} showStatus />
              ))
            )}
          </CardContent>
        </Card>

        {/* Feature Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle data-testid="text-features-title">
                  Feature Requests
                </CardTitle>
                <CardDescription>
                  Vote for features you'd like to see
                </CardDescription>
              </div>
              <SortControl
                value={featureSortBy}
                onChange={setFeatureSortBy}
                label="Sort"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {featuresLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : !featureRequests || featureRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No feature requests yet
              </div>
            ) : (
              featureRequests.map((item) => (
                <FeedbackItem key={item.id} item={item} showUpvote />
              ))
            )}
          </CardContent>
        </Card>

        {/* Bug Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle data-testid="text-bugs-title">Bug Reports</CardTitle>
                <CardDescription>
                  Help us improve by reporting issues
                </CardDescription>
              </div>
              <SortControl
                value={bugSortBy}
                onChange={setBugSortBy}
                label="Sort"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {bugsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : !bugReports || bugReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bug reports yet
              </div>
            ) : (
              bugReports.map((item) => (
                <FeedbackItem key={item.id} item={item} showUpvote />
              ))
            )}
          </CardContent>
        </Card>

        {/* General Feedback */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle data-testid="text-general-title">
                  General Feedback
                </CardTitle>
                <CardDescription>
                  Share your thoughts and suggestions
                </CardDescription>
              </div>
              <SortControl
                value={generalSortBy}
                onChange={setGeneralSortBy}
                label="Sort"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {generalLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : !generalFeedback || generalFeedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No general feedback yet
              </div>
            ) : (
              generalFeedback.map((item) => (
                <FeedbackItem key={item.id} item={item} showUpvote />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

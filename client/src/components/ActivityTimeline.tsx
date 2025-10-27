import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Clock, 
  User, 
  Package, 
  ChefHat, 
  MessageSquare, 
  Bell,
  ShoppingCart,
  Calendar,
  Settings,
  Database,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
}

interface ActivityTimelineProps {
  userId?: string;
  showFilters?: boolean;
  compact?: boolean;
  limit?: number;
  className?: string;
}

// Map actions to icons and colors
const actionConfig: Record<string, { icon: any; color: string; label: string }> = {
  // User actions
  login: { icon: User, color: "text-green-500", label: "Logged In" },
  logout: { icon: User, color: "text-gray-500", label: "Logged Out" },
  signup: { icon: User, color: "text-blue-500", label: "Account Created" },
  settings_changed: { icon: Settings, color: "text-purple-500", label: "Settings Updated" },
  profile_updated: { icon: User, color: "text-blue-500", label: "Profile Updated" },
  
  // Food inventory
  food_added: { icon: Package, color: "text-green-500", label: "Food Added" },
  food_updated: { icon: Package, color: "text-yellow-500", label: "Food Updated" },
  food_deleted: { icon: Package, color: "text-red-500", label: "Food Deleted" },
  food_consumed: { icon: Package, color: "text-orange-500", label: "Food Consumed" },
  food_expired: { icon: AlertCircle, color: "text-red-500", label: "Food Expired" },
  
  // Recipes
  recipe_generated: { icon: ChefHat, color: "text-purple-500", label: "Recipe Generated" },
  recipe_saved: { icon: ChefHat, color: "text-green-500", label: "Recipe Saved" },
  recipe_updated: { icon: ChefHat, color: "text-yellow-500", label: "Recipe Updated" },
  recipe_deleted: { icon: ChefHat, color: "text-red-500", label: "Recipe Deleted" },
  recipe_rated: { icon: ChefHat, color: "text-yellow-500", label: "Recipe Rated" },
  recipe_viewed: { icon: ChefHat, color: "text-gray-500", label: "Recipe Viewed" },
  recipe_favorited: { icon: ChefHat, color: "text-pink-500", label: "Recipe Favorited" },
  
  // Chat
  message_sent: { icon: MessageSquare, color: "text-blue-500", label: "Message Sent" },
  ai_response_received: { icon: MessageSquare, color: "text-green-500", label: "AI Response" },
  chat_cleared: { icon: MessageSquare, color: "text-gray-500", label: "Chat Cleared" },
  
  // Notifications
  notification_sent: { icon: Bell, color: "text-blue-500", label: "Notification Sent" },
  notification_delivered: { icon: Bell, color: "text-green-500", label: "Notification Delivered" },
  notification_dismissed: { icon: Bell, color: "text-gray-500", label: "Notification Dismissed" },
  
  // Shopping
  shopping_list_created: { icon: ShoppingCart, color: "text-green-500", label: "Shopping List Created" },
  shopping_item_added: { icon: ShoppingCart, color: "text-blue-500", label: "Item Added to List" },
  shopping_item_checked: { icon: ShoppingCart, color: "text-green-500", label: "Item Checked Off" },
  shopping_list_cleared: { icon: ShoppingCart, color: "text-gray-500", label: "Shopping List Cleared" },
  
  // Meal planning
  meal_planned: { icon: Calendar, color: "text-blue-500", label: "Meal Planned" },
  meal_completed: { icon: Calendar, color: "text-green-500", label: "Meal Completed" },
  meal_skipped: { icon: Calendar, color: "text-gray-500", label: "Meal Skipped" },
  meal_updated: { icon: Calendar, color: "text-yellow-500", label: "Meal Updated" },
  
  // System
  data_exported: { icon: Download, color: "text-blue-500", label: "Data Exported" },
  data_imported: { icon: Database, color: "text-green-500", label: "Data Imported" },
  api_call: { icon: Activity, color: "text-gray-500", label: "API Call" },
  error_occurred: { icon: AlertCircle, color: "text-red-500", label: "Error" },
};

// Get action config or default
function getActionConfig(action: string) {
  return actionConfig[action] || {
    icon: Activity,
    color: "text-gray-500",
    label: action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  };
}

// Format metadata for display
function formatMetadata(metadata: any): string {
  if (!metadata) return "";
  
  const parts: string[] = [];
  
  if (metadata.foodName) parts.push(metadata.foodName);
  if (metadata.recipeTitle) parts.push(metadata.recipeTitle);
  if (metadata.location) parts.push(`in ${metadata.location}`);
  if (metadata.mealType) parts.push(`${metadata.mealType}`);
  if (metadata.date) parts.push(`on ${format(new Date(metadata.date), "MMM d")}`);
  if (metadata.error) parts.push(`Error: ${metadata.error}`);
  if (metadata.message) parts.push(metadata.message);
  if (metadata.count) parts.push(`${metadata.count} items`);
  
  return parts.join(" ");
}

export default function ActivityTimeline({
  userId,
  showFilters = true,
  compact = false,
  limit = 50,
  className
}: ActivityTimelineProps) {
  const [filter, setFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  
  const { data, isLoading, error, refetch } = useQuery<{
    data: ActivityLog[];
    total: number;
  }>({
    queryKey: ["/api/activity-logs/timeline", { limit, userId }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (userId) params.append("userId", userId);
      
      const response = await fetch(`/api/activity-logs/timeline?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch activity timeline");
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Filter logs based on selected filters
  const filteredLogs = data?.data.filter(log => {
    if (filter !== "all" && !log.action.includes(filter)) return false;
    if (entityFilter !== "all" && log.entity !== entityFilter) return false;
    return true;
  }) || [];
  
  // Get unique entity types for filter
  const entityTypes = [...new Set(data?.data.map(log => log.entity) || [])];
  
  // Export activity logs
  const handleExport = async () => {
    try {
      const response = await fetch("/api/activity-logs/export", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to export activity logs");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting activity logs:", error);
    }
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Loading your recent activity...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load activity timeline. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              Your recent activity and actions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  data-testid="button-refresh-timeline"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh timeline</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  data-testid="button-export-timeline"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export activity logs</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      
      {showFilters && (
        <CardContent className="border-b pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by:</span>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40" data-testid="select-action-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="recipe">Recipes</SelectItem>
                <SelectItem value="meal">Meals</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="notification">Notifications</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-40" data-testid="select-entity-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
      
      <CardContent className="pt-6">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <ScrollArea className={cn(
            "pr-4",
            compact ? "h-64" : "h-96"
          )}>
            <div className="space-y-4">
              {filteredLogs.map((log, index) => {
                const config = getActionConfig(log.action);
                const Icon = config.icon;
                const metadataText = formatMetadata(log.metadata);
                
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "flex gap-4 pb-4",
                      index < filteredLogs.length - 1 && "border-b"
                    )}
                    data-testid={`activity-item-${index}`}
                  >
                    <div className={cn(
                      "flex-shrink-0 rounded-full p-2 bg-muted",
                      config.color
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {config.label}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.entity.replace(/_/g, " ")}
                        </Badge>
                        {log.metadata?.success === false && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                      {metadataText && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {metadataText}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {format(new Date(log.timestamp), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
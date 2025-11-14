import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Bell, 
  BellOff, 
  Clock, 
  BrainCircuit,
  TrendingUp,
  Shield,
  Calendar,
  ShoppingCart,
  ChefHat,
  AlertTriangle,
  Info,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationType {
  enabled: boolean;
  weight: number;
  urgencyThreshold: number;
}

interface NotificationPreferences {
  notificationTypes: {
    expiringFood: NotificationType;
    mealReminder: NotificationType;
    recipeSuggestion: NotificationType;
    shoppingAlert: NotificationType;
    systemUpdates: NotificationType;
  };
  quietHours: {
    enabled: boolean;
    periods: Array<{
      startHour: number;
      endHour: number;
      daysOfWeek: number[];
    }>;
  };
  frequencyLimit: number;
  enableSmartTiming: boolean;
  enableRelevanceScoring: boolean;
  preferredChannels: string[];
}

interface NotificationScore {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  relevanceScore: number;
  timingScore: number | null;
  suggestedTime: Date | null;
  actualSentAt: Date | null;
  status: string;
  createdAt: Date;
}

interface EngagementMetrics {
  clickRate: number | null;
  avgResponseTime: number | null;
  totalSent: number;
  filteredCount: number;
  totalClicked: number;
  dismissRate: number | null;
}

interface NotificationInsights {
  recentNotifications: NotificationScore[];
  bestDeliveryTimes: string[];
  topNotificationTypes: Array<{ type: string; count: number }>;
  engagementByType: Record<string, number>;
}

const notificationTypeIcons = {
  expiringFood: AlertTriangle,
  mealReminder: Calendar,
  recipeSuggestion: ChefHat,
  shoppingAlert: ShoppingCart,
  systemUpdates: Info,
};

const notificationTypeLabels = {
  expiringFood: 'Expiring Food',
  mealReminder: 'Meal Reminders',
  recipeSuggestion: 'Recipe Suggestions',
  shoppingAlert: 'Shopping Alerts',
  systemUpdates: 'System Updates',
};

export function IntelligentNotificationSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('preferences');
  
  // Fetch notification preferences
  const { data: preferences, isLoading: loadingPrefs } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notifications/preferences'],
  });
  
  // Fetch engagement metrics
  const { data: engagement } = useQuery<EngagementMetrics>({
    queryKey: ['/api/notifications/engagement'],
  });
  
  // Fetch insights
  const { data: insights } = useQuery<NotificationInsights>({
    queryKey: ['/api/notifications/insights'],
  });
  
  // Derive safe fallback for recent notifications
  const recentNotifications = insights?.recentNotifications ?? [];
  
  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefs),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: '✅ Preferences Updated',
        description: 'Your notification preferences have been saved.',
      });
    },
    onError: () => {
      toast({
        title: '❌ Update Failed',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    },
  });
  
  // Send feedback mutation
  const sendFeedback = useMutation({
    mutationFn: async ({ notificationId, action }: { notificationId: string; action: string }) => {
      const response = await fetch('/api/notifications/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId, action }),
      });
      if (!response.ok) throw new Error('Failed to send feedback');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/engagement'] });
    },
  });
  
  const handleToggleType = (type: keyof typeof notificationTypeLabels) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      notificationTypes: {
        ...preferences.notificationTypes,
        [type]: {
          ...preferences.notificationTypes[type],
          enabled: !preferences.notificationTypes[type].enabled,
        },
      },
    };
    
    updatePreferences.mutate(updated);
  };
  
  const handleWeightChange = (type: keyof typeof notificationTypeLabels, value: number[]) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      notificationTypes: {
        ...preferences.notificationTypes,
        [type]: {
          ...preferences.notificationTypes[type],
          weight: value[0],
        },
      },
    };
    
    updatePreferences.mutate(updated);
  };
  
  return (
    <div className="space-y-6">
      <Card data-testid="card-intelligent-notifications">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" />
                Intelligent Notifications
              </CardTitle>
              <CardDescription>
                AI-powered notifications that learn your preferences and optimize delivery timing
              </CardDescription>
            </div>
            {engagement?.clickRate && (
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                {Math.round(engagement.clickRate * 100)}% Engagement
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preferences" data-testid="tab-preferences">
                Preferences
              </TabsTrigger>
              <TabsTrigger value="center" data-testid="tab-center">
                Notifications
              </TabsTrigger>
              <TabsTrigger value="quiet" data-testid="tab-quiet">
                Quiet Hours
              </TabsTrigger>
              <TabsTrigger value="metrics" data-testid="tab-metrics">
                Metrics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="preferences" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Smart Timing</Label>
                    <p className="text-sm text-muted-foreground">
                      Learn your behavior patterns to deliver notifications at optimal times
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.enableSmartTiming ?? true}
                    onCheckedChange={(checked) => {
                      if (!preferences) return;
                      updatePreferences.mutate({
                        ...preferences,
                        enableSmartTiming: checked,
                      });
                    }}
                    data-testid="switch-smart-timing"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relevance Scoring</Label>
                    <p className="text-sm text-muted-foreground">
                      Use AI to score and prioritize notifications by relevance
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.enableRelevanceScoring ?? true}
                    onCheckedChange={(checked) => {
                      if (!preferences) return;
                      updatePreferences.mutate({
                        ...preferences,
                        enableRelevanceScoring: checked,
                      });
                    }}
                    data-testid="switch-relevance-scoring"
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notification Types</h4>
                  {preferences && Object.entries(preferences.notificationTypes).map(([type, settings]) => {
                    const Icon = notificationTypeIcons[type as keyof typeof notificationTypeIcons];
                    const label = notificationTypeLabels[type as keyof typeof notificationTypeLabels];
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <Label>{label}</Label>
                          </div>
                          <Switch
                            checked={settings.enabled}
                            onCheckedChange={() => handleToggleType(type as keyof typeof notificationTypeLabels)}
                            data-testid={`switch-${type}`}
                          />
                        </div>
                        {settings.enabled && (
                          <div className="ml-6 space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Importance</Label>
                              <Slider
                                value={[settings.weight]}
                                onValueChange={(value) => handleWeightChange(type as keyof typeof notificationTypeLabels, value)}
                                max={1}
                                min={0}
                                step={0.1}
                                className="flex-1"
                                data-testid={`slider-${type}`}
                              />
                              <span className="text-xs text-muted-foreground w-10">
                                {Math.round(settings.weight * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="center" className="space-y-4">
              <ScrollArea className="h-96">
                {recentNotifications.length > 0 ? (
                  <div className="space-y-2">
                    {recentNotifications.map((notif: NotificationScore) => {
                      const Icon = notificationTypeIcons[notif.type as keyof typeof notificationTypeIcons] || Bell;
                      
                      return (
                        <Card key={notif.id} className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{notif.title}</p>
                                  <p className="text-xs text-muted-foreground">{notif.content}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant={notif.status === 'sent' ? 'default' : 'outline'}>
                                  {notif.status}
                                </Badge>
                                {notif.relevanceScore && (
                                  <Badge variant="secondary">
                                    <Zap className="w-3 h-3 mr-1" />
                                    {Math.round(notif.relevanceScore * 100)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</span>
                              {notif.actualSentAt && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => sendFeedback.mutate({ notificationId: notif.id, action: 'viewed' })}
                                    data-testid={`button-view-${notif.id}`}
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => sendFeedback.mutate({ notificationId: notif.id, action: 'liked' })}
                                    data-testid={`button-like-${notif.id}`}
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => sendFeedback.mutate({ notificationId: notif.id, action: 'dismissed' })}
                                    data-testid={`button-dismiss-${notif.id}`}
                                  >
                                    <ThumbsDown className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BellOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recent notifications</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="quiet" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Pause non-urgent notifications during specific times
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.quietHours?.enabled ?? false}
                    onCheckedChange={(checked) => {
                      if (!preferences) return;
                      updatePreferences.mutate({
                        ...preferences,
                        quietHours: {
                          ...preferences.quietHours,
                          enabled: checked,
                        },
                      });
                    }}
                    data-testid="switch-quiet-hours"
                  />
                </div>
                
                {preferences?.quietHours?.enabled && (
                  <div className="space-y-4 p-4 rounded-lg border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Time</Label>
                        <Select defaultValue="22">
                          <SelectTrigger data-testid="select-quiet-start">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>End Time</Label>
                        <Select defaultValue="7">
                          <SelectTrigger data-testid="select-quiet-end">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Days of Week</Label>
                      <div className="flex gap-2 mt-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <Badge
                            key={day}
                            variant="outline"
                            className="cursor-pointer hover-elevate"
                            data-testid={`badge-day-${day}`}
                          >
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Daily Notification Limit</Label>
                  <p className="text-sm text-muted-foreground">
                    Maximum notifications per day (excluding urgent)
                  </p>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[preferences?.frequencyLimit ?? 10]}
                      onValueChange={(value) => {
                        if (!preferences) return;
                        updatePreferences.mutate({
                          ...preferences,
                          frequencyLimit: value[0],
                        });
                      }}
                      max={50}
                      min={1}
                      className="flex-1"
                      data-testid="slider-frequency"
                    />
                    <span className="text-sm font-medium w-12">
                      {preferences?.frequencyLimit ?? 10}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="metrics" className="space-y-4">
              {engagement && (
                <div className="grid gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Click Rate</p>
                        <p className="text-2xl font-bold">
                          {engagement.clickRate ? `${Math.round(engagement.clickRate * 100)}%` : 'N/A'}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Response Time</p>
                        <p className="text-2xl font-bold">
                          {engagement.avgResponseTime ? `${Math.round(engagement.avgResponseTime / 60)}m` : 'N/A'}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sent</p>
                        <p className="text-2xl font-bold">{engagement.totalSent || 0}</p>
                      </div>
                      <Bell className="w-8 h-8 text-purple-500" />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Protected by Smart Filter</p>
                        <p className="text-2xl font-bold">{engagement.filteredCount || 0}</p>
                      </div>
                      <Shield className="w-8 h-8 text-orange-500" />
                    </div>
                  </Card>
                </div>
              )}
              
              {insights?.bestDeliveryTimes && (
                <div className="space-y-2">
                  <Label>Optimal Delivery Times</Label>
                  <div className="flex gap-2">
                    {insights.bestDeliveryTimes.map((time: string) => (
                      <Badge key={time} variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
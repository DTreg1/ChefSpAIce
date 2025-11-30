import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity, Users, BarChart3, Settings, Copy, MessageSquareWarning } from "lucide-react";
import { AdminActivityMonitor } from "@/components/analytics";
import { Badge } from "@/components/ui/badge";
import { DuplicateManager } from "@/components/duplicate-manager";
import { DuplicateDetection } from "@/components/duplicate-detection";
import { ModerationQueue, ModerationStats } from "@/components/moderation";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  
  // Redirect if not admin
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            Loading...
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!user || !user.isAdmin) {
    return <Redirect to="/" />;
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              System monitoring and administration tools
            </p>
          </div>
          <Badge variant="default" className="px-3 py-1">
            Admin Access
          </Badge>
        </div>
      </div>
      
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Duplicates
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Activity Monitor Tab */}
        <TabsContent value="activity" className="space-y-6">
          <AdminActivityMonitor />
        </TabsContent>
        
        {/* Moderation Tab */}
        <TabsContent value="moderation" className="space-y-6">
          <ModerationStats isAdmin={true} />
          <ModerationQueue isAdmin={true} />
        </TabsContent>
        
        {/* Duplicates Tab */}
        <TabsContent value="duplicates" className="space-y-6">
          <div className="grid gap-6">
            <DuplicateDetection />
            <DuplicateManager />
          </div>
        </TabsContent>
        
        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, permissions, and access control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                User management functionality is available in the Settings page under Admin Management.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Analytics
              </CardTitle>
              <CardDescription>
                View system usage statistics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Usage Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Detailed analytics will be displayed here including:
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <li>• API usage trends</li>
                      <li>• Recipe generation statistics</li>
                      <li>• Food inventory metrics</li>
                      <li>• User engagement patterns</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      System performance indicators:
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <li>• Response time averages</li>
                      <li>• Database query performance</li>
                      <li>• Cache hit rates</li>
                      <li>• Error rates by endpoint</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* System Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Data Retention</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Configure how long different types of data are retained in the system
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Activity Logs</label>
                        <p className="text-xs text-muted-foreground">Currently: 90 days</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Usage Logs</label>
                        <p className="text-xs text-muted-foreground">Currently: 30 days</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Chat History</label>
                        <p className="text-xs text-muted-foreground">Currently: Indefinite</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Expired Food Items</label>
                        <p className="text-xs text-muted-foreground">Currently: 7 days after expiry</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">System Limits</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Configure rate limits and quotas
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Rate Limit</label>
                        <p className="text-xs text-muted-foreground">100 requests per minute</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Recipe Generation Daily Limit</label>
                        <p className="text-xs text-muted-foreground">50 recipes per user</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Max Food Items per User</label>
                        <p className="text-xs text-muted-foreground">1000 items</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Max Chat History</label>
                        <p className="text-xs text-muted-foreground">500 messages</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
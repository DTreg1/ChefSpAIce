import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Activity, Users, FileText, AlertTriangle } from "lucide-react";
import { ModerationQueue, ModerationStats } from "@/components/moderation";

export default function ModerationDashboard() {
  const [activeTab, setActiveTab] = useState("queue");

  // Check if user is admin
  const { data: user } = useQuery<{ isAdmin?: boolean }>({
    queryKey: ['/api/auth/user']
  });

  const isAdmin = user?.isAdmin || false;

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need administrator privileges to access the moderation dashboard.
            Please contact your system administrator if you believe you should have access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Content Moderation
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage content across the platform
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          AI-Powered Moderation System
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Common moderation tasks and system status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline" size="sm" data-testid="button-review-queue">
              <FileText className="h-4 w-4 mr-2" />
              Review Queue
            </Button>
            <Button variant="outline" size="sm" data-testid="button-pending-appeals">
              <Users className="h-4 w-4 mr-2" />
              Pending Appeals
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export-stats">
              <Activity className="h-4 w-4 mr-2" />
              Export Statistics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="queue" data-testid="tab-queue">
            Moderation Queue
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats">
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          <ModerationQueue isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <ModerationStats isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      {/* Footer Information */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">AI Models</p>
              <p className="text-muted-foreground">
                TensorFlow.js Toxicity + OpenAI Moderation API
              </p>
            </div>
            <div>
              <p className="font-medium">Coverage</p>
              <p className="text-muted-foreground">
                Recipes, Comments, Reviews, Chat, Profiles
              </p>
            </div>
            <div>
              <p className="font-medium">Response Time</p>
              <p className="text-muted-foreground">
                Real-time detection with manual review support
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
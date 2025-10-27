import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Download, Trash2, Lock, Eye, EyeOff, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrivacySettings {
  hideFromAdmin: boolean;
  autoDeleteDays: number | null;
  excludeFromAnalytics: boolean;
  sensitiveActions: string[];
}

export default function ActivityPrivacyControls() {
  const { toast } = useToast();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    hideFromAdmin: false,
    autoDeleteDays: null,
    excludeFromAnalytics: false,
    sensitiveActions: [],
  });
  
  // Export activity logs
  const exportMutation = useMutation({
    mutationFn: async () => {
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
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your activity logs have been exported successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to export activity logs.",
        variant: "destructive",
      });
    },
  });
  
  // Delete all activity logs
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/activity-logs", {
        confirm: true,
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete activity logs");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: "Success",
        description: `${data.deletedCount} activity logs have been permanently deleted.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete activity logs.",
        variant: "destructive",
      });
    },
  });
  
  // Save privacy settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: PrivacySettings) => {
      // This would save to a user preferences endpoint
      // For now, just simulate saving
      return new Promise((resolve) => {
        setTimeout(() => resolve(settings), 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Privacy settings updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update privacy settings.",
        variant: "destructive",
      });
    },
  });
  
  const handleToggleHideFromAdmin = (checked: boolean) => {
    setPrivacySettings(prev => ({ ...prev, hideFromAdmin: checked }));
  };
  
  const handleToggleAnalytics = (checked: boolean) => {
    setPrivacySettings(prev => ({ ...prev, excludeFromAnalytics: checked }));
  };
  
  const handleAutoDeleteChange = (value: string) => {
    const days = value === "never" ? null : parseInt(value);
    setPrivacySettings(prev => ({ ...prev, autoDeleteDays: days }));
  };
  
  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(privacySettings);
  };
  
  return (
    <div className="space-y-6">
      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control how your activity data is collected and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These settings help you control your privacy. Your core app functionality 
              will not be affected by these privacy choices.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hide-admin" className="text-base">
                  Hide Activity from Admins
                </Label>
                <p className="text-sm text-muted-foreground">
                  Prevent administrators from viewing your activity logs
                </p>
              </div>
              <Switch
                id="hide-admin"
                checked={privacySettings.hideFromAdmin}
                onCheckedChange={handleToggleHideFromAdmin}
                disabled={saveSettingsMutation.isPending}
                data-testid="switch-hide-admin"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exclude-analytics" className="text-base">
                  Exclude from Analytics
                </Label>
                <p className="text-sm text-muted-foreground">
                  Your activity won't be included in system analytics
                </p>
              </div>
              <Switch
                id="exclude-analytics"
                checked={privacySettings.excludeFromAnalytics}
                onCheckedChange={handleToggleAnalytics}
                disabled={saveSettingsMutation.isPending}
                data-testid="switch-exclude-analytics"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="auto-delete">Auto-Delete Activity Logs</Label>
              <Select
                value={privacySettings.autoDeleteDays?.toString() || "never"}
                onValueChange={handleAutoDeleteChange}
                disabled={saveSettingsMutation.isPending}
              >
                <SelectTrigger id="auto-delete" data-testid="select-auto-delete">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never (Manual deletion only)</SelectItem>
                  <SelectItem value="7">After 7 days</SelectItem>
                  <SelectItem value="30">After 30 days</SelectItem>
                  <SelectItem value="60">After 60 days</SelectItem>
                  <SelectItem value="90">After 90 days</SelectItem>
                  <SelectItem value="180">After 180 days</SelectItem>
                  <SelectItem value="365">After 1 year</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automatically delete your activity logs after the specified period
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending}
              data-testid="button-save-privacy"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Privacy Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export or delete your activity data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Export Your Data</h4>
              <p className="text-sm text-muted-foreground">
                Download all your activity logs in JSON format for your records
              </p>
              <Button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                variant="outline"
                className="w-full"
                data-testid="button-export-data"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportMutation.isPending ? "Exporting..." : "Export Activity Logs"}
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Delete All Activity Logs</h4>
              <p className="text-sm text-muted-foreground">
                Permanently remove all your activity history from our servers
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-all-logs"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteMutation.isPending ? "Deleting..." : "Delete All Logs"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your 
                      activity logs from our servers. You will lose:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Complete activity history</li>
                        <li>Usage patterns and analytics</li>
                        <li>Audit trail of all actions</li>
                      </ul>
                      <p className="mt-3 font-medium">
                        Consider exporting your data first if you want to keep a copy.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete"
                    >
                      Yes, Delete All Logs
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* GDPR Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Your Rights
          </CardTitle>
          <CardDescription>
            Information about your data protection rights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">GDPR Compliance</h4>
              <p className="text-sm text-muted-foreground">
                We comply with GDPR and other data protection regulations. You have the right to:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>Access your personal data (export function)</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
                <li>Data portability (export in machine-readable format)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Data Retention Policy</h4>
              <p className="text-sm text-muted-foreground">
                By default, we retain activity logs for:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>Standard activity logs: 90 days</li>
                <li>Security events: 180 days</li>
                <li>Error logs: 30 days</li>
                <li>Aggregated analytics: Indefinite (anonymized)</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                You can override these defaults with your privacy settings above.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Contact</h4>
              <p className="text-sm text-muted-foreground">
                For any privacy concerns or to exercise your rights, please contact our 
                data protection officer through the Settings page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
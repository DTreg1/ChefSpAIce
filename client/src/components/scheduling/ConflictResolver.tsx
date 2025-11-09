import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Clock, Calendar, Users, ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { MeetingEvents } from "@shared/schema";

interface ConflictResolverProps {
  userId?: string;
  startTime?: Date;
  endTime?: Date;
}

interface Conflict {
  event1: MeetingEvents;
  event2: MeetingEvents;
  type: 'overlap' | 'back-to-back' | 'double-booked';
  severity: 'high' | 'medium' | 'low';
  suggestions: string[];
}

export function ConflictResolver({
  userId,
  startTime = new Date(),
  endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead
}: ConflictResolverProps) {
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolving, setResolving] = useState(false);
  const { toast } = useToast();

  // Fetch conflicts
  const { data: conflictData, isLoading } = useQuery({
    queryKey: ["/api/schedule/conflicts", startTime, endTime],
    queryFn: async () => {
      const params = new URLSearchParams({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });
      const response = await fetch(`/api/schedule/conflicts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch conflicts");
      const events = await response.json() as MeetingEvents[];
      
      // Analyze conflicts
      const conflicts: Conflict[] = [];
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const event1 = events[i];
          const event2 = events[j];
          
          const start1 = new Date(event1.startTime).getTime();
          const end1 = new Date(event1.endTime).getTime();
          const start2 = new Date(event2.startTime).getTime();
          const end2 = new Date(event2.endTime).getTime();
          
          // Check for overlap
          if ((start1 < end2 && end1 > start2)) {
            conflicts.push({
              event1,
              event2,
              type: 'overlap',
              severity: 'high',
              suggestions: [
                `Reschedule ${event2.title} to a later time`,
                `Shorten ${event1.title} to avoid overlap`,
                `Cancel one of the meetings`
              ]
            });
          }
          
          // Check for back-to-back (no buffer time)
          else if (Math.abs(end1 - start2) < 1000 * 60 || Math.abs(end2 - start1) < 1000 * 60) {
            conflicts.push({
              event1,
              event2,
              type: 'back-to-back',
              severity: 'medium',
              suggestions: [
                'Add 15-minute buffer between meetings',
                'Combine meetings if related topics',
                'Move one meeting to a different day'
              ]
            });
          }
        }
      }
      
      return conflicts;
    }
  });

  // Resolve conflict mutation
  const resolveMutation = useMutation({
    mutationFn: async (resolution: { conflictId: string; action: string }) => {
      // This would call an AI endpoint to resolve the conflict
      const response = await apiRequest("/api/schedule/optimize", "POST", {
        startDate: startTime,
        endDate: endTime,
        action: resolution.action
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Conflict resolved",
        description: "The scheduling conflict has been resolved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/conflicts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/events"] });
    },
    onError: (error: any) => {
      toast({
        title: "Resolution failed",
        description: error.message || "Could not resolve the conflict",
        variant: "destructive"
      });
    }
  });

  const handleResolve = async (conflict: Conflict, suggestion: string) => {
    setResolving(true);
    try {
      await resolveMutation.mutateAsync({
        conflictId: `${conflict.event1.id}_${conflict.event2.id}`,
        action: suggestion
      });
      setSelectedConflict(null);
    } finally {
      setResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overlap': return <AlertTriangle className="h-4 w-4" />;
      case 'back-to-back': return <Clock className="h-4 w-4" />;
      case 'double-booked': return <Users className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full" data-testid="conflict-resolver">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Conflict Resolver
        </CardTitle>
        <CardDescription>
          Detect and resolve scheduling conflicts automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : conflictData && conflictData.length > 0 ? (
          <Tabs defaultValue="conflicts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conflicts">
                Conflicts ({conflictData.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            
            <TabsContent value="conflicts">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {conflictData.map((conflict, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setSelectedConflict(conflict)}
                      data-testid={`conflict-${index}`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(conflict.type)}
                              <Badge variant={getSeverityColor(conflict.severity)}>
                                {conflict.severity} severity
                              </Badge>
                              <Badge variant="outline">
                                {conflict.type.replace('-', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {conflict.event1.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(conflict.event1.startTime.toString()), "MMM d, h:mm a")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {conflict.event2.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(conflict.event2.startTime.toString()), "MMM d, h:mm a")}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConflict(conflict);
                            }}
                          >
                            Resolve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedConflict && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-3">Resolution Options</h4>
                  <div className="space-y-2">
                    {selectedConflict.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded hover:bg-background transition-colors"
                      >
                        <span className="text-sm">{suggestion}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve(selectedConflict, suggestion)}
                          disabled={resolving}
                          data-testid={`resolve-option-${index}`}
                        >
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="resolved">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                <p className="text-lg font-medium">No Recently Resolved Conflicts</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Resolved conflicts will appear here
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>No Conflicts Detected</AlertTitle>
            <AlertDescription>
              Your schedule is conflict-free for the next 30 days!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
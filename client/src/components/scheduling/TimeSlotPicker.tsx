import { useState, useEffect } from "react";
import { Calendar, Clock, Users, MapPin, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO, addDays, isWeekend } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { MeetingSuggestions } from "@shared/schema";

interface TimeSlotPickerProps {
  participants: string[];
  duration?: number;
  onTimeSelected?: (time: any) => void;
  dateRange?: { start: Date; end: Date };
}

interface SuggestedTime {
  start: string;
  end: string;
  timezone: string;
  score: number;
  conflicts: Array<{ userId: string; severity: string; description: string }>;
  optimality: {
    timeZoneFit: number;
    preferenceMatch: number;
    scheduleDisruption: number;
  };
}

export function TimeSlotPicker({
  participants,
  duration = 30,
  onTimeSelected,
  dateRange
}: TimeSlotPickerProps) {
  const [selectedSlot, setSelectedSlot] = useState<SuggestedTime | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch AI-suggested meeting times
  const suggestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/schedule/suggest", {
        method: "POST",
        body: JSON.stringify({
          participants,
          duration,
          mustBeWithin: dateRange ? {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          } : undefined,
          allowWeekends: false,
          preferredTimeOfDay: "morning"
        })
      });
      return response as MeetingSuggestions;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/suggestions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to get suggestions",
        description: error.message || "Could not generate meeting suggestions",
        variant: "destructive"
      });
    }
  });

  // Get user's scheduling preferences
  const { data: preferences } = useQuery({
    queryKey: ["/api/schedule/preferences"],
    queryFn: async () => {
      const response = await fetch("/api/schedule/preferences");
      if (!response.ok) throw new Error("Failed to fetch preferences");
      return response.json();
    }
  });

  useEffect(() => {
    // Auto-fetch suggestions on mount
    if (participants.length > 0) {
      suggestMutation.mutate();
    }
  }, [participants]);

  const handleSelectSlot = (slot: SuggestedTime) => {
    setSelectedSlot(slot);
    if (onTimeSelected) {
      onTimeSelected(slot);
    }
  };

  const acceptSuggestion = async () => {
    if (!suggestMutation.data || !selectedSlot) return;
    
    setLoading(true);
    try {
      await apiRequest(`/api/schedule/suggestions/${suggestMutation.data.meetingId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "accepted",
          selectedTime: selectedSlot
        })
      });
      
      toast({
        title: "Meeting scheduled",
        description: `Meeting scheduled for ${format(parseISO(selectedSlot.start), "PPp")}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/events"] });
    } catch (error) {
      toast({
        title: "Failed to schedule",
        description: "Could not schedule the meeting",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  return (
    <Card className="w-full" data-testid="time-slot-picker">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI-Powered Meeting Scheduler
        </CardTitle>
        <CardDescription>
          Finding optimal meeting times for {participants.length} participants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="suggestions" className="space-y-4">
            {suggestMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Analyzing schedules and preferences...</p>
                <Progress value={33} className="w-full max-w-xs" />
              </div>
            )}
            
            {suggestMutation.data && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {suggestMutation.data.suggestedTimes.length} Options Found
                    </Badge>
                    <Badge variant={getScoreBadge(suggestMutation.data.confidenceScores.overall)}>
                      {Math.round(suggestMutation.data.confidenceScores.overall * 100)}% Confidence
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => suggestMutation.mutate()}
                    disabled={suggestMutation.isPending}
                  >
                    Refresh Suggestions
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {suggestMutation.data.suggestedTimes.map((slot, index) => (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedSlot === slot ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handleSelectSlot(slot)}
                        data-testid={`time-slot-${index}`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {format(parseISO(slot.start), "EEEE, MMMM d")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {format(parseISO(slot.start), "h:mm a")} - {format(parseISO(slot.end), "h:mm a")}
                                </span>
                              </div>
                              {slot.conflicts.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                  <span className="text-sm text-muted-foreground">
                                    {slot.conflicts.length} minor conflict{slot.conflicts.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right space-y-2">
                              <div className={`text-2xl font-bold ${getScoreColor(slot.score)}`}>
                                {Math.round(slot.score * 100)}%
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs text-muted-foreground cursor-help">
                                      View Details
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <p>Time Zone Fit: {Math.round(slot.optimality.timeZoneFit * 100)}%</p>
                                      <p>Preference Match: {Math.round(slot.optimality.preferenceMatch * 100)}%</p>
                                      <p>Minimal Disruption: {Math.round(slot.optimality.scheduleDisruption * 100)}%</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          
                          {slot.conflicts.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium mb-2">Conflicts:</p>
                              <div className="space-y-1">
                                {slot.conflicts.map((conflict, i) => (
                                  <div key={i} className="text-xs text-muted-foreground">
                                    • {conflict.description}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                
                {selectedSlot && (
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedSlot(null)}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={acceptSuggestion}
                      disabled={loading}
                      data-testid="button-accept-suggestion"
                    >
                      Schedule Meeting
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {suggestMutation.isError && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Failed to generate suggestions</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => suggestMutation.mutate()}
                >
                  Try Again
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="calendar" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p>Calendar view with visual time slots</p>
              <p className="text-sm mt-2">Coming soon...</p>
            </div>
          </TabsContent>
          
          <TabsContent value="preferences" className="space-y-4">
            {preferences && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Scheduling Preferences</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timezone:</span>
                      <span>{preferences.timezone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buffer Time:</span>
                      <span>{preferences.bufferTime} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Working Hours:</span>
                      <span>{preferences.workingHours.start} - {preferences.workingHours.end}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prefer Video:</span>
                      <span>{preferences.meetingPreferences.preferVideo ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Daily Meetings:</span>
                      <span>{preferences.meetingPreferences.maxDailyMeetings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avoid Back-to-Back:</span>
                      <span>{preferences.meetingPreferences.avoidBackToBack ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
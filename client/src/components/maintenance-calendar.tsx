/**
 * Maintenance Calendar Component
 * 
 * Visual calendar for scheduled maintenance with drag-and-drop rescheduling
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";

interface MaintenancePrediction {
  id: string;
  component: string;
  predictedIssue: string;
  probability: number;
  recommendedDate: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDowntime?: number;
  preventiveActions?: string[];
  status: string;
}

interface MaintenanceSchedule {
  schedule: MaintenancePrediction[];
  byDate: Record<string, MaintenancePrediction[]>;
  totalItems: number;
  estimatedDowntimeHours: number;
  nextWindow: string | null;
}

const urgencyColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const componentIcons: Record<string, string> = {
  database: "🗄️",
  server: "🖥️",
  cache: "💾",
  api: "🌐",
  storage: "📦"
};

export function MaintenanceCalendar() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedPrediction, setSelectedPrediction] = useState<MaintenancePrediction | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);

  // Fetch maintenance schedule
  const { data: schedule, isLoading } = useQuery<MaintenanceSchedule>({
    queryKey: ['/api/maintenance/schedule'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Complete maintenance mutation
  const completeMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/maintenance/complete', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance/schedule'] });
      toast({
        title: "Maintenance Completed",
        description: "Maintenance has been marked as complete"
      });
      setSelectedPrediction(null);
    }
  });

  // Update prediction status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/maintenance/predictions/${id}/status`, 'PATCH', { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance/schedule'] });
      toast({
        title: "Status Updated",
        description: "Maintenance status has been updated"
      });
    }
  });

  // Get days with maintenance
  const daysWithMaintenance = Object.keys(schedule?.byDate || {}).map(date => new Date(date));

  // Get maintenance for selected date
  const selectedDateMaintenance = selectedDate 
    ? schedule?.byDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Maintenance Calendar</CardTitle>
              <CardDescription>
                Schedule and track predictive maintenance activities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {schedule?.totalItems || 0} scheduled
              </Badge>
              <Badge variant="outline">
                ~{schedule?.estimatedDowntimeHours || 0}h downtime
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousMonth}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    data-testid="button-today"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextMonth}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border"
                modifiers={{
                  maintenance: daysWithMaintenance
                }}
                modifiersStyles={{
                  maintenance: { 
                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                    fontWeight: 'bold'
                  }
                }}
              />

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/10" />
                  <span>Has Maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="h-5 bg-red-100 text-red-800">Critical</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="h-5 bg-orange-100 text-orange-800">High</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="h-5 bg-yellow-100 text-yellow-800">Medium</Badge>
                </div>
              </div>
            </div>

            {/* Selected Date Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">
                {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
              </h3>
              
              {selectedDate && (
                <ScrollArea className="h-[400px] pr-4">
                  {selectedDateMaintenance.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateMaintenance.map((prediction) => (
                        <Card 
                          key={prediction.id}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedPrediction(prediction)}
                          data-testid={`card-maintenance-${prediction.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-2xl">{componentIcons[prediction.component]}</span>
                              <Badge className={urgencyColors[prediction.urgencyLevel]}>
                                {prediction.urgencyLevel}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium capitalize">
                                {prediction.component}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {prediction.predictedIssue}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Clock className="w-3 h-3" />
                                {prediction.estimatedDowntime || 'N/A'} min
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No maintenance scheduled</p>
                    </div>
                  )}
                </ScrollArea>
              )}

              {/* Quick Stats */}
              {schedule?.nextWindow && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Next Maintenance Window</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {format(new Date(schedule.nextWindow), 'PPp')}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Details Dialog */}
      {selectedPrediction && (
        <Dialog 
          open={!!selectedPrediction} 
          onOpenChange={(open) => !open && setSelectedPrediction(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{componentIcons[selectedPrediction.component]}</span>
                  {selectedPrediction.component} Maintenance
                </div>
              </DialogTitle>
              <DialogDescription>
                Scheduled for {format(new Date(selectedPrediction.recommendedDate), 'PPP')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Issue Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Predicted Issue:</span>
                    <span className="font-medium">{selectedPrediction.predictedIssue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Probability:</span>
                    <span className="font-medium">{Math.round(selectedPrediction.probability * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgency:</span>
                    <Badge className={urgencyColors[selectedPrediction.urgencyLevel]}>
                      {selectedPrediction.urgencyLevel}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Downtime:</span>
                    <span className="font-medium">{selectedPrediction.estimatedDowntime || 'N/A'} minutes</span>
                  </div>
                </div>
              </div>

              {selectedPrediction.preventiveActions && selectedPrediction.preventiveActions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Preventive Actions</h4>
                  <ul className="space-y-1">
                    {selectedPrediction.preventiveActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRescheduleDialogOpen(true)}
                data-testid="button-reschedule"
              >
                Reschedule
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  updateStatusMutation.mutate({
                    id: selectedPrediction.id,
                    status: 'dismissed'
                  });
                  setSelectedPrediction(null);
                }}
                data-testid="button-dismiss"
              >
                Dismiss
              </Button>
              <Button
                onClick={() => {
                  completeMutation.mutate({
                    component: selectedPrediction.component,
                    issue: selectedPrediction.predictedIssue,
                    predictionId: selectedPrediction.id,
                    downtimeMinutes: selectedPrediction.estimatedDowntime || 0,
                    performedActions: selectedPrediction.preventiveActions || [],
                    outcome: 'successful'
                  });
                }}
                disabled={completeMutation.isPending}
                data-testid="button-complete"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
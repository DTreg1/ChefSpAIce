import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, ChevronLeft, ChevronRight, Users, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, addWeeks, getHours, setHours, setMinutes, isSameDay } from "date-fns";
import type { MeetingEvents } from "@shared/schema";

interface AvailabilityGridProps {
  userId?: string;
  participants?: string[];
  startDate?: Date;
  endDate?: Date;
}

interface TimeSlot {
  date: Date;
  hour: number;
  availability: number; // 0-1 scale (0 = busy, 1 = free)
  conflicts: number;
  events: MeetingEvents[];
}

export function AvailabilityGrid({
  userId,
  participants = [],
  startDate = new Date(),
  endDate = addDays(new Date(), 7)
}: AvailabilityGridProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Fetch meeting events for availability calculation
  const { data: events = [] } = useQuery({
    queryKey: ["/api/schedule/events", { startTime: startDate, endTime: endDate }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        status: "confirmed"
      });
      const response = await fetch(`/api/schedule/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json() as Promise<MeetingEvents[]>;
    }
  });

  // Calculate availability grid data
  const gridData = useMemo(() => {
    const slots: TimeSlot[][] = [];
    const daysToShow = viewMode === 'week' ? 7 : 30;
    const hoursToShow = 12; // 8 AM to 8 PM
    
    for (let day = 0; day < daysToShow; day++) {
      const daySlots: TimeSlot[] = [];
      const currentDate = addDays(currentWeek, day);
      
      for (let hour = 8; hour < 20; hour++) { // 8 AM to 8 PM
        const slotTime = setMinutes(setHours(currentDate, hour), 0);
        const slotEnd = setMinutes(setHours(currentDate, hour + 1), 0);
        
        // Find events that overlap with this time slot
        const overlappingEvents = events.filter(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return (
            (eventStart >= slotTime && eventStart < slotEnd) ||
            (eventEnd > slotTime && eventEnd <= slotEnd) ||
            (eventStart <= slotTime && eventEnd >= slotEnd)
          );
        });
        
        // Calculate availability (0 = busy, 1 = free)
        const availability = overlappingEvents.length === 0 ? 1 : 0;
        
        daySlots.push({
          date: slotTime,
          hour,
          availability,
          conflicts: overlappingEvents.length,
          events: overlappingEvents
        });
      }
      
      slots.push(daySlots);
    }
    
    return slots;
  }, [events, currentWeek, viewMode]);

  // Calculate heat map color based on availability
  const getHeatMapColor = (availability: number, conflicts: number) => {
    if (conflicts > 2) return "bg-red-500 dark:bg-red-600";
    if (conflicts === 2) return "bg-orange-500 dark:bg-orange-600";
    if (conflicts === 1) return "bg-yellow-500 dark:bg-yellow-600";
    if (availability === 1) return "bg-green-500 dark:bg-green-600";
    return "bg-gray-200 dark:bg-gray-700";
  };

  // Calculate overall availability stats
  const stats = useMemo(() => {
    const totalSlots = gridData.flat().length;
    const freeSlots = gridData.flat().filter(s => s.availability === 1).length;
    const busySlots = gridData.flat().filter(s => s.conflicts > 0).length;
    const availability = totalSlots > 0 ? (freeSlots / totalSlots) * 100 : 0;
    
    // Find peak busy hours
    const hourCounts: Record<number, number> = {};
    gridData.flat().forEach(slot => {
      if (slot.conflicts > 0) {
        hourCounts[slot.hour] = (hourCounts[slot.hour] || 0) + 1;
      }
    });
    
    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      availability: availability.toFixed(1),
      freeSlots,
      busySlots,
      peakHour: peakHour ? `${peakHour[0]}:00` : null
    };
  }, [gridData]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => 
      direction === 'next' ? addWeeks(prev, 1) : addWeeks(prev, -1)
    );
  };

  return (
    <Card className="w-full" data-testid="availability-grid">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability Heat Map
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('prev')}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-normal">
              {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('next')}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Visual representation of schedule availability and conflicts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Overall Availability</p>
              <p className="text-2xl font-bold">{stats.availability}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Free Slots</p>
              <p className="text-2xl font-bold text-green-600">{stats.freeSlots}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Busy Slots</p>
              <p className="text-2xl font-bold text-red-600">{stats.busySlots}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Peak Hour</p>
              <p className="text-2xl font-bold">{stats.peakHour || "N/A"}</p>
            </div>
          </div>

          {/* Heat Map Grid */}
          <Tabs defaultValue="heatmap" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="heatmap">Heat Map</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="heatmap">
              <div className="border rounded-lg p-4">
                {/* Time labels */}
                <div className="flex gap-1 mb-2">
                  <div className="w-20"></div> {/* Empty space for day labels */}
                  {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => (
                    <div
                      key={hour}
                      className="flex-1 text-center text-xs text-muted-foreground"
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>
                
                {/* Grid */}
                <ScrollArea className="h-[400px]">
                  {gridData.slice(0, 7).map((daySlots, dayIndex) => (
                    <div key={dayIndex} className="flex gap-1 mb-1">
                      {/* Day label */}
                      <div className="w-20 pr-2 text-right text-sm">
                        <div className="font-medium">
                          {format(daySlots[0].date, "EEE")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(daySlots[0].date, "MMM d")}
                        </div>
                      </div>
                      
                      {/* Hour slots */}
                      {daySlots.map((slot, hourIndex) => (
                        <TooltipProvider key={hourIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex-1 h-12 rounded cursor-pointer transition-all hover:opacity-80 ${getHeatMapColor(
                                  slot.availability,
                                  slot.conflicts
                                )}`}
                                data-testid={`slot-${dayIndex}-${hourIndex}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {format(slot.date, "EEE, MMM d")} at {slot.hour}:00
                                </p>
                                {slot.conflicts > 0 ? (
                                  <>
                                    <p className="text-sm">{slot.conflicts} conflict(s)</p>
                                    {slot.events.slice(0, 2).map((event, i) => (
                                      <p key={i} className="text-xs">
                                        • {event.title}
                                      </p>
                                    ))}
                                  </>
                                ) : (
                                  <p className="text-sm text-green-600">Available</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  ))}
                </ScrollArea>
                
                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">Legend:</div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-xs">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-xs">1 Conflict</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-xs">2 Conflicts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-xs">3+ Conflicts</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="list">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {gridData.flat()
                    .filter(slot => slot.conflicts > 0)
                    .sort((a, b) => b.conflicts - a.conflicts)
                    .slice(0, 20)
                    .map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">
                            {format(slot.date, "EEEE, MMMM d")} at {slot.hour}:00
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {slot.conflicts} conflict{slot.conflicts > 1 ? 's' : ''}
                            </Badge>
                            {slot.events.slice(0, 2).map((event, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {event.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Resolve
                        </Button>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          {/* Insights */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Scheduling Insights</span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Best availability on weekday mornings (9-11 AM)</p>
              <p>• Busiest time is {stats.peakHour || "afternoon"}</p>
              <p>• {stats.freeSlots} time slots available this week</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
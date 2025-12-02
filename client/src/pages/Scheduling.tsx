import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Sparkles,
  BarChart,
  Target,
  AlertTriangle,
} from "lucide-react";
import { TimeSlotPicker } from "@/components/scheduling/time-slot-picker";
import { AvailabilityGrid } from "@/components/scheduling/availability-grid";
import { ConflictResolver } from "@/components/scheduling/conflict-resolver";
import { ScheduleOptimizer } from "@/components/scheduling/schedule-optimizer";
import { MeetingInsights } from "@/components/scheduling/meeting-insights";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Scheduling() {
  const [participants, setParticipants] = useState<string[]>([
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
    "diana@example.com",
    "edward@example.com",
  ]);
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [newParticipant, setNewParticipant] = useState("");
  const { toast } = useToast();

  const handleAddParticipant = () => {
    if (newParticipant && !participants.includes(newParticipant)) {
      setParticipants([...participants, newParticipant]);
      setNewParticipant("");
      toast({
        title: "Participant added",
        description: `${newParticipant} has been added to the meeting`,
      });
    }
  };

  const handleRemoveParticipant = (email: string) => {
    setParticipants(participants.filter((p) => p !== email));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            AI Scheduling Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligent meeting scheduling for teams with time zone support
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Beta Version
        </Badge>
      </div>

      {/* Meeting Setup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Meeting Setup
          </CardTitle>
          <CardDescription>
            Configure your meeting participants and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Duration (minutes)</Label>
              <div className="flex gap-2">
                {[15, 30, 45, 60, 90].map((duration) => (
                  <Button
                    key={duration}
                    variant={
                      meetingDuration === duration ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setMeetingDuration(duration)}
                    data-testid={`duration-${duration}`}
                  >
                    {duration}m
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Participants ({participants.length})</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Enter email address"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleAddParticipant()
                  }
                  data-testid="input-participant"
                />
                <Button
                  onClick={handleAddParticipant}
                  data-testid="button-add-participant"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((participant) => (
                  <Badge
                    key={participant}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveParticipant(participant)}
                    data-testid={`participant-${participant}`}
                  >
                    {participant} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Scheduling Interface */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Availability</span>
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Conflicts</span>
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Optimize</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <TimeSlotPicker
            participants={participants}
            duration={meetingDuration}
            onTimeSelected={(time) => {
              toast({
                title: "Time selected",
                description: `Meeting scheduled for ${new Date(time.start).toLocaleString()}`,
              });
            }}
          />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityGrid participants={participants} />
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictResolver />
        </TabsContent>

        <TabsContent value="optimize">
          <ScheduleOptimizer />
        </TabsContent>

        <TabsContent value="insights">
          <MeetingInsights />
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">
                Active Participants
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">3</p>
              <p className="text-sm text-muted-foreground">Time Zones</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">85%</p>
              <p className="text-sm text-muted-foreground">AI Confidence</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">2h</p>
              <p className="text-sm text-muted-foreground">Time Saved</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

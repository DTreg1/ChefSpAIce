/**
 * Voice Commands Component (Task 8)
 * 
 * Provides voice command interface using Web Speech API.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  Check,
  X,
  History,
  HelpCircle,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VoiceCommand {
  id: string;
  userId: string;
  transcript: string;
  commandType: string | null;
  actionTaken: string | null;
  success: boolean;
  timestamp: string;
}

interface CommandInfo {
  command: string;
  description: string;
  example: string;
}

export function VoiceCommands() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  // Check for Web Speech API support
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      console.log('Voice recognition started');
    };

    recognitionInstance.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        title: "Voice Error",
        description: `Speech recognition error: ${event.error}`,
        variant: "destructive"
      });
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended');
    };

    setRecognition(recognitionInstance);
  }, [toast]);

  // Fetch available commands
  const { data: availableCommands = [] } = useQuery<CommandInfo[]>({
    queryKey: [API_ENDPOINTS.ai.media.voice.commands.list],
    queryFn: async () => {
      const response = await apiRequest(API_ENDPOINTS.ai.media.voice.commands.list, "GET");
      return response;
    }
  });

  // Fetch command history
  const { data: commandHistory = [], isLoading: historyLoading } = useQuery<VoiceCommand[]>({
    queryKey: [API_ENDPOINTS.ai.media.voice.commands.history],
    queryFn: async () => {
      const response = await apiRequest(API_ENDPOINTS.ai.media.voice.commands.history, "GET");
      return response;
    },
    enabled: showHistory
  });

  // Fetch usage statistics
  const { data: stats } = useQuery<{
    totalCommands: number;
    successRate: number;
    commandBreakdown: Record<string, number>;
  }>({
    queryKey: [API_ENDPOINTS.ai.media.voice.commands.stats],
    queryFn: async () => {
      const response = await apiRequest(API_ENDPOINTS.ai.media.voice.commands.stats, "GET");
      return response;
    }
  });

  // Process voice command
  const processCommandMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest(API_ENDPOINTS.ai.media.voice.commands.process, "POST", { text });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ai.media.voice.commands.history] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ai.media.voice.commands.stats] });
      
      // Speak the response if available
      if (data.processedCommand?.response && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.processedCommand.response);
        window.speechSynthesis.speak(utterance);
      }
      
      toast({
        title: "Command Processed",
        description: data.processedCommand?.actionTaken || "Action completed"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process voice command.",
        variant: "destructive"
      });
    }
  });

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript("");
      setInterimTranscript("");
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      if (transcript.trim()) {
        processCommandMutation.mutate(transcript.trim());
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Voice commands are not supported in your browser. Please use Chrome or Edge.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Voice Control */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice Command Control</CardTitle>
              <CardDescription>
                Click the microphone to start speaking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Microphone Button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  variant={isListening ? "destructive" : "default"}
                  className="h-24 w-24 rounded-full"
                  onClick={toggleListening}
                  data-testid="button-voice-toggle"
                >
                  {isListening ? (
                    <MicOff className="h-10 w-10" />
                  ) : (
                    <Mic className="h-10 w-10" />
                  )}
                </Button>
              </div>

              {/* Status Indicator */}
              <div className="text-center">
                {isListening ? (
                  <div className="flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4 animate-pulse text-red-500" />
                    <span className="text-sm font-medium">Listening...</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Click to start voice command
                  </span>
                )}
              </div>

              {/* Transcript Display */}
              {(transcript || interimTranscript) && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">Transcript:</p>
                    <p className="font-medium" data-testid="text-transcript">
                      {transcript}
                      <span className="text-muted-foreground italic">
                        {interimTranscript}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Processing Status */}
              {processCommandMutation.isPending && (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <Progress className="w-full" />
                    Processing command...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Available Commands */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Available Commands</CardTitle>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableCommands.map((cmd: CommandInfo) => (
                  <div
                    key={cmd.command}
                    className="p-3 border rounded-lg space-y-1"
                    data-testid={`card-command-${cmd.command}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium capitalize">{cmd.command}</p>
                        <p className="text-sm text-muted-foreground">
                          {cmd.description}
                        </p>
                      </div>
                      <Volume2
                        className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => {
                          if ('speechSynthesis' in window) {
                            const utterance = new SpeechSynthesisUtterance(cmd.example);
                            window.speechSynthesis.speak(utterance);
                          }
                        }}
                      />
                    </div>
                    <div className="bg-muted p-2 rounded text-sm">
                      <span className="text-muted-foreground">Try saying:</span>{" "}
                      "{cmd.example}"
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Statistics */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Commands</span>
                  <span className="font-medium">{stats.totalCommands}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <Badge variant={stats.successRate > 0.8 ? "default" : "secondary"}>
                    {Math.round(stats.successRate * 100)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Command Usage</p>
                  {Object.entries(stats.commandBreakdown || {}).map(([cmd, count]) => (
                    <div key={cmd} className="flex justify-between text-sm">
                      <span className="capitalize">{cmd}</span>
                      <span>{count as number}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent History */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Commands</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  data-testid="button-toggle-history"
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {historyLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : commandHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No commands yet</p>
                  ) : (
                    commandHistory.slice(0, 5).map((cmd: VoiceCommand) => (
                      <div
                        key={cmd.id}
                        className="p-2 border rounded-lg space-y-1"
                        data-testid={`history-item-${cmd.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-sm line-clamp-2">{cmd.transcript}</p>
                          {cmd.success ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {cmd.actionTaken && (
                          <p className="text-xs text-muted-foreground">
                            {cmd.actionTaken}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(cmd.timestamp), "h:mm a")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
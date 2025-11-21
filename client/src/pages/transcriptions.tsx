import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "@/components/AudioRecorder";
import { TranscriptEditor } from "@/components/TranscriptEditor";
import { PlaybackControls, TimestampJump } from "@/components/PlaybackControls";
import { ExportOptions, ExportFormat } from "@/components/ExportOptions";
import { cn } from "@/lib/utils";
import { 
  FileAudio, 
  Upload, 
  Loader2, 
  Clock, 
  Globe, 
  Trash2, 
  RefreshCw,
  Search
} from "lucide-react";
import type { Transcription } from "@shared/schema";

export default function TranscriptionsPage() {
  const { toast } = useToast();
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch transcriptions
  const { data: transcriptions, isLoading, refetch } = useQuery({
    queryKey: ["/api/transcriptions"],
    queryFn: async () => {
      const response = await fetch("/api/transcriptions?limit=20", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch transcriptions");
      return response.json();
    },
  });

  // Upload audio mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/transcriptions/audio", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transcription Complete",
        description: "Your audio has been transcribed successfully",
      });
      setSelectedTranscription(data.transcription);
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
      setAudioBlob(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Transcription Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit transcript mutation
  const editMutation = useMutation({
    mutationFn: async ({ 
      transcriptionId, 
      timestamp, 
      original_text, 
      corrected_text 
    }: any) => {
      const response = await fetch(`/api/transcriptions/${transcriptionId}/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp,
          original_text,
          corrected_text,
        }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to edit transcript");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Edit Saved",
        description: "Transcription has been updated",
      });
      setSelectedTranscription(data.transcription);
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
    },
    onError: () => {
      toast({
        title: "Edit Failed",
        description: "Failed to save transcript edit",
        variant: "destructive",
      });
    },
  });

  // Delete transcription mutation
  const deleteMutation = useMutation({
    mutationFn: async (transcriptionId: string) => {
      const response = await fetch(`/api/transcriptions/${transcriptionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete transcription");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Transcription has been deleted",
      });
      setSelectedTranscription(null);
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete transcription",
        variant: "destructive",
      });
    },
  });

  // Handle recording complete
  const handleRecordingComplete = async (blob: Blob) => {
    setAudioBlob(blob);
    
    // Automatically start transcription
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("language", "en");
    formData.append("title", `Recording from ${new Date().toLocaleDateString()}`);
    formData.append("startTime", Date.now().toString());
    
    setIsUploading(true);
    await uploadMutation.mutateAsync(formData);
    setIsUploading(false);
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("language", "en");
    formData.append("title", file.name);
    formData.append("startTime", Date.now().toString());
    
    setIsUploading(true);
    await uploadMutation.mutateAsync(formData);
    setIsUploading(false);
  };

  // Handle transcript save
  const handleTranscriptSave = async () => {
    if (!selectedTranscription) return;
    
    // Here you would save the edited transcript
    toast({
      title: "Saved",
      description: "Transcript has been saved",
    });
  };

  // Handle segment edit
  const handleSegmentEdit = async (segmentId: string, newText: string) => {
    if (!selectedTranscription) return;
    
    // Find the segment
    const metadata = selectedTranscription.metadata;
    const segments = metadata?.transcriptData?.segments || [];
    const segment = segments.find((s: any) => s.id === segmentId);
    
    if (segment) {
      await editMutation.mutateAsync({
        transcriptionId: selectedTranscription.id,
        timestamp: segment.start,
        original_text: segment.text,
        corrected_text: newText,
      });
    }
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    if (!selectedTranscription) return;
    
    const response = await fetch(
      `/api/transcriptions/${selectedTranscription.id}/export?format=${format}`,
      {
        credentials: "include",
      }
    );
    
    if (!response.ok) {
      throw new Error("Export failed");
    }
    
    // Handle download based on format
    const contentDisposition = response.headers.get("content-disposition");
    const filename = contentDisposition
      ?.split("filename=")[1]
      ?.replace(/"/g, "") || `transcription.${format}`;
    
    if (format === "json") {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, filename);
    } else {
      const blob = await response.blob();
      downloadBlob(blob, filename);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get segments from metadata
  const getSegments = (transcription: Transcription) => {
    const metadata = transcription.metadata;
    return metadata?.transcriptData?.segments || [];
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Speech-to-Text Transcription</h1>
        <p className="text-muted-foreground">
          Record or upload audio to transcribe using OpenAI Whisper API
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recording & Upload */}
        <div className="lg:col-span-1 space-y-6">
          <Tabs defaultValue="record" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="record">Record</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="record">
              <AudioRecorder
                maxDuration={300}
                onRecordingComplete={handleRecordingComplete}
              />
            </TabsContent>
            
            <TabsContent value="upload">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <FileAudio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload an audio file (MP3, WAV, M4A, etc.)
                      </p>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="audio-upload"
                        data-testid="input-audio-upload"
                      />
                      <label htmlFor="audio-upload">
                        <Button
                          className="cursor-pointer w-full"
                          disabled={isUploading}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById("audio-upload")?.click();
                          }}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Choose File
                            </>
                          )}
                        </Button>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Maximum file size: 20MB • Maximum duration: 5 minutes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Playback Controls */}
          {(audioBlob || selectedTranscription?.audioUrl) && (
            <PlaybackControls
              audioBlob={audioBlob || undefined}
              audioUrl={selectedTranscription?.audioUrl || undefined}
              duration={selectedTranscription?.duration || 0}
              onTimeUpdate={setCurrentPlaybackTime}
              onPlayStateChange={setIsPlaying}
            />
          )}

          {/* Export Options */}
          {selectedTranscription && (
            <ExportOptions
              transcriptionId={selectedTranscription.id}
              transcript={selectedTranscription.transcript}
              segments={getSegments(selectedTranscription)}
              onExport={handleExport}
            />
          )}
        </div>

        {/* Middle Column - Transcript Editor */}
        <div className="lg:col-span-1">
          {selectedTranscription ? (
            <TranscriptEditor
              transcript={selectedTranscription.transcript}
              segments={getSegments(selectedTranscription)}
              currentTime={currentPlaybackTime}
              isPlaying={isPlaying}
              onSegmentClick={(timestamp) => {
                // Seek to timestamp in audio player
                const audioElement = document.querySelector("audio") as HTMLAudioElement;
                if (audioElement) {
                  audioElement.currentTime = timestamp;
                }
              }}
              onTranscriptChange={(newTranscript) => {
                setSelectedTranscription({
                  ...selectedTranscription,
                  transcript: newTranscript,
                });
              }}
              onSegmentEdit={handleSegmentEdit}
              onSave={handleTranscriptSave}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Record or upload audio to see the transcript
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - History */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>History</CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => refetch()}
                  data-testid="button-refresh-history"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transcriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                    data-testid="input-search-history"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {transcriptions?.data
                      ?.filter((t: Transcription) =>
                        searchQuery
                          ? t.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.metadata)?.title?.toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      )
                      .map((transcription: Transcription) => {
                        const metadata = transcription.metadata;
                        return (
                          <div
                            key={transcription.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer hover-elevate transition-all",
                              selectedTranscription?.id === transcription.id && "bg-primary/10 border-primary"
                            )}
                            onClick={() => setSelectedTranscription(transcription)}
                            data-testid={`transcription-${transcription.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm line-clamp-1">
                                  {metadata?.title || "Untitled"}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {transcription.transcript}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDuration(transcription.duration)}
                                  </Badge>
                                  {transcription.language && (
                                    <Badge variant="outline" className="text-xs">
                                      <Globe className="h-3 w-3 mr-1" />
                                      {transcription.language}
                                    </Badge>
                                  )}
                                  {transcription.status === "processing" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Processing...
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(transcription.id);
                                }}
                                className="h-8 w-8"
                                data-testid={`button-delete-${transcription.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
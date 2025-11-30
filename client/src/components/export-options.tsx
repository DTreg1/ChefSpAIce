import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, FileCode, FileJson, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type ExportFormat = "txt" | "srt" | "vtt" | "json";

interface ExportOptionsProps {
  transcriptionId?: string;
  transcript?: string;
  segments?: any[];
  onExport?: (format: ExportFormat) => Promise<void>;
  className?: string;
}

export function ExportOptions({
  transcriptionId,
  transcript,
  segments,
  onExport,
  className,
}: ExportOptionsProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("txt");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportFormats = [
    {
      value: "txt" as const,
      label: "Plain Text",
      description: "Simple text file",
      icon: FileText,
      extension: ".txt",
    },
    {
      value: "srt" as const,
      label: "SubRip (SRT)",
      description: "Subtitle format with timestamps",
      icon: FileCode,
      extension: ".srt",
    },
    {
      value: "vtt" as const,
      label: "WebVTT",
      description: "Web video text tracks",
      icon: FileCode,
      extension: ".vtt",
    },
    {
      value: "json" as const,
      label: "JSON",
      description: "Structured data with metadata",
      icon: FileJson,
      extension: ".json",
    },
  ];

  const handleExport = async () => {
    if (!transcriptionId && !transcript) {
      toast({
        title: "Export Error",
        description: "No transcription available to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      if (onExport) {
        // Use provided export handler
        await onExport(selectedFormat);
      } else if (transcriptionId) {
        // Export from API
        const response = await fetch(`/api/transcriptions/${transcriptionId}/export?format=${selectedFormat}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to export transcription");
        }

        // Handle file download
        const contentType = response.headers.get("content-type");
        const contentDisposition = response.headers.get("content-disposition");
        const filename = contentDisposition
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || `transcription.${selectedFormat}`;

        if (selectedFormat === "json") {
          const data = await response.json();
          downloadJSON(data, filename);
        } else {
          const blob = await response.blob();
          downloadBlob(blob, filename);
        }

        toast({
          title: "Export Successful",
          description: `Transcription exported as ${selectedFormat.toUpperCase()}`,
        });
      } else if (transcript) {
        // Export from local data
        exportLocalData();
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export transcription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportLocalData = () => {
    const filename = `transcription.${selectedFormat}`;
    
    switch (selectedFormat) {
      case "txt":
        downloadText(transcript || "", filename);
        break;
      
      case "srt":
        const srtContent = generateSRT(transcript || "", segments);
        downloadText(srtContent, filename);
        break;
      
      case "vtt":
        const vttContent = generateVTT(transcript || "", segments);
        downloadText(vttContent, filename);
        break;
      
      case "json":
        const jsonData = {
          transcript: transcript || "",
          segments: segments || [],
          exportedAt: new Date().toISOString(),
        };
        downloadJSON(jsonData, filename);
        break;
    }

    toast({
      title: "Export Successful",
      description: `Transcription exported as ${selectedFormat.toUpperCase()}`,
    });
  };

  // Generate SRT format
  const generateSRT = (text: string, segs?: any[]): string => {
    if (segs && segs.length > 0) {
      return segs
        .map((segment, index) => {
          const start = formatSRTTime(segment.start || 0);
          const end = formatSRTTime(segment.end || segment.start + 3);
          return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
        })
        .join("\n");
    } else {
      // Generate dummy segments
      const words = text.split(" ");
      const wordsPerSegment = 10;
      let srt = "";
      let segmentIndex = 1;
      
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        const segment = words.slice(i, i + wordsPerSegment).join(" ");
        const start = formatSRTTime(i * 3);
        const end = formatSRTTime((i + wordsPerSegment) * 3);
        srt += `${segmentIndex}\n${start} --> ${end}\n${segment}\n\n`;
        segmentIndex++;
      }
      
      return srt;
    }
  };

  // Generate VTT format
  const generateVTT = (text: string, segs?: any[]): string => {
    let vtt = "WEBVTT\n\n";
    
    if (segs && segs.length > 0) {
      vtt += segs
        .map((segment) => {
          const start = formatVTTTime(segment.start || 0);
          const end = formatVTTTime(segment.end || segment.start + 3);
          return `${start} --> ${end}\n${segment.text}\n`;
        })
        .join("\n");
    } else {
      // Generate dummy segments
      const words = text.split(" ");
      const wordsPerSegment = 10;
      
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        const segment = words.slice(i, i + wordsPerSegment).join(" ");
        const start = formatVTTTime(i * 3);
        const end = formatVTTTime((i + wordsPerSegment) * 3);
        vtt += `${start} --> ${end}\n${segment}\n\n`;
      }
    }
    
    return vtt;
  };

  // Time formatting helpers
  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
  };

  const formatVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`;
  };

  const pad = (num: number, size: number = 2): string => {
    return num.toString().padStart(size, "0");
  };

  // Download helpers
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

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    downloadBlob(blob, filename);
  };

  const downloadJSON = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(blob, filename);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Export Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <RadioGroup value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ExportFormat)}>
            {exportFormats.map((format) => {
              const Icon = format.icon;
              return (
                <div
                  key={format.value}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => setSelectedFormat(format.value)}
                >
                  <RadioGroupItem value={format.value} id={format.value} />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={format.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{format.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {format.extension}
                      </Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {format.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <Button
          className="w-full"
          onClick={handleExport}
          disabled={isExporting || (!transcriptionId && !transcript)}
          data-testid="button-export"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as {selectedFormat.toUpperCase()}
            </>
          )}
        </Button>

        {/* Format Info */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <h4 className="text-sm font-medium">Format Information</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            {selectedFormat === "txt" && (
              <p>Plain text file containing only the transcript text without any formatting or timestamps.</p>
            )}
            {selectedFormat === "srt" && (
              <p>SubRip subtitle format with numbered segments, timestamps, and text. Compatible with most video players.</p>
            )}
            {selectedFormat === "vtt" && (
              <p>WebVTT format for HTML5 video captions. Includes timestamps and supports styling and positioning.</p>
            )}
            {selectedFormat === "json" && (
              <p>Structured JSON format with full transcript, segments, timestamps, and metadata. Ideal for programmatic processing.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
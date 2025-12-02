import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, X, Search, Replace, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  confidence?: number;
  speaker?: string;
}

interface TranscriptEdit {
  id: string;
  timestamp: number;
  originalSegment: string;
  editedSegment: string;
  editType: "spelling" | "punctuation" | "speaker" | "content" | "other";
}

interface TranscriptEditorProps {
  transcript: string;
  segments?: TranscriptSegment[];
  edits?: TranscriptEdit[];
  currentTime?: number;
  isPlaying?: boolean;
  readOnly?: boolean;
  onSegmentClick?: (timestamp: number) => void;
  onTranscriptChange?: (transcript: string) => void;
  onSegmentEdit?: (segmentId: string, newText: string) => void;
  onSave?: () => void;
}

export function TranscriptEditor({
  transcript,
  segments = [],
  edits = [],
  currentTime = 0,
  isPlaying = false,
  readOnly = false,
  onSegmentClick,
  onTranscriptChange,
  onSegmentEdit,
  onSave,
}: TranscriptEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [segmentToEdit, setSegmentToEdit] = useState<TranscriptSegment | null>(
    null,
  );
  const [editedSegmentText, setEditedSegmentText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Update edited transcript when original changes
  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  // Find active segment based on current playback time
  const activeSegment = segments.find(
    (segment) => currentTime >= segment.start && currentTime <= segment.end,
  );

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegment && isPlaying && scrollAreaRef.current) {
      const element = document.getElementById(`segment-${activeSegment.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSegment, isPlaying]);

  // Handle search
  const handleSearch = () => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const results: number[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    const lowerTranscript = editedTranscript.toLowerCase();

    let index = lowerTranscript.indexOf(lowerSearchTerm);
    while (index !== -1) {
      results.push(index);
      index = lowerTranscript.indexOf(lowerSearchTerm, index + 1);
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  // Navigate search results
  const navigateSearch = (direction: "next" | "prev") => {
    if (searchResults.length === 0) return;

    const newIndex =
      direction === "next"
        ? (currentSearchIndex + 1) % searchResults.length
        : (currentSearchIndex - 1 + searchResults.length) %
          searchResults.length;

    setCurrentSearchIndex(newIndex);

    // Scroll to result
    const position = searchResults[newIndex];
    const textarea = document.getElementById(
      "transcript-textarea",
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(position, position + searchTerm.length);
    }
  };

  // Handle segment edit
  const handleSegmentEdit = (segment: TranscriptSegment) => {
    setSegmentToEdit(segment);
    setEditedSegmentText(segment.text);
    setShowEditDialog(true);
  };

  // Save segment edit
  const saveSegmentEdit = () => {
    if (segmentToEdit && onSegmentEdit) {
      onSegmentEdit(segmentToEdit.id, editedSegmentText);

      // Update the full transcript
      const updatedSegments = segments.map((s) =>
        s.id === segmentToEdit.id ? { ...s, text: editedSegmentText } : s,
      );
      const newTranscript = updatedSegments.map((s) => s.text).join(" ");
      setEditedTranscript(newTranscript);
      onTranscriptChange?.(newTranscript);
    }
    setShowEditDialog(false);
    setSegmentToEdit(null);
  };

  // Format timestamp
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(2, "0")}`;
  };

  // Get confidence color
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "default";
    if (confidence >= 0.9) return "success";
    if (confidence >= 0.7) return "warning";
    return "destructive";
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>Transcript</CardTitle>
          <div className="flex items-center gap-2">
            {/* Search Controls */}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-40 h-8"
                data-testid="input-search-transcript"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSearch}
                className="h-8 w-8"
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
              </Button>
              {searchResults.length > 0 && (
                <Badge variant="secondary">
                  {currentSearchIndex + 1}/{searchResults.length}
                </Badge>
              )}
            </div>

            {/* Edit Controls */}
            {!readOnly && (
              <>
                {!isEditing ? (
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-transcript"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedTranscript(transcript);
                      }}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        onTranscriptChange?.(editedTranscript);
                        setIsEditing(false);
                        onSave?.();
                      }}
                      data-testid="button-save-transcript"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit History */}
        {edits.length > 0 && (
          <div className="mt-2">
            <Badge variant="outline">
              {edits.length} edit{edits.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {isEditing ? (
          // Edit Mode - Full Text
          <div className="h-full">
            <Textarea
              id="transcript-textarea"
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              className="h-full resize-none font-mono"
              placeholder="Enter transcript..."
              data-testid="textarea-transcript"
            />
          </div>
        ) : segments.length > 0 ? (
          // Segment View
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-2">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  id={`segment-${segment.id}`}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer hover-elevate",
                    activeSegment?.id === segment.id &&
                      "bg-primary/10 border-primary",
                    selectedSegment === segment.id && "ring-2 ring-primary",
                  )}
                  onClick={() => {
                    setSelectedSegment(segment.id);
                    onSegmentClick?.(segment.start);
                  }}
                  data-testid={`segment-${segment.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          data-testid={`timestamp-${segment.id}`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimestamp(segment.start)}
                        </Badge>
                        {segment.speaker && (
                          <Badge variant="secondary" className="text-xs">
                            {segment.speaker}
                          </Badge>
                        )}
                        {segment.confidence && (
                          <Badge
                            variant={
                              getConfidenceColor(segment.confidence) as
                                | "default"
                                | "outline"
                                | "destructive"
                                | "secondary"
                            }
                            className="text-xs"
                          >
                            {Math.round(segment.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{segment.text}</p>
                    </div>
                    {!readOnly && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSegmentEdit(segment);
                        }}
                        className="h-8 w-8"
                        data-testid={`button-edit-segment-${segment.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          // Plain Text View
          <ScrollArea className="h-full">
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {editedTranscript}
            </p>
          </ScrollArea>
        )}
      </CardContent>

      {/* Edit Segment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {segmentToEdit && (
              <div className="space-y-2">
                <Label>Timestamp</Label>
                <Badge variant="outline">
                  {formatTimestamp(segmentToEdit.start)} -{" "}
                  {formatTimestamp(segmentToEdit.end)}
                </Badge>
              </div>
            )}
            <div className="space-y-2">
              <Label>Original Text</Label>
              <div className="p-2 rounded bg-muted text-sm">
                {segmentToEdit?.text}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Edited Text</Label>
              <Textarea
                value={editedSegmentText}
                onChange={(e) => setEditedSegmentText(e.target.value)}
                className="resize-none"
                rows={4}
                data-testid="textarea-edit-segment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-segment-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={saveSegmentEdit}
              data-testid="button-save-segment-edit"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

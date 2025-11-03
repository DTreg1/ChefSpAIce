/**
 * Extracted Text Component
 * 
 * Displays OCR extracted text with editing capabilities and correction tracking
 */

import { useState, useCallback, useEffect } from "react";
import { Edit2, Save, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Correction {
  id: string;
  originalText: string;
  correctedText: string;
  correctionType: "spelling" | "formatting" | "structure" | "other";
  confidence: number;
}

interface ExtractedTextProps {
  text: string;
  confidence: number;
  corrections?: Correction[];
  onSaveCorrection?: (correction: Omit<Correction, "id">) => void;
  readOnly?: boolean;
  className?: string;
}

export function ExtractedText({
  text,
  confidence,
  corrections = [],
  onSaveCorrection,
  readOnly = false,
  className
}: ExtractedTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  useEffect(() => {
    setHasChanges(editedText !== text);
  }, [editedText, text]);

  const handleStartEdit = useCallback(() => {
    if (!readOnly) {
      setIsEditing(true);
    }
  }, [readOnly]);

  const handleCancelEdit = useCallback(() => {
    setEditedText(text);
    setIsEditing(false);
    setHasChanges(false);
    setSelectedText("");
  }, [text]);

  const handleSaveEdit = useCallback(() => {
    if (hasChanges && onSaveCorrection && selectedText) {
      onSaveCorrection({
        originalText: selectedText,
        correctedText: editedText.substring(
          editedText.indexOf(selectedText),
          editedText.indexOf(selectedText) + selectedText.length
        ),
        correctionType: "other",
        confidence: 100,
      });
    }
    setIsEditing(false);
    setHasChanges(false);
    setSelectedText("");
  }, [hasChanges, onSaveCorrection, selectedText, editedText]);

  const handleTextSelect = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      setSelectedText(textarea.value.substring(start, end));
    }
  }, []);

  const getConfidenceColor = useCallback((conf: number) => {
    if (conf >= 90) return "text-green-600";
    if (conf >= 70) return "text-yellow-600";
    return "text-red-600";
  }, []);

  const getConfidenceBadgeVariant = useCallback((conf: number) => {
    if (conf >= 90) return "default" as const;
    if (conf >= 70) return "secondary" as const;
    return "destructive" as const;
  }, []);

  return (
    <Card className={cn("w-full", className)} data-testid="extracted-text-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Extracted Text</CardTitle>
        <div className="flex items-center gap-2">
          <Badge 
            variant={getConfidenceBadgeVariant(confidence)}
            data-testid="confidence-badge"
          >
            <span className={cn("mr-1", getConfidenceColor(confidence))}>
              {confidence.toFixed(1)}%
            </span>
            Confidence
          </Badge>
          {!readOnly && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              data-testid="button-edit"
            >
              <Edit2 className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveEdit}
                disabled={!hasChanges}
                data-testid="button-save"
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                data-testid="button-cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={confidence} className="h-2" data-testid="confidence-progress" />
        
        {confidence < 70 && (
          <Alert data-testid="alert-low-confidence">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Low confidence score. Please review and correct any errors in the extracted text.
            </AlertDescription>
          </Alert>
        )}

        <div className="relative">
          {isEditing ? (
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onSelect={handleTextSelect}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Extracted text will appear here..."
              data-testid="textarea-edit"
            />
          ) : (
            <div
              className="min-h-[200px] whitespace-pre-wrap rounded-md border bg-muted/50 p-3 font-mono text-sm"
              data-testid="text-display"
            >
              {editedText || "No text extracted yet..."}
            </div>
          )}
        </div>

        {corrections.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Corrections Applied</h4>
            <div className="space-y-1">
              {corrections.map((correction) => (
                <div
                  key={correction.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-xs"
                  data-testid={`correction-${correction.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="line-through opacity-60">
                      {correction.originalText}
                    </span>
                    <span>→</span>
                    <span className="font-medium">{correction.correctedText}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {correction.correctionType}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasChanges && (
          <Alert data-testid="alert-unsaved-changes">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Click Save to apply corrections.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
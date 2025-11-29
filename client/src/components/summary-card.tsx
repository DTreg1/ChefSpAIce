import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy, Edit2, Check, X, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Summary } from "@shared/schema";

interface SummaryCardProps {
  summary: Summary;
  onEdit?: (summaryId: string, editedText: string) => Promise<void>;
  showOriginal?: boolean;
}

export default function SummaryCard({ summary, onEdit, showOriginal = false }: SummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(summary.summary || '');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const compressionRatio = summary.wordCountOriginal && summary.wordCountSummary
    ? Math.round((1 - summary.wordCountSummary / summary.wordCountOriginal) * 100)
    : summary.compressionRatio ? Math.round(summary.compressionRatio * 100) : 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      description: "Summary copied to clipboard",
    });
  };

  const handleSave = async () => {
    if (onEdit) {
      try {
        await onEdit(summary.id, editedText);
        setIsEditing(false);
        toast({
          description: "Summary updated successfully",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          description: "Failed to update summary",
        });
      }
    }
  };

  const handleCancel = () => {
    setEditedText(summary.summary || '');
    setIsEditing(false);
  };

  const formatSummaryType = (type: string) => {
    switch (type) {
      case 'tldr':
        return 'TL;DR';
      case 'bullet':
        return 'Bullet Points';
      case 'paragraph':
        return 'Paragraph';
      default:
        return type;
    }
  };

  return (
    <Card className="w-full" data-testid="card-summary">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Summary</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="badge-summary-type">
              {formatSummaryType(summary.summaryType || 'summary')}
            </Badge>
            <Badge variant="outline" className="text-green-600 dark:text-green-400" data-testid="badge-compression">
              -{compressionRatio}%
            </Badge>
          </div>
        </div>
        <CardDescription>
          {summary.wordCountSummary || 0} words • {summary.summaryType === 'bullets' ? 'bullets' : 'summary'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Text */}
        <div className="space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[100px] resize-none"
                placeholder="Edit your summary..."
                data-testid="textarea-edit-summary"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  data-testid="button-save-edit"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap" data-testid="text-summary">
                {editedText}
              </div>
            </div>
          )}
        </div>

        {/* Key Points */}
        {summary.keyPoints && summary.keyPoints.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Key Points</h4>
            <ul className="space-y-1" data-testid="list-key-points">
              {summary.keyPoints.map((point, idx) => (
                <li key={idx} className="text-sm flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Original Content (Expandable) */}
        {showOriginal && summary.originalContent && (
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between"
              data-testid="button-toggle-original"
            >
              <span>Original Content ({summary.wordCountOriginal || 0} words)</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {isExpanded && (
              <div className="mt-4 p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap" data-testid="text-original-content">
                  {summary.originalContent}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          data-testid="button-copy-summary"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <Copy className="h-4 w-4 mr-1" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        {onEdit && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-summary"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
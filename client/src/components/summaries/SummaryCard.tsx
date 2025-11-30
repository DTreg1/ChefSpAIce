import { useState, useEffect, memo } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Edit, 
  Save, 
  X,
  Zap
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

interface SummaryCardProps {
  summary: string;
  originalContent?: string;
  type: 'tldr' | 'bullet' | 'paragraph';
  wordCount: number;
  originalWordCount?: number;
  keyPoints?: string[];
  isEdited?: boolean;
  compressionRatio?: number;
  onEdit?: (newText: string) => void;
  onDelete?: () => void;
  className?: string;
}

export const SummaryCard = memo(function SummaryCard({
  summary,
  originalContent,
  type,
  wordCount,
  originalWordCount,
  keyPoints,
  isEdited = false,
  compressionRatio,
  onEdit,
  onDelete,
  className = ""
}: SummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(summary);

  useEffect(() => {
    setEditedText(summary);
    setIsEditing(false);
    setIsExpanded(false);
  }, [summary]);

  const handleSave = () => {
    if (onEdit && editedText !== summary) {
      onEdit(editedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(summary);
    setIsEditing(false);
  };

  const formatType = (type: string) => {
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

  const renderSummary = () => {
    if (isEditing) {
      return (
        <Textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-[100px] resize-y"
          data-testid="textarea-edit-summary"
        />
      );
    }

    if (type === 'bullet') {
      const bullets = summary.split('\n').filter(line => line.trim());
      return (
        <ul className="space-y-2">
          {bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground mt-1">•</span>
              <span className="flex-1">{bullet.replace(/^[•\-*]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      );
    }

    return <p className="whitespace-pre-wrap">{summary}</p>;
  };

  return (
    <Card className={`hover-elevate ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" data-testid="badge-summary-type">
              {formatType(type)}
            </Badge>
            {isEdited && (
              <Badge variant="outline" data-testid="badge-edited">
                <Edit className="h-3 w-3 mr-1" />
                Edited
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-summary"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {originalContent && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                data-testid="button-toggle-expand"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                data-testid="button-delete-summary"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {renderSummary()}

        {isEditing && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleSave}
              data-testid="button-save-edit"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancel}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
          </div>
        )}

        <AnimatePresence>
          {isExpanded && originalContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t pt-4"
            >
              <h4 className="font-semibold text-sm mb-2 text-muted-foreground">
                Original Content
              </h4>
              <div className="max-h-[400px] overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {originalContent}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {keyPoints && keyPoints.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
              <Zap className="h-4 w-4" />
              Key Points
            </h4>
            <ul className="space-y-1">
              {keyPoints.map((point, index) => (
                <li 
                  key={index} 
                  className="text-sm text-muted-foreground flex items-start gap-2"
                  data-testid={`text-keypoint-${index}`}
                >
                  <span className="text-primary">→</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span data-testid="text-word-count">
              {wordCount} words
            </span>
            {originalWordCount && (
              <>
                <span>•</span>
                <span data-testid="text-original-word-count">
                  Original: {originalWordCount} words
                </span>
              </>
            )}
          </div>
          {compressionRatio !== undefined && (
            <Badge variant="outline" className="ml-auto" data-testid="badge-compression">
              {compressionRatio}% reduction
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
});
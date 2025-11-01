import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, X, Copy, Check } from "lucide-react";
import { useState } from "react";
import { type GeneratedDraft } from "@shared/schema";

interface DraftEditorProps {
  draft: GeneratedDraft;
  onSave: (content: string) => void;
  onCancel: () => void;
  onCopy?: (content: string) => void;
}

const TONE_OPTIONS = [
  { value: "formal", label: "Formal", description: "Professional and businesslike" },
  { value: "casual", label: "Casual", description: "Relaxed and informal" },
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "apologetic", label: "Apologetic", description: "Express regret" },
  { value: "solution-focused", label: "Solution-Focused", description: "Emphasize solutions" },
  { value: "empathetic", label: "Empathetic", description: "Show understanding" },
];

export function DraftEditor({ draft, onSave, onCancel, onCopy }: DraftEditorProps) {
  const [content, setContent] = useState(draft.editedContent || draft.draftContent);
  const [tone, setTone] = useState(draft.tone || "formal");
  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(value !== draft.draftContent);
  };

  const handleSave = () => {
    onSave(content);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.(content);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const selectedTone = TONE_OPTIONS.find((t) => t.value === tone);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Edit Draft</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" data-testid="tone-badge-display">
              {selectedTone?.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              data-testid="button-close-editor"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tone-selector">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger id="tone-selector" data-testid="select-tone">
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="draft-content">Draft Content</Label>
          <Textarea
            id="draft-content"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Edit your draft here..."
            className="min-h-[200px] resize-none"
            data-testid="textarea-draft-content"
          />
        </div>
        {hasChanges && (
          <p className="text-sm text-muted-foreground">
            You have unsaved changes
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          data-testid="button-save-draft"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
        <Button
          variant="outline"
          onClick={handleCopy}
          disabled={copied}
          data-testid="button-copy-edited"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          data-testid="button-cancel-edit"
        >
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}
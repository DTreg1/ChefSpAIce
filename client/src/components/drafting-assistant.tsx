import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, RotateCcw, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type GeneratedDraft } from "@shared/schema";
import { DraftSuggestions } from "./DraftSuggestions";
import { DraftEditor } from "./DraftEditor";
import { useToast } from "@/hooks/use-toast";

const CONTEXT_TYPES = [
  { value: "email", label: "Email", icon: Send },
  { value: "message", label: "Message", icon: MessageSquare },
  { value: "comment", label: "Comment", icon: MessageSquare },
  { value: "customer_complaint", label: "Customer Complaint", icon: MessageSquare },
];

const QUICK_REPLIES = [
  "Thank you for your message.",
  "I'll look into this and get back to you.",
  "Could you provide more details?",
  "I understand your concern.",
];

export function DraftingAssistant() {
  const [originalMessage, setOriginalMessage] = useState("");
  const [contextType, setContextType] = useState<string>("email");
  const [subject, setSubject] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>(["formal", "casual", "friendly"]);
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedDraft[]>([]);
  const [editingDraft, setEditingDraft] = useState<GeneratedDraft | null>(null);
  const { toast } = useToast();

  // Generate drafts mutation
  const generateDraftsMutation = useMutation({
    mutationFn: async (data: { originalMessage: string; contextType: string; tones: string[]; subject?: string; approach?: string }) =>
      apiRequest<GeneratedDraft[]>("/api/drafts/generate", "POST", data),
    onSuccess: (drafts) => {
      setGeneratedDrafts(drafts);
      toast({
        title: "Drafts Generated",
        description: `Generated ${drafts.length} draft variations`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate drafts. Please try again.",
        variant: "destructive",
      });
      console.error("Error generating drafts:", error);
    },
  });

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async (data: { draftId: string; selected: boolean; edited?: boolean; editedContent?: string }) =>
      apiRequest("/api/drafts/feedback", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts/history"] });
    },
  });

  // Improve draft mutation
  const improveDraftMutation = useMutation({
    mutationFn: async (data: { draft: string; improvements: string[] }) =>
      apiRequest<{ improved: string; changes: string[]; suggestions: string[] }>("/api/drafts/improve", "POST", data),
    onSuccess: (result) => {
      toast({
        title: "Draft Improved",
        description: `Applied ${result.changes.length} improvements`,
      });
    },
  });

  const handleGenerateDrafts = () => {
    if (!originalMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to respond to",
        variant: "destructive",
      });
      return;
    }

    const tones = contextType === "customer_complaint"
      ? ["apologetic", "solution-focused", "empathetic"]
      : selectedTones;

    generateDraftsMutation.mutate({ 
      originalMessage, 
      contextType, 
      tones,
      subject: subject.trim() || undefined
    });
  };

  const handleSelectDraft = (draft: GeneratedDraft) => {
    feedbackMutation.mutate({ draftId: draft.id, selected: true });
  };

  const handleEditDraft = (draft: GeneratedDraft) => {
    setEditingDraft(draft);
  };

  const handleSaveEdit = (content: string) => {
    if (editingDraft) {
      feedbackMutation.mutate({
        draftId: editingDraft.id,
        selected: true,
        edited: true,
        editedContent: content,
      });
      setEditingDraft(null);
      toast({
        title: "Draft Saved",
        description: "Your edited draft has been saved",
      });
    }
  };

  const handleRegenerateDraft = async (draft: GeneratedDraft) => {
    const newTone = draft.metadata?.tone || "formal";
    generateDraftsMutation.mutate({
      originalMessage,
      contextType,
      tones: [newTone],
    });
  };

  const handleQuickReply = (reply: string) => {
    setOriginalMessage(reply);
  };

  const handleReset = () => {
    setOriginalMessage("");
    setSubject("");
    setGeneratedDrafts([]);
    setEditingDraft(null);
  };

  if (editingDraft) {
    return (
      <DraftEditor
        draft={editingDraft}
        onSave={handleSaveEdit}
        onCancel={() => setEditingDraft(null)}
        onCopy={(content) => handleSelectDraft(editingDraft)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Intelligent Drafting Assistant
          </CardTitle>
          <CardDescription>
            Generate contextual responses with different tones for emails, messages, and comments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="context-type">Context Type</Label>
            <Select value={contextType} onValueChange={setContextType}>
              <SelectTrigger id="context-type" data-testid="select-context-type">
                <SelectValue placeholder="Select context type" />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject/Topic (Optional)</Label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Order Issue, Meeting Request, Product Feedback..."
              className="w-full px-3 py-2 border rounded-md bg-background"
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="original-message">Message to Respond To</Label>
            <Textarea
              id="original-message"
              value={originalMessage}
              onChange={(e) => setOriginalMessage(e.target.value)}
              placeholder="Paste the email, message, or comment you want to respond to..."
              className="min-h-[150px] resize-none"
              data-testid="textarea-original-message"
            />
          </div>

          {contextType !== "customer_complaint" && (
            <div className="space-y-2">
              <Label>Response Tones</Label>
              <div className="flex flex-wrap gap-2">
                {["formal", "casual", "friendly", "apologetic", "solution-focused", "empathetic"].map((tone) => (
                  <Badge
                    key={tone}
                    variant={selectedTones.includes(tone) ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => {
                      if (selectedTones.includes(tone)) {
                        setSelectedTones(selectedTones.filter((t) => t !== tone));
                      } else if (selectedTones.length < 3) {
                        setSelectedTones([...selectedTones, tone]);
                      }
                    }}
                    data-testid={`tone-option-${tone}`}
                  >
                    {tone}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Select up to 3 tones for your draft variations
              </p>
            </div>
          )}

          {contextType === "customer_complaint" && (
            <Alert>
              <AlertDescription>
                Customer complaint responses will automatically use apologetic, solution-focused, and empathetic tones.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Quick Replies</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((reply) => (
                <Button
                  key={reply}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickReply(reply)}
                  data-testid="button-quick-reply"
                >
                  {reply}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            onClick={handleGenerateDrafts}
            disabled={!originalMessage.trim() || generateDraftsMutation.isPending}
            data-testid="button-generate-drafts"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateDraftsMutation.isPending ? "Generating..." : "Generate Drafts"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!originalMessage && generatedDrafts.length === 0}
            data-testid="button-reset"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </CardFooter>
      </Card>

      {generatedDrafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Drafts</h3>
          <DraftSuggestions
            drafts={generatedDrafts}
            isLoading={generateDraftsMutation.isPending}
            onSelectDraft={handleSelectDraft}
            onEditDraft={handleEditDraft}
            onRegenerateDraft={handleRegenerateDraft}
          />
        </div>
      )}
    </div>
  );
}
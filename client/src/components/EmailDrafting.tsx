/**
 * Smart Email/Message Drafting Component (Task 9)
 * 
 * Generates contextual email/message drafts with multiple variations.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Mail,
  Copy,
  Check,
  Sparkles,
  FileText,
  Send,
  History,
  RefreshCw,
  Loader2,
  Edit3,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DraftTemplate {
  id: string;
  contextType: string;
  templatePrompt: string;
  usageCount: number;
}

interface GeneratedDraft {
  id: string;
  userId: string;
  contextType: string;
  draftContent: string;
  tone: string;
  variations: any;
  selected: boolean;
  edited: boolean;
  createdAt: string;
}

export function EmailDrafting() {
  const [contextType, setContextType] = useState("email");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState<"formal" | "casual" | "friendly" | "professional">("professional");
  const [keyPoints, setKeyPoints] = useState("");
  const [previousMessage, setPreviousMessage] = useState("");
  const [numberOfVariations, setNumberOfVariations] = useState(3);
  const [selectedDraft, setSelectedDraft] = useState<GeneratedDraft | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  // Fetch templates
  const { data: templates = [] } = useQuery<DraftTemplate[]>({
    queryKey: ["/api/drafts/templates", { contextType }]
  });

  // Fetch draft history
  const { data: draftHistory = [], isLoading: historyLoading } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/drafts/history"],
    enabled: showHistory
  });

  // Generate drafts
  const generateDraftsMutation = useMutation({
    mutationFn: async () => {
      const context = {
        recipient: recipient || undefined,
        subject: subject || undefined,
        purpose,
        tone,
        keyPoints: keyPoints ? keyPoints.split("\n").filter(p => p.trim()) : undefined,
        previousMessage: previousMessage || undefined
      };

      const response = await apiRequest("POST", "/api/drafts/generate", {
        contextType,
        context,
        numberOfVariations
      });
      return response.json();
    },
    onSuccess: (data: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts/history"] });
      toast({
        title: "Drafts Generated",
        description: `${data.length} draft variations created successfully.`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate drafts.",
        variant: "destructive"
      });
    }
  });

  // Select draft
  const selectDraftMutation = useMutation({
    mutationFn: async ({ id, edited }: { id: string; edited: boolean }) => {
      return apiRequest("POST", `/api/drafts/${id}/select`, { edited });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts/history"] });
      toast({
        title: "Draft Selected",
        description: "Draft marked as used."
      });
    }
  });

  // Improve draft
  const improveDraftMutation = useMutation({
    mutationFn: async (draft: string) => {
      const response = await apiRequest("POST", "/api/drafts/improve", { draft });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Draft Improved",
        description: "Your draft has been polished."
      });
    }
  });

  // Generate quick replies
  const quickReplyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/drafts/quick-reply", {
        message: previousMessage,
        sentiment: "positive"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quick Replies Generated",
        description: "Select a reply option."
      });
    }
  });

  const handleCopyDraft = (draft: GeneratedDraft) => {
    navigator.clipboard.writeText(draft.draftContent);
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(null), 2000);
    selectDraftMutation.mutate({ id: draft.id, edited: false });
    toast({
      title: "Copied",
      description: "Draft copied to clipboard."
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Draft Configuration</CardTitle>
              <CardDescription>
                Set up your message context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Context Type */}
              <div className="space-y-2">
                <Label>Message Type</Label>
                <Select value={contextType} onValueChange={setContextType}>
                  <SelectTrigger data-testid="select-context-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <Label>Recipient (Optional)</Label>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g., John Smith, Team"
                  data-testid="input-recipient"
                />
              </div>

              {/* Subject */}
              {contextType === "email" && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                    data-testid="input-subject"
                  />
                </div>
              )}

              {/* Purpose */}
              <div className="space-y-2">
                <Label>Purpose *</Label>
                <Textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="What's the main purpose of this message?"
                  rows={3}
                  required
                  data-testid="textarea-purpose"
                />
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone as any}>
                  <SelectTrigger data-testid="select-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Key Points */}
              <div className="space-y-2">
                <Label>Key Points (Optional)</Label>
                <Textarea
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  placeholder="Enter each point on a new line"
                  rows={3}
                  data-testid="textarea-key-points"
                />
              </div>

              {/* Previous Message (for replies) */}
              <div className="space-y-2">
                <Label>Replying To (Optional)</Label>
                <Textarea
                  value={previousMessage}
                  onChange={(e) => setPreviousMessage(e.target.value)}
                  placeholder="Paste the message you're replying to"
                  rows={3}
                  data-testid="textarea-previous-message"
                />
                {previousMessage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickReplyMutation.mutate()}
                    disabled={quickReplyMutation.isPending}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Generate Quick Replies
                  </Button>
                )}
              </div>

              {/* Number of Variations */}
              <div className="space-y-2">
                <Label>Number of Variations</Label>
                <Select 
                  value={numberOfVariations.toString()} 
                  onValueChange={(v) => setNumberOfVariations(parseInt(v))}
                >
                  <SelectTrigger data-testid="select-variations">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Draft</SelectItem>
                    <SelectItem value="2">2 Drafts</SelectItem>
                    <SelectItem value="3">3 Drafts</SelectItem>
                    <SelectItem value="4">4 Drafts</SelectItem>
                    <SelectItem value="5">5 Drafts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full"
                onClick={() => generateDraftsMutation.mutate()}
                disabled={!purpose.trim() || generateDraftsMutation.isPending}
                data-testid="button-generate-drafts"
              >
                {generateDraftsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Drafts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Templates */}
          {templates.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {templates.map((template: DraftTemplate) => (
                    <div
                      key={template.id}
                      className="p-2 border rounded cursor-pointer hover-elevate"
                      onClick={() => setPurpose(template.templatePrompt)}
                      data-testid={`template-${template.id}`}
                    >
                      <p className="text-sm">{template.templatePrompt}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {template.usageCount} times
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Generated Drafts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Generated Drafts</CardTitle>
                  <CardDescription>
                    Select and customize your preferred draft
                  </CardDescription>
                </div>
                <Sheet open={showHistory} onOpenChange={setShowHistory}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Draft History</SheetTitle>
                      <SheetDescription>
                        Your previously generated drafts
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      {historyLoading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                      ) : draftHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No draft history</p>
                      ) : (
                        draftHistory.map((draft: GeneratedDraft) => (
                          <Card key={draft.id}>
                            <CardContent className="p-4 space-y-2">
                              <div className="flex justify-between items-start">
                                <Badge variant="outline">{draft.contextType}</Badge>
                                <Badge variant="secondary">{draft.tone}</Badge>
                              </div>
                              <p className="text-sm line-clamp-3">{draft.draftContent}</p>
                              <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(draft.createdAt), "MMM d, h:mm a")}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopyDraft(draft)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardContent>
              {generateDraftsMutation.data ? (
                <Tabs defaultValue="0">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${generateDraftsMutation.data.length}, 1fr)` }}>
                    {generateDraftsMutation.data.map((_: any, index: number) => (
                      <TabsTrigger key={index} value={index.toString()}>
                        Draft {index + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {generateDraftsMutation.data.map((draft: GeneratedDraft, index: number) => (
                    <TabsContent key={index} value={index.toString()} className="space-y-4">
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          {/* Draft Metadata */}
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                              <Badge>{draft.tone}</Badge>
                              {draft.variations?.approach && (
                                <Badge variant="outline">{draft.variations.approach}</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => improveDraftMutation.mutate(draft.draftContent)}
                                disabled={improveDraftMutation.isPending}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Improve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyDraft(draft)}
                                data-testid={`button-copy-${index}`}
                              >
                                {copiedId === draft.id ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                Copy
                              </Button>
                            </div>
                          </div>

                          {/* Subject Line (for emails) */}
                          {draft.variations?.subject && (
                            <div className="p-2 bg-muted rounded">
                              <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                              <p className="font-medium">{draft.variations.subject}</p>
                            </div>
                          )}

                          {/* Draft Content */}
                          <div className="space-y-2">
                            <Textarea
                              value={draft.draftContent}
                              onChange={(e) => {
                                const updatedDraft = { ...draft, draftContent: e.target.value };
                                setSelectedDraft(updatedDraft);
                              }}
                              rows={10}
                              className="resize-none"
                              data-testid={`textarea-draft-${index}`}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                selectDraftMutation.mutate({ 
                                  id: draft.id, 
                                  edited: selectedDraft?.id === draft.id && selectedDraft.draftContent !== draft.draftContent 
                                });
                              }}
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Mark as Used
                            </Button>
                            <Button>
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Improvement Suggestions */}
                      {improveDraftMutation.data && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Improvements Applied</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{improveDraftMutation.data.improved}</p>
                            <div className="mt-2 space-y-1">
                              {improveDraftMutation.data.changes?.map((change: string, i: number) => (
                                <p key={i} className="text-xs text-muted-foreground">• {change}</p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center p-8">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No drafts yet</h3>
                  <p className="text-muted-foreground">
                    Configure your message and generate draft variations
                  </p>
                </div>
              )}

              {/* Quick Replies */}
              {quickReplyMutation.data && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Reply Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quickReplyMutation.data.map((reply: string, index: number) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg cursor-pointer hover-elevate"
                        onClick={() => setPurpose(reply)}
                      >
                        <p className="text-sm">{reply}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
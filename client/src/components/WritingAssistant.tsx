/**
 * Writing Assistant Component (Task 10)
 * 
 * Comprehensive writing assistance with grammar checking, style suggestions, and tone adjustment.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  AlertCircle,
  Info,
  FileText,
  Edit3,
  BarChart3,
  Zap,
  RefreshCw,
  Copy,
  Check,
  X,
  TrendingUp,
  BookOpen,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WritingSession {
  id: string;
  userId: string;
  originalText: string;
  improvedText: string | null;
  improvementsApplied: string[] | null;
  documentId: string | null;
}

interface WritingSuggestion {
  suggestionType: string;
  originalSnippet: string;
  suggestedSnippet: string;
  reason?: string;
}

interface AnalysisResult {
  overallScore: number;
  suggestions: WritingSuggestion[];
  metrics: {
    readability: number;
    clarity: number;
    tone: string;
    wordCount: number;
    sentenceCount: number;
  };
}

interface WritingStats {
  totalSessions: number;
  acceptedSuggestions: number;
  totalSuggestions: number;
  commonIssues: Array<{ type: string; count: number }>;
}

export function WritingAssistant() {
  const [text, setText] = useState("");
  const [textType, setTextType] = useState("general");
  const [targetTone, setTargetTone] = useState<string | undefined>(undefined);
  const [checkOptions, setCheckOptions] = useState({
    grammar: true,
    style: true,
    tone: true,
    clarity: true,
    conciseness: false
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [copiedText, setCopiedText] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  // Fetch writing stats
  const { data: stats } = useQuery<WritingStats>({
    queryKey: ["/api/writing/stats"]
  });

  // Analyze text
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const checkFor = Object.entries(checkOptions)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key);

      const response = await apiRequest("/api/writing/analyze", "POST", {
        text,
        type: textType,
        targetTone,
        checkFor
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      setAnalysisResult(data.analysis);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.analysis.suggestions.length} suggestions`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze text.",
        variant: "destructive"
      });
    }
  });

  // Improve text
  const improveMutation = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) return;

      const suggestionIds = Array.from(selectedSuggestions).map(
        index => analysisResult?.suggestions[index]?.suggestionType || ""
      );

      const response = await apiRequest("/api/writing/improve", "POST", {
        sessionId: currentSessionId,
        suggestionIds
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data) {
        setText(data.improvedText || text);
        setSelectedSuggestions(new Set());
        toast({
          title: "Text Improved",
          description: "Applied selected improvements"
        });
      }
    }
  });

  // Adjust tone
  const adjustToneMutation = useMutation({
    mutationFn: async (newTone: string) => {
      const response = await apiRequest("POST", "/api/writing/adjust-tone", {
        text,
        currentTone: analysisResult?.metrics.tone,
        targetTone: newTone
      });
      return response.json();
    },
    onSuccess: (data) => {
      setText(data.adjustedText);
      toast({
        title: "Tone Adjusted",
        description: `Changed tone to ${targetTone}`
      });
    }
  });

  // Paraphrase text
  const paraphraseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/writing/paraphrase", {
        text,
        style: textType
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Paraphrased",
        description: "Generated alternative versions"
      });
    }
  });

  // Check plagiarism
  const plagiarismMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/writing/check-plagiarism", { 
        text 
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Plagiarism Check",
        description: `Originality score: ${data.originalityScore}%`
      });
    }
  });

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast({
      title: "Copied",
      description: "Text copied to clipboard"
    });
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "grammar":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "style":
        return <Edit3 className="h-4 w-4 text-blue-500" />;
      case "tone":
        return <Zap className="h-4 w-4 text-purple-500" />;
      case "clarity":
        return <Info className="h-4 w-4 text-yellow-500" />;
      case "conciseness":
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Writing Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Writing Assistant</CardTitle>
                  <CardDescription>
                    Improve your writing with AI-powered suggestions
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  disabled={!text}
                  data-testid="button-copy-text"
                >
                  {copiedText ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Text Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Your Text</Label>
                  <span className="text-sm text-muted-foreground">
                    {text.split(/\s+/).filter(w => w).length} words • {text.split(/[.!?]+/).filter(s => s.trim()).length} sentences
                  </span>
                </div>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste or type your text here..."
                  rows={12}
                  className="resize-none"
                  data-testid="textarea-main-text"
                />
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label>Text Type</Label>
                  <Select value={textType} onValueChange={setTextType}>
                    <SelectTrigger className="w-40" data-testid="select-text-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Tone (Optional)</Label>
                  <Select value={targetTone} onValueChange={setTargetTone}>
                    <SelectTrigger className="w-40" data-testid="select-target-tone">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Check Options */}
              <div className="space-y-2">
                <Label>Check For</Label>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(checkOptions).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => 
                          setCheckOptions(prev => ({ ...prev, [key]: checked }))
                        }
                        data-testid={`switch-${key}`}
                      />
                      <Label className="capitalize">{key}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={!text.trim() || analyzeMutation.isPending}
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analyze Text
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => paraphraseMutation.mutate()}
                  disabled={!text.trim() || paraphraseMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Paraphrase
                </Button>
                <Button
                  variant="outline"
                  onClick={() => plagiarismMutation.mutate()}
                  disabled={!text.trim() || plagiarismMutation.isPending}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Check Originality
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  Review and apply suggested improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="suggestions">
                  <TabsList>
                    <TabsTrigger value="suggestions">
                      Suggestions ({analysisResult.suggestions.length})
                    </TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="paraphrase">Paraphrase</TabsTrigger>
                  </TabsList>

                  <TabsContent value="suggestions" className="space-y-4">
                    {analysisResult.suggestions.length === 0 ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          No issues found! Your text looks great.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {analysisResult.suggestions.map((suggestion, index) => (
                            <Card
                              key={index}
                              className={`cursor-pointer transition-colors ${
                                selectedSuggestions.has(index) ? "border-primary" : ""
                              }`}
                              onClick={() => {
                                const newSet = new Set(selectedSuggestions);
                                if (newSet.has(index)) {
                                  newSet.delete(index);
                                } else {
                                  newSet.add(index);
                                }
                                setSelectedSuggestions(newSet);
                              }}
                              data-testid={`suggestion-${index}`}
                            >
                              <CardContent className="p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    {getSuggestionIcon(suggestion.suggestionType)}
                                    <Badge variant="outline" className="capitalize">
                                      {suggestion.suggestionType}
                                    </Badge>
                                  </div>
                                  {selectedSuggestions.has(index) && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                                    <span className="line-through">{suggestion.originalSnippet}</span>
                                  </div>
                                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                                    {suggestion.suggestedSnippet}
                                  </div>
                                </div>
                                {suggestion.reason && (
                                  <p className="text-sm text-muted-foreground">
                                    {suggestion.reason}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        {selectedSuggestions.size > 0 && (
                          <Button
                            onClick={() => improveMutation.mutate()}
                            disabled={improveMutation.isPending}
                            className="w-full"
                          >
                            Apply {selectedSuggestions.size} Selected Improvement{selectedSuggestions.size !== 1 ? "s" : ""}
                          </Button>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="metrics" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Overall Score</span>
                            <span className={`text-2xl font-bold ${getScoreColor(analysisResult.overallScore)}`}>
                              {analysisResult.overallScore}%
                            </span>
                          </div>
                          <Progress value={analysisResult.overallScore} className="mt-2" />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Readability</span>
                            <span className={`text-2xl font-bold ${getScoreColor(analysisResult.metrics.readability)}`}>
                              {analysisResult.metrics.readability}%
                            </span>
                          </div>
                          <Progress value={analysisResult.metrics.readability} className="mt-2" />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Clarity</span>
                            <span className={`text-2xl font-bold ${getScoreColor(analysisResult.metrics.clarity)}`}>
                              {analysisResult.metrics.clarity}%
                            </span>
                          </div>
                          <Progress value={analysisResult.metrics.clarity} className="mt-2" />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Current Tone</span>
                            <Badge className="capitalize">{analysisResult.metrics.tone}</Badge>
                          </div>
                          {targetTone && targetTone !== analysisResult.metrics.tone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 w-full"
                              onClick={() => adjustToneMutation.mutate(targetTone)}
                            >
                              Adjust to {targetTone}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="paraphrase" className="space-y-4">
                    {paraphraseMutation.data ? (
                      <div className="space-y-3">
                        {paraphraseMutation.data.map((variation: string, index: number) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline">Version {index + 1}</Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setText(variation)}
                                >
                                  Use This
                                </Button>
                              </div>
                              <p className="text-sm">{variation}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Click "Paraphrase" to generate alternative versions of your text.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Plagiarism Results */}
          {plagiarismMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle>Originality Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Originality Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(plagiarismMutation.data.originalityScore)}`}>
                      {plagiarismMutation.data.originalityScore}%
                    </span>
                  </div>
                  <Progress value={plagiarismMutation.data.originalityScore} />
                  {plagiarismMutation.data.flaggedPhrases?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Flagged Phrases:</p>
                      {plagiarismMutation.data.flaggedPhrases.map((phrase: string, i: number) => (
                        <p key={i} className="text-sm text-muted-foreground">• {phrase}</p>
                      ))}
                    </div>
                  )}
                  {plagiarismMutation.data.recommendation && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {plagiarismMutation.data.recommendation}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics Panel */}
        <div className="space-y-6">
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Your Writing Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Sessions</span>
                  <span className="font-medium">{stats.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Suggestions Applied</span>
                  <span className="font-medium">
                    {stats.acceptedSuggestions} / {stats.totalSuggestions}
                  </span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Common Issues</p>
                  {stats.commonIssues.map((issue) => (
                    <div key={issue.type} className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{issue.type}</span>
                      <Badge variant="outline">{issue.count}</Badge>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {stats.acceptedSuggestions > 0 
                      ? `${Math.round((stats.acceptedSuggestions / stats.totalSuggestions) * 100)}% improvement rate`
                      : "Start improving your writing"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Writing Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Be Concise</p>
                    <p className="text-xs text-muted-foreground">
                      Remove unnecessary words and phrases
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Use Active Voice</p>
                    <p className="text-xs text-muted-foreground">
                      Makes your writing more direct and engaging
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Vary Sentence Length</p>
                    <p className="text-xs text-muted-foreground">
                      Mix short and long sentences for better flow
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Check Your Tone</p>
                    <p className="text-xs text-muted-foreground">
                      Match your tone to your audience
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
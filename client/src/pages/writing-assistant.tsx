/**
 * Writing Assistant Page
 * 
 * Comprehensive writing improvement tool with grammar checking, 
 * style suggestions, tone adjustment, and content recommendations.
 */

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WritingEditor, type WritingSuggestion } from "@/components/writing-editor";
import { GrammarHighlighter } from "@/components/grammar-highlighter";
import { ToneSelector, type WritingTone } from "@/components/tone-selector";
import { SuggestionSidebar } from "@/components/suggestion-sidebar";
import { WritingStats } from "@/components/writing-stats";
import { Wand2, Download, Copy, CheckCircle } from "lucide-react";

interface AnalysisResponse {
  sessionId: string;
  originalText: string;
  metrics: {
    wordCount: number;
    readabilityScore: number;
    tone: string;
    targetTone?: string;
  };
  suggestions: WritingSuggestion[];
}

export default function WritingAssistant() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    wordCount: 0,
    readabilityScore: 50,
    tone: "casual" as WritingTone,
    targetTone: "professional" as WritingTone,
    sentenceCount: 0,
    avgWordsPerSentence: 0,
    grammarErrors: 0,
    spellingErrors: 0,
    styleIssues: 0,
  });
  const [activeTab, setActiveTab] = useState("editor");

  // Analyze text mutation
  const analyzeMutation = useMutation({
    mutationFn: async (data: { text: string; targetTone: WritingTone }) => {
      const response = await apiRequest("/api/writing/analyze", "POST", {
        text: data.text,
        options: {
          checkGrammar: true,
          checkSpelling: true,
          checkStyle: true,
          suggestTone: true,
          targetTone: data.targetTone,
        },
      });
      return response as AnalysisResponse;
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
      setSessionId(data.sessionId);
      setMetrics(prev => ({
        ...prev,
        wordCount: data.metrics.wordCount,
        readabilityScore: data.metrics.readabilityScore,
        tone: data.metrics.tone as WritingTone,
        targetTone: data.metrics.targetTone as WritingTone || prev.targetTone,
        grammarErrors: data.suggestions.filter((s: WritingSuggestion) => s.suggestionType === "grammar").length,
        spellingErrors: data.suggestions.filter((s: WritingSuggestion) => s.suggestionType === "spelling").length,
        styleIssues: data.suggestions.filter((s: WritingSuggestion) => s.suggestionType === "style").length,
      }));
      toast({
        title: "Analysis Complete",
        description: `Found ${data.suggestions.length} suggestions for improvement.`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze text. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Tone adjustment mutation
  const toneMutation = useMutation({
    mutationFn: async (targetTone: WritingTone) => {
      const response = await apiRequest("/api/writing/tone", "POST", {
        text: improvedText || text,
        targetTone,
      });
      return response as { adjustedText: string };
    },
    onSuccess: (data) => {
      setImprovedText(data.adjustedText);
      toast({
        title: "Tone Adjusted",
        description: `Text has been adjusted to ${metrics.targetTone} tone.`,
      });
    },
    onError: () => {
      toast({
        title: "Tone Adjustment Failed",
        description: "Unable to adjust tone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    // Update basic metrics in real-time
    const words = newText.split(/\s+/).filter(w => w.length > 0);
    const sentences = newText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    setMetrics(prev => ({
      ...prev,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
    }));
  }, []);

  const handleAnalyze = () => {
    if (text.trim()) {
      analyzeMutation.mutate({ text, targetTone: metrics.targetTone });
    }
  };

  const handleAcceptSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId ? { ...s, accepted: true } : s
    ));
  }, []);

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId ? { ...s, accepted: false } : s
    ));
  }, []);

  const handleAcceptAll = () => {
    let updatedText = text;
    const acceptedSuggestions: string[] = [];
    
    suggestions
      .filter(s => s.position !== undefined)
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .forEach(suggestion => {
        if (suggestion.position !== undefined && suggestion.length !== undefined) {
          const before = updatedText.substring(0, suggestion.position);
          const after = updatedText.substring(suggestion.position + suggestion.length);
          updatedText = before + suggestion.suggestedSnippet + after;
          acceptedSuggestions.push(suggestion.id);
        }
      });
    
    setImprovedText(updatedText);
    setSuggestions(prev => prev.map(s => 
      acceptedSuggestions.includes(s.id) ? { ...s, accepted: true } : s
    ));
    
    toast({
      title: "All Suggestions Applied",
      description: `Applied ${acceptedSuggestions.length} suggestions.`,
    });
  };

  const handleRejectAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, accepted: false })));
    toast({
      title: "All Suggestions Rejected",
      description: "You can still apply individual suggestions if needed.",
    });
  };

  const handleToneChange = (newTone: WritingTone) => {
    setMetrics(prev => ({ ...prev, targetTone: newTone }));
    if (text.trim()) {
      toneMutation.mutate(newTone);
    }
  };

  const handleCopyImproved = () => {
    navigator.clipboard.writeText(improvedText || text);
    toast({
      title: "Copied to Clipboard",
      description: "The improved text has been copied.",
    });
  };

  const handleDownload = () => {
    const content = improvedText || text;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "improved-text.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded",
      description: "The improved text has been downloaded.",
    });
  };

  // Test text for the success criteria
  const loadTestExample = () => {
    setText("i think we should definately procceed with the project");
    toast({
      title: "Test Example Loaded",
      description: "Click 'Analyze' to check for improvements.",
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wand2 className="w-8 h-8 text-primary" />
            Writing Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Improve your writing with AI-powered suggestions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadTestExample}
            size="sm"
            data-testid="button-load-example"
          >
            Load Example
          </Button>
          {improvedText && (
            <>
              <Button
                variant="outline"
                onClick={handleCopyImproved}
                size="sm"
                data-testid="button-copy"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                size="sm"
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statistics Overview */}
      <WritingStats
        wordCount={metrics.wordCount}
        improvedWordCount={improvedText ? improvedText.split(/\s+/).filter(w => w.length > 0).length : undefined}
        readabilityScore={metrics.readabilityScore}
        tone={metrics.tone}
        targetTone={metrics.targetTone}
        sentenceCount={metrics.sentenceCount}
        avgWordsPerSentence={metrics.avgWordsPerSentence}
        grammarErrors={metrics.grammarErrors}
        spellingErrors={metrics.spellingErrors}
        styleIssues={metrics.styleIssues}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
        {/* Main Content Area */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor" data-testid="tab-editor">Editor</TabsTrigger>
              <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editor" className="space-y-4">
              <WritingEditor
                initialText={text}
                suggestions={suggestions.filter(s => s.accepted === undefined)}
                onTextChange={handleTextChange}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                onAnalyze={handleAnalyze}
                isAnalyzing={analyzeMutation.isPending}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Highlighted Text</CardTitle>
                </CardHeader>
                <CardContent>
                  <GrammarHighlighter
                    text={improvedText || text}
                    suggestions={suggestions.filter(s => s.accepted === undefined)}
                    onSuggestionClick={(suggestion) => {
                      // Focus the suggestion in the sidebar
                      const element = document.getElementById(`sidebar-${suggestion.id}`);
                      element?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                </CardContent>
              </Card>
              
              {improvedText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Improved Text
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{improvedText}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ToneSelector
            currentTone={metrics.tone}
            targetTone={metrics.targetTone}
            onToneChange={handleToneChange}
          />
          
          <SuggestionSidebar
            suggestions={suggestions}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
          />
        </div>
      </div>
    </div>
  );
}
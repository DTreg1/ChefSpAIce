/**
 * SuggestionSidebar Component
 * 
 * Sidebar panel showing all writing suggestions with accept/reject controls.
 * Groups suggestions by type and severity for easy navigation.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, CheckCircle, XCircle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { WritingSuggestion } from "./writing-editor";

interface SuggestionSidebarProps {
  suggestions: WritingSuggestion[];
  onAccept: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  className?: string;
}

export function SuggestionSidebar({
  suggestions,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  className,
}: SuggestionSidebarProps) {
  const [selectedType, setSelectedType] = useState<string>("all");

  // Filter suggestions by type
  const filteredSuggestions = selectedType === "all" 
    ? suggestions 
    : suggestions.filter(s => s.suggestionType === selectedType);

  // Group suggestions by type for counts
  const suggestionCounts = suggestions.reduce((acc, s) => {
    acc[s.suggestionType] = (acc[s.suggestionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "grammar":
        return "📝";
      case "spelling":
        return "🔤";
      case "style":
        return "✨";
      case "tone":
        return "🎯";
      case "clarity":
        return "💡";
      default:
        return "📋";
    }
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Suggestions</CardTitle>
          <Badge variant="secondary">
            {suggestions.length} total
          </Badge>
        </div>
        
        {suggestions.length > 0 && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onAcceptAll}
              className="flex-1"
              data-testid="button-accept-all"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Accept All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRejectAll}
              className="flex-1"
              data-testid="button-reject-all"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject All
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Filter className="w-8 h-8 mb-2" />
            <p className="text-sm">No suggestions yet</p>
            <p className="text-xs">Click Analyze to check your text</p>
          </div>
        ) : (
          <Tabs value={selectedType} onValueChange={setSelectedType} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-6 w-full rounded-none border-b">
              <TabsTrigger value="all" className="text-xs" data-testid="tab-all">
                All
              </TabsTrigger>
              <TabsTrigger value="grammar" className="text-xs" data-testid="tab-grammar">
                📝 ({suggestionCounts.grammar || 0})
              </TabsTrigger>
              <TabsTrigger value="spelling" className="text-xs" data-testid="tab-spelling">
                🔤 ({suggestionCounts.spelling || 0})
              </TabsTrigger>
              <TabsTrigger value="style" className="text-xs" data-testid="tab-style">
                ✨ ({suggestionCounts.style || 0})
              </TabsTrigger>
              <TabsTrigger value="tone" className="text-xs" data-testid="tab-tone">
                🎯 ({suggestionCounts.tone || 0})
              </TabsTrigger>
              <TabsTrigger value="clarity" className="text-xs" data-testid="tab-clarity">
                💡 ({suggestionCounts.clarity || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedType} className="flex-1 mt-0">
              <ScrollArea className="h-[500px] px-4">
                <div className="space-y-2 py-2">
                  {filteredSuggestions.map((suggestion) => (
                    <Card 
                      key={suggestion.id} 
                      className={cn(
                        "p-3 space-y-2 transition-morph",
                        suggestion.accepted === true && "opacity-50 bg-green-50 dark:bg-green-950",
                        suggestion.accepted === false && "opacity-50 bg-red-50 dark:bg-red-950"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span>{getTypeIcon(suggestion.suggestionType)}</span>
                            <Badge variant={getSeverityColor(suggestion.severity)} className="text-xs">
                              {suggestion.severity}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="text-xs">
                              <span className="text-muted-foreground">Original: </span>
                              <span className="line-through opacity-70">{suggestion.originalSnippet}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-muted-foreground">Suggested: </span>
                              <span className="font-semibold">{suggestion.suggestedSnippet}</span>
                            </div>
                            {suggestion.reason && (
                              <div className="text-xs text-muted-foreground italic">
                                {suggestion.reason}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAccept(suggestion.id)}
                            disabled={suggestion.accepted !== undefined}
                            className="h-7 w-7 p-0"
                            data-testid={`sidebar-accept-${suggestion.id}`}
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onReject(suggestion.id)}
                            disabled={suggestion.accepted !== undefined}
                            className="h-7 w-7 p-0"
                            data-testid={`sidebar-reject-${suggestion.id}`}
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
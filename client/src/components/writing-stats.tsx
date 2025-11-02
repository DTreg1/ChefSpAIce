/**
 * WritingStats Component
 * 
 * Displays writing statistics including readability score, word count, and tone analysis.
 * Provides visual metrics and progress indicators.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, TrendingUp, Hash, Gauge } from "lucide-react";

interface WritingStatsProps {
  wordCount: number;
  improvedWordCount?: number;
  readabilityScore: number;
  improvedReadabilityScore?: number;
  tone: string;
  targetTone?: string;
  sentenceCount?: number;
  avgWordsPerSentence?: number;
  grammarErrors?: number;
  spellingErrors?: number;
  styleIssues?: number;
  className?: string;
}

export function WritingStats({
  wordCount,
  improvedWordCount,
  readabilityScore,
  improvedReadabilityScore,
  tone,
  targetTone,
  sentenceCount,
  avgWordsPerSentence,
  grammarErrors = 0,
  spellingErrors = 0,
  styleIssues = 0,
  className,
}: WritingStatsProps) {
  const getReadabilityLabel = (score: number) => {
    if (score >= 90) return { label: "Very Easy", color: "text-green-600" };
    if (score >= 80) return { label: "Easy", color: "text-green-500" };
    if (score >= 70) return { label: "Fairly Easy", color: "text-blue-500" };
    if (score >= 60) return { label: "Standard", color: "text-blue-400" };
    if (score >= 50) return { label: "Fairly Difficult", color: "text-yellow-500" };
    if (score >= 30) return { label: "Difficult", color: "text-orange-500" };
    return { label: "Very Difficult", color: "text-red-500" };
  };

  const readabilityInfo = getReadabilityLabel(readabilityScore);
  const improvedReadabilityInfo = improvedReadabilityScore 
    ? getReadabilityLabel(improvedReadabilityScore) 
    : null;

  const totalIssues = grammarErrors + spellingErrors + styleIssues;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {/* Word Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Word Count</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-word-count">
            {wordCount}
          </div>
          {improvedWordCount !== undefined && improvedWordCount !== wordCount && (
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className={cn(
                "h-3 w-3",
                improvedWordCount > wordCount ? "text-green-600" : "text-red-600"
              )} />
              <span className="text-xs text-muted-foreground">
                {improvedWordCount > wordCount ? "+" : ""}{improvedWordCount - wordCount} words
              </span>
            </div>
          )}
          {sentenceCount && (
            <p className="text-xs text-muted-foreground mt-1">
              {sentenceCount} sentences
            </p>
          )}
        </CardContent>
      </Card>

      {/* Readability Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Readability</CardTitle>
          <Gauge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="text-readability">
                {Math.round(readabilityScore)}
              </span>
              <span className="text-xs">/100</span>
            </div>
            <Progress value={readabilityScore} className="h-2" />
            <p className={cn("text-xs font-medium", readabilityInfo.color)}>
              {readabilityInfo.label}
            </p>
            {improvedReadabilityScore !== undefined && improvedReadabilityScore !== readabilityScore && (
              <div className="flex items-center gap-2 pt-1 border-t">
                <span className="text-xs text-muted-foreground">After improvements:</span>
                <span className={cn("text-xs font-medium", improvedReadabilityInfo?.color)}>
                  {Math.round(improvedReadabilityScore)} ({improvedReadabilityInfo?.label})
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tone Analysis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tone</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Badge variant="default" className="capitalize" data-testid="text-tone">
              {tone}
            </Badge>
            {targetTone && targetTone !== tone && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Target:</span>
                <Badge variant="outline" className="capitalize">
                  {targetTone}
                </Badge>
              </div>
            )}
            {avgWordsPerSentence && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Avg. {Math.round(avgWordsPerSentence)} words/sentence
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issues Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
          <Badge variant={totalIssues === 0 ? "default" : "destructive"}>
            {totalIssues}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <span>📝</span> Grammar
              </span>
              <Badge variant={grammarErrors === 0 ? "secondary" : "destructive"} className="h-5">
                {grammarErrors}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <span>🔤</span> Spelling
              </span>
              <Badge variant={spellingErrors === 0 ? "secondary" : "destructive"} className="h-5">
                {spellingErrors}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <span>✨</span> Style
              </span>
              <Badge variant={styleIssues === 0 ? "secondary" : "outline"} className="h-5">
                {styleIssues}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
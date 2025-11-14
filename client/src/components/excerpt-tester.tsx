/**
 * ExcerptTester Component
 * 
 * A/B testing interface for comparing multiple excerpt variants
 * and selecting the best performing one.
 * 
 * @module client/src/components/excerpt-tester
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FlaskConical, 
  TrendingUp, 
  Award, 
  BarChart3,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shuffle,
} from "lucide-react";
import { ExcerptPreview } from "./excerpt-preview";
import type { Excerpt } from "@shared/schema";

interface ExcerptTesterProps {
  excerpts: Excerpt[];
  performance?: Record<string, {
    views: number;
    clicks: number;
    shares: number;
    ctr: number;
  }>;
  onSelectWinner?: (excerptId: string) => void;
  onRefreshData?: () => void;
  isLoading?: boolean;
}

export function ExcerptTester({
  excerpts,
  performance = {},
  onSelectWinner,
  onRefreshData,
  isLoading = false,
}: ExcerptTesterProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [testMode, setTestMode] = useState<'manual' | 'auto'>('auto');

  // Calculate statistics
  const stats = excerpts.map(excerpt => {
    const perf = performance[excerpt.id] || {
      views: 0,
      clicks: 0,
      shares: 0,
      ctr: excerpt.clickThroughRate || 0,
    };
    
    return {
      excerpt,
      performance: perf,
      score: calculateScore(perf),
    };
  }).sort((a, b) => b.score - a.score);

  const bestPerformer = stats[0];
  const avgCTR = stats.reduce((sum, s) => sum + s.performance.ctr, 0) / stats.length;

  function calculateScore(perf: any): number {
    // Weighted score based on CTR (60%), shares (30%), and total clicks (10%)
    const ctrScore = perf.ctr * 60;
    const shareScore = (perf.views > 0 ? perf.shares / perf.views : 0) * 30;
    const clickScore = Math.min(perf.clicks / 100, 1) * 10; // Normalize to 100 clicks
    return ctrScore + shareScore + clickScore;
  }

  const handleSelectWinner = () => {
    if (onSelectWinner && selectedVariant) {
      onSelectWinner(selectedVariant);
    }
  };

  const getVariantLabel = (variant: string) => {
    const labels: Record<string, string> = {
      'A': 'Control',
      'B': 'Variant B',
      'C': 'Variant C',
      'D': 'Variant D',
      'E': 'Variant E',
    };
    return labels[variant] || variant;
  };

  const getConfidenceLevel = (score: number, avgScore: number): string => {
    const improvement = ((score - avgScore) / avgScore) * 100;
    if (improvement > 20) return 'High';
    if (improvement > 10) return 'Medium';
    if (improvement > 0) return 'Low';
    return 'Below Average';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                A/B Test Results
              </CardTitle>
              <CardDescription>
                Compare excerpt performance across variants
              </CardDescription>
            </div>
            {onRefreshData && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshData}
                disabled={isLoading}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Best Performer</p>
                    <p className="text-2xl font-bold">
                      Variant {bestPerformer?.excerpt.variant}
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average CTR</p>
                    <p className="text-2xl font-bold">
                      {(avgCTR * 100).toFixed(1)}%
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top CTR</p>
                    <p className="text-2xl font-bold">
                      {(bestPerformer?.performance.ctr * 100).toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Mode Toggle */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Label>Test Mode:</Label>
            <RadioGroup
              value={testMode}
              onValueChange={(value) => setTestMode(value as 'manual' | 'auto')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto">Automatic (Algorithm picks)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual Selection</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Variant Comparison */}
          <div className="space-y-4">
            {stats.map((stat, index) => {
              const isLeading = index === 0;
              const confidence = getConfidenceLevel(stat.score, stats.reduce((sum, s) => sum + s.score, 0) / stats.length);
              
              return (
                <div
                  key={stat.excerpt.id}
                  className={`p-4 border rounded-lg ${
                    isLeading ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''
                  } ${
                    selectedVariant === stat.excerpt.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => testMode === 'manual' && setSelectedVariant(stat.excerpt.id)}
                  data-testid={`variant-${stat.excerpt.variant}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {testMode === 'manual' && (
                        <RadioGroupItem
                          value={stat.excerpt.id}
                          checked={selectedVariant === stat.excerpt.id}
                          id={`variant-${stat.excerpt.id}`}
                        />
                      )}
                      <Label
                        htmlFor={`variant-${stat.excerpt.id}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {getVariantLabel(stat.excerpt.variant ?? '')}
                      </Label>
                      {isLeading && (
                        <Badge className="bg-green-500 text-white">
                          <Award className="h-3 w-3 mr-1" />
                          Leading
                        </Badge>
                      )}
                      {stat.excerpt.isActive && (
                        <Badge variant="outline">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      <Badge variant={
                        confidence === 'High' ? 'default' :
                        confidence === 'Medium' ? 'secondary' :
                        confidence === 'Low' ? 'outline' :
                        'destructive'
                      }>
                        {confidence} Confidence
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {(stat.performance.ctr * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">CTR</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {stat.excerpt.excerptText}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Views</p>
                      <p className="font-medium">{stat.performance.views}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clicks</p>
                      <p className="font-medium">{stat.performance.clicks}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Shares</p>
                      <p className="font-medium">{stat.performance.shares}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-medium">{stat.score.toFixed(1)}</p>
                    </div>
                  </div>

                  <Progress
                    value={stat.score}
                    className="mt-2 h-2"
                  />
                </div>
              );
            })}
          </div>

          {/* Recommendation */}
          {testMode === 'auto' && bestPerformer && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommendation:</strong> Based on performance data, 
                Variant {bestPerformer.excerpt.variant} is performing {
                  ((bestPerformer.performance.ctr - avgCTR) / avgCTR * 100).toFixed(0)
                }% better than average. 
                Consider making it the active excerpt.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              data-testid="button-randomize"
            >
              <Shuffle className="h-4 w-4 mr-1" />
              Randomize Display
            </Button>
            
            {onSelectWinner && (
              <Button
                onClick={handleSelectWinner}
                disabled={testMode === 'manual' ? !selectedVariant : !bestPerformer}
                data-testid="button-select-winner"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {testMode === 'auto' 
                  ? `Activate Variant ${bestPerformer?.excerpt.variant}`
                  : 'Activate Selected'
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
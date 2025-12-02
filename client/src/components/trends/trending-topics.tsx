import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hash, TrendingUp, Users, Sparkles } from "lucide-react";

interface Trend {
  id: string;
  trendName: string;
  trendType: string;
  growthRate: number;
  strength: number;
  dataPoints?: {
    keywords?: string[];
  };
}

interface TrendingTopicsProps {
  trends: Trend[];
  onTrendClick?: (trend: Trend) => void;
}

export function TrendingTopics({ trends, onTrendClick }: TrendingTopicsProps) {
  // Extract and aggregate keywords/topics from trends
  const extractTopics = () => {
    const topicMap = new Map<
      string,
      { count: number; trends: Trend[]; totalGrowth: number }
    >();

    trends.forEach((trend) => {
      // Use keywords from data points
      const keywords = trend.dataPoints?.keywords || [];

      // Also extract topics from trend name
      const nameWords = trend.trendName
        .toLowerCase()
        .split(/[\s,.-]+/)
        .filter(
          (word) =>
            word.length > 3 &&
            !["trend", "growth", "decline", "pattern"].includes(word),
        );

      [...keywords, ...nameWords].forEach((topic) => {
        if (topic) {
          const existing = topicMap.get(topic) || {
            count: 0,
            trends: [],
            totalGrowth: 0,
          };
          existing.count++;
          existing.trends.push(trend);
          existing.totalGrowth += trend.growthRate;
          topicMap.set(topic, existing);
        }
      });
    });

    // Sort by count and return top topics
    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        trends: data.trends,
        avgGrowth: data.totalGrowth / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  };

  const topTopics = extractTopics();
  const topByGrowth = [...trends]
    .filter((t) => t.growthRate > 0)
    .sort((a, b) => b.growthRate - a.growthRate)
    .slice(0, 5);

  const getTopicSize = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return "text-lg font-bold";
    if (ratio > 0.5) return "text-base font-semibold";
    if (ratio > 0.3) return "text-sm font-medium";
    return "text-sm";
  };

  const maxCount = Math.max(...topTopics.map((t) => t.count), 1);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Topic Cloud */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Trending Topics
          </CardTitle>
          <CardDescription>
            Most frequently appearing topics across all trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topTopics.map(({ topic, count, avgGrowth }) => (
                <Button
                  key={topic}
                  variant="outline"
                  size="sm"
                  className={`hover-elevate ${getTopicSize(count, maxCount)}`}
                  onClick={() => {
                    const relatedTrend = trends.find(
                      (t) =>
                        t.trendName.toLowerCase().includes(topic) ||
                        t.dataPoints?.keywords?.includes(topic),
                    );
                    if (relatedTrend && onTrendClick) {
                      onTrendClick(relatedTrend);
                    }
                  }}
                  data-testid={`topic-${topic}`}
                >
                  <Hash className="w-3 h-3 mr-1 opacity-50" />
                  {topic}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                  {avgGrowth > 50 && (
                    <TrendingUp className="w-3 h-3 ml-1 text-green-500" />
                  )}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No topics identified yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Growing Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Fastest Growing
          </CardTitle>
          <CardDescription>
            Trends with the highest growth rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topByGrowth.length > 0 ? (
            <div className="space-y-3">
              {topByGrowth.map((trend, index) => (
                <div
                  key={trend.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => onTrendClick?.(trend)}
                  data-testid={`fast-growing-${trend.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{trend.trendName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{trend.trendType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                      <TrendingUp className="w-4 h-4" />
                      <span>+{trend.growthRate.toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(trend.strength * 100).toFixed(0)}% strength
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No growing trends detected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

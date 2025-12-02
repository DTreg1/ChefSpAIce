import { Lightbulb, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeyPointsHighlighterProps {
  keyPoints: string[];
  title?: string;
  showIcon?: boolean;
}

export default function KeyPointsHighlighter({
  keyPoints,
  title = "Key Insights",
  showIcon = true,
}: KeyPointsHighlighterProps) {
  if (!keyPoints || keyPoints.length === 0) {
    return null;
  }

  return (
    <Card
      className="border-primary/20 bg-primary/5"
      data-testid="card-key-points"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {showIcon && <Lightbulb className="h-5 w-5 text-primary" />}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {keyPoints.length} points
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keyPoints.map((point, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2 rounded-md hover-elevate"
              data-testid={`key-point-${index}`}
            >
              <Star className="h-4 w-4 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed flex-1">{point}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

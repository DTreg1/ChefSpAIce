import { memo } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Circle,
  CheckCircle2,
  ChevronRight,
  Hash,
  Zap
} from "lucide-react";

interface BulletSummaryProps {
  bullets: string[];
  title?: string;
  variant?: 'default' | 'numbered' | 'checkmarks' | 'arrows' | 'simple';
  showIcon?: boolean;
  className?: string;
  onBulletClick?: (index: number, bullet: string) => void;
}

export const BulletSummary = memo(function BulletSummary({
  bullets,
  title,
  variant = 'default',
  showIcon = true,
  className = "",
  onBulletClick
}: BulletSummaryProps) {
  const getIcon = (index: number) => {
    switch (variant) {
      case 'numbered':
        return <Hash className="h-4 w-4 text-primary" />;
      case 'checkmarks':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'arrows':
        return <ChevronRight className="h-4 w-4 text-primary" />;
      case 'simple':
        return null;
      default:
        return <Circle className="h-3 w-3 text-primary" />;
    }
  };

  const formatBullet = (bullet: string, index: number) => {
    // Remove existing bullet characters if any
    const cleanBullet = bullet.replace(/^[•\-*]\s*/, '').trim();
    
    if (variant === 'numbered') {
      return `${index + 1}. ${cleanBullet}`;
    }
    return cleanBullet;
  };

  const handleBulletClick = (index: number, bullet: string) => {
    if (onBulletClick) {
      onBulletClick(index, bullet);
    }
  };

  if (bullets.length === 0) {
    return (
      <Card className={`${className}`}>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No bullet points available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover-elevate ${className}`}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {showIcon && <Zap className="h-5 w-5" />}
            {title}
            <Badge variant="secondary" className="ml-auto">
              {bullets.length} points
            </Badge>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={title ? "pt-3" : "pt-6"}>
        <ul className="space-y-3">
          {bullets.map((bullet, index) => {
            const formattedBullet = formatBullet(bullet, index);
            const icon = getIcon(index);
            const isClickable = !!onBulletClick;
            
            return (
              <li
                key={index}
                className={`
                  flex items-start gap-3
                  ${isClickable ? 'cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors' : ''}
                `}
                onClick={isClickable ? () => handleBulletClick(index, formattedBullet) : undefined}
                data-testid={`bullet-point-${index}`}
              >
                {icon && (
                  <span className="mt-1 flex-shrink-0">
                    {icon}
                  </span>
                )}
                <span className="flex-1 text-sm leading-relaxed">
                  {formattedBullet}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
});

interface QuickBulletListProps {
  bullets: string[];
  className?: string;
  bulletClassName?: string;
}

export const QuickBulletList = memo(function QuickBulletList({
  bullets,
  className = "",
  bulletClassName = ""
}: QuickBulletListProps) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {bullets.map((bullet, index) => (
        <li 
          key={index} 
          className={`flex items-start gap-2 ${bulletClassName}`}
          data-testid={`quick-bullet-${index}`}
        >
          <span className="text-muted-foreground mt-0.5">•</span>
          <span className="flex-1">
            {bullet.replace(/^[•\-*]\s*/, '').trim()}
          </span>
        </li>
      ))}
    </ul>
  );
});
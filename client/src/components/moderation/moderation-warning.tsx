import { AlertCircle, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ModerationWarningProps {
  severity: "low" | "medium" | "high" | "critical";
  categories: string[];
  message?: string;
  suggestions?: string[];
  allowDismiss?: boolean;
  allowAppeal?: boolean;
  onDismiss?: () => void;
  onAppeal?: () => void;
  onEdit?: () => void;
}

const severityConfig = {
  low: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-300 dark:border-yellow-800",
    title: "Content Notice",
    badgeVariant: "secondary" as const,
  },
  medium: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-300 dark:border-orange-800",
    title: "Content Warning",
    badgeVariant: "secondary" as const,
  },
  high: {
    icon: ShieldAlert,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-300 dark:border-red-800",
    title: "Content Blocked",
    badgeVariant: "destructive" as const,
  },
  critical: {
    icon: ShieldAlert,
    color: "text-red-800",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-500 dark:border-red-700",
    title: "Severe Violation",
    badgeVariant: "destructive" as const,
  },
};

const categoryLabels: { [key: string]: string } = {
  toxicity: "Toxic Content",
  severeToxicity: "Severe Toxicity",
  identityAttack: "Identity Attack",
  insult: "Insults",
  profanity: "Profanity",
  threat: "Threats",
  sexuallyExplicit: "Sexually Explicit",
  obscene: "Obscene Content",
  harassment: "Harassment",
  hate: "Hate Speech",
  selfHarm: "Self-Harm",
  violence: "Violence",
};

export function ModerationWarning({
  severity,
  categories,
  message,
  suggestions = [],
  allowDismiss = false,
  allowAppeal = false,
  onDismiss,
  onAppeal,
  onEdit,
}: ModerationWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const config = severityConfig[severity];
  const Icon = config.icon;

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className={`${config.borderColor} ${config.bgColor} border-2`}>
      <CardHeader className="relative">
        <CardTitle className={`flex items-center gap-2 ${config.color}`}>
          <Icon className="h-5 w-5" />
          {config.title}
        </CardTitle>
        {allowDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleDismiss}
            data-testid="button-dismiss-warning"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <p
            className="text-sm text-muted-foreground"
            data-testid="text-warning-message"
          >
            {message}
          </p>
        )}

        {categories.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Detected Issues:</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={config.badgeVariant}
                  data-testid={`badge-category-${category}`}
                >
                  {categoryLabels[category] || category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggestions:</p>
            <ul className="list-disc list-inside space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      {(allowAppeal || onEdit) && (
        <CardFooter className="gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              data-testid="button-edit-content"
            >
              Edit Content
            </Button>
          )}
          {allowAppeal && onAppeal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAppeal}
              data-testid="button-appeal-decision"
            >
              Appeal Decision
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

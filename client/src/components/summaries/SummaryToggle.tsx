import { memo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

interface SummaryToggleProps {
  isVisible: boolean;
  isLoading?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export const SummaryToggle = memo(function SummaryToggle({
  isVisible,
  isLoading = false,
  onToggle,
  disabled = false,
  className = "",
  size = "default",
  variant = "outline"
}: SummaryToggleProps) {
  return (
    <Button
      onClick={onToggle}
      disabled={disabled || isLoading}
      className={className}
      size={size}
      variant={variant}
      data-testid="button-toggle-summary"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          {isVisible ? "Hide TL;DR" : "Show TL;DR"}
        </>
      )}
    </Button>
  );
});
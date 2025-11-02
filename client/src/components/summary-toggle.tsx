import { Button } from "@/components/ui/button";
import { FileText, ListChecks } from "lucide-react";

interface SummaryToggleProps {
  showSummary: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export default function SummaryToggle({ showSummary, onToggle, isLoading = false }: SummaryToggleProps) {
  return (
    <Button
      variant={showSummary ? "default" : "outline"}
      onClick={onToggle}
      disabled={isLoading}
      size="sm"
      data-testid="button-toggle-summary"
    >
      {showSummary ? (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Show Full Text
        </>
      ) : (
        <>
          <ListChecks className="h-4 w-4 mr-2" />
          Show TL;DR
        </>
      )}
    </Button>
  );
}
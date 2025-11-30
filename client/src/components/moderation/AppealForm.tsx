import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Send } from "lucide-react";

interface AppealFormProps {
  isOpen: boolean;
  onClose: () => void;
  blockedContentId: string;
  contentPreview?: string;
  violationCategories?: string[];
}

const appealTypes = [
  { 
    value: "false_positive", 
    label: "False Positive", 
    description: "The content was incorrectly flagged and contains no violations" 
  },
  { 
    value: "context_needed", 
    label: "Context Needed", 
    description: "The content needs context to be properly understood" 
  },
  { 
    value: "technical_error", 
    label: "Technical Error", 
    description: "There was a technical issue with the moderation" 
  },
  { 
    value: "other", 
    label: "Other", 
    description: "Another reason not listed above" 
  }
];

export function AppealForm({
  isOpen,
  onClose,
  blockedContentId,
  contentPreview,
  violationCategories = []
}: AppealFormProps) {
  const [appealType, setAppealType] = useState("false_positive");
  const [appealReason, setAppealReason] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const { toast } = useToast();

  const submitAppealMutation = useMutation({
    mutationFn: async () => {
      if (!appealReason.trim()) {
        throw new Error("Please provide a reason for your appeal");
      }

      const response = await apiRequest('/api/moderate/appeal', 'POST', {
        blockedContentId,
        reason: appealReason,
        additionalContext: `Type: ${appealType}\n${additionalContext}`.trim()
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Appeal Submitted",
        description: "Your appeal has been submitted and will be reviewed soon."
      });
      onClose();
      // Reset form
      setAppealType("false_positive");
      setAppealReason("");
      setAdditionalContext("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Submit Appeal",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    submitAppealMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Appeal Moderation Decision</DialogTitle>
          <DialogDescription>
            Submit an appeal if you believe your content was incorrectly moderated.
            Our team will review your appeal within 24-48 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content Preview */}
          {contentPreview && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Your Content:</p>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {contentPreview}
              </p>
            </div>
          )}

          {/* Violation Categories */}
          {violationCategories.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Detected Issues:</p>
                <ul className="list-disc list-inside text-sm">
                  {violationCategories.map((category) => (
                    <li key={category}>{category}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Appeal Type */}
          <div className="space-y-2">
            <Label>Appeal Type</Label>
            <RadioGroup 
              value={appealType} 
              onValueChange={setAppealType}
              data-testid="radio-appeal-type"
            >
              {appealTypes.map((type) => (
                <div key={type.value} className="flex items-start space-x-2">
                  <RadioGroupItem 
                    value={type.value} 
                    id={type.value}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor={type.value} className="font-normal cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Appeal Reason */}
          <div className="space-y-2">
            <Label htmlFor="appeal-reason">
              Appeal Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="appeal-reason"
              placeholder="Explain why you believe this content was incorrectly moderated..."
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-appeal-reason"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="additional-context">
              Additional Context (Optional)
            </Label>
            <Textarea
              id="additional-context"
              placeholder="Provide any additional information that might help us understand the context..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[80px]"
              data-testid="textarea-additional-context"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitAppealMutation.isPending}
            data-testid="button-cancel-appeal"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitAppealMutation.isPending || appealReason.length < 10}
            data-testid="button-submit-appeal"
          >
            {submitAppealMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Appeal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
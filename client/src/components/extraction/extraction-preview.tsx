import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, AlertCircle, FileText, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtractionField {
  name: string;
  value: any;
  confidence?: number;
  highlighted?: boolean;
}

interface ExtractionPreviewProps {
  inputText: string;
  extractedFields: Record<string, any>;
  fieldConfidence?: Record<string, number>;
  overallConfidence: number;
  validationStatus?: "pending" | "validated" | "corrected" | "rejected";
  onValidate?: () => void;
  onCorrect?: () => void;
  className?: string;
}

export function ExtractionPreview({
  inputText,
  extractedFields,
  fieldConfidence = {},
  overallConfidence,
  validationStatus = "pending",
  onValidate,
  onCorrect,
  className,
}: ExtractionPreviewProps) {
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  // Create highlighted text with extracted fields
  const highlightedText = useMemo(() => {
    if (!highlightedField || !extractedFields[highlightedField])
      return inputText;

    const value = String(extractedFields[highlightedField]);
    const regex = new RegExp(
      `(${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );

    return inputText.split(regex).map((part, index) => {
      if (part.toLowerCase() === value.toLowerCase()) {
        return (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  }, [inputText, extractedFields, highlightedField]);

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.7) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get validation status badge
  const getValidationBadge = () => {
    switch (validationStatus) {
      case "validated":
        return (
          <Badge variant="default" className="bg-green-600">
            <Check className="w-3 h-3 mr-1" />
            Validated
          </Badge>
        );
      case "corrected":
        return (
          <Badge variant="default" className="bg-blue-600">
            <Check className="w-3 h-3 mr-1" />
            Corrected
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Extraction Preview
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confidence:</span>
              <span
                className={cn(
                  "font-semibold",
                  getConfidenceColor(overallConfidence),
                )}
              >
                {(overallConfidence * 100).toFixed(1)}%
              </span>
            </div>
            {getValidationBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="extracted" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="extracted" data-testid="tab-extracted">
              Extracted Data
            </TabsTrigger>
            <TabsTrigger value="original" data-testid="tab-original">
              Original Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extracted" className="space-y-4">
            <div className="grid gap-3">
              {Object.entries(extractedFields).map(([fieldName, value]) => {
                const confidence = fieldConfidence[fieldName] || 0;
                const isHighlighted = highlightedField === fieldName;

                return (
                  <div
                    key={fieldName}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      isHighlighted
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50",
                    )}
                    onClick={() =>
                      setHighlightedField(isHighlighted ? null : fieldName)
                    }
                    data-testid={`field-${fieldName}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium capitalize">
                            {fieldName.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          {confidence > 0 && (
                            <span
                              className={cn(
                                "text-xs",
                                getConfidenceColor(confidence),
                              )}
                            >
                              ({(confidence * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-foreground">
                          {Array.isArray(value) ? (
                            <div className="space-y-1">
                              {value.map((item, i) => (
                                <div
                                  key={i}
                                  className="pl-3 border-l-2 border-muted"
                                >
                                  {typeof item === "object"
                                    ? JSON.stringify(item, null, 2)
                                    : item}
                                </div>
                              ))}
                            </div>
                          ) : typeof value === "object" ? (
                            <pre className="text-xs bg-muted p-2 rounded">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            value || (
                              <span className="text-muted-foreground italic">
                                Not found
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOriginal(true);
                          setHighlightedField(isHighlighted ? null : fieldName);
                        }}
                        data-testid={`highlight-${fieldName}`}
                      >
                        {isHighlighted ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {validationStatus === "pending" && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={onValidate}
                  variant="default"
                  size="sm"
                  data-testid="button-validate"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Validate
                </Button>
                <Button
                  onClick={onCorrect}
                  variant="outline"
                  size="sm"
                  data-testid="button-correct"
                >
                  Correct Data
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="original">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="text-sm whitespace-pre-wrap">
                {showOriginal && highlightedField ? highlightedText : inputText}
              </div>
            </ScrollArea>
            {highlightedField && (
              <div className="mt-2 text-xs text-muted-foreground">
                Highlighting:{" "}
                <span className="font-medium">{highlightedField}</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  FileCode,
  Copy,
  Settings,
  Wand2,
  TestTube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FieldDefinition {
  id: string;
  name: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  examples?: string[];
}

interface TemplateBuilderProps {
  initialTemplate?: {
    name: string;
    description?: string;
    schema: {
      fields: FieldDefinition[];
    };
    exampleText?: string;
    systemPrompt?: string;
    extractionConfig?: {
      model?: string;
      temperature?: number;
      confidenceThreshold?: number;
    };
  };
  onSave: (template: any) => void;
  className?: string;
}

export function TemplateBuilder({
  initialTemplate,
  onSave,
  className,
}: TemplateBuilderProps) {
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState(initialTemplate?.name || "");
  const [templateDescription, setTemplateDescription] = useState(
    initialTemplate?.description || "",
  );
  const [fields, setFields] = useState<FieldDefinition[]>(
    initialTemplate?.schema?.fields || [],
  );
  const [exampleText, setExampleText] = useState(
    initialTemplate?.exampleText || "",
  );
  const [systemPrompt, setSystemPrompt] = useState(
    initialTemplate?.systemPrompt || "",
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Extraction config
  const [model, setModel] = useState(
    initialTemplate?.extractionConfig?.model || "gpt-3.5-turbo",
  );
  const [temperature, setTemperature] = useState(
    initialTemplate?.extractionConfig?.temperature?.toString() || "0.3",
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    initialTemplate?.extractionConfig?.confidenceThreshold?.toString() ||
      "0.85",
  );

  // Add new field
  const addField = () => {
    const newField: FieldDefinition = {
      id: `field_${Date.now()}`,
      name: "",
      type: "string",
      description: "",
      required: false,
      examples: [],
    };
    setFields([...fields, newField]);
  };

  // Update field
  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  // Delete field
  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const draggedField = fields[draggedItem];
    const newFields = fields.filter((_, i) => i !== draggedItem);
    newFields.splice(index, 0, draggedField);

    setFields(newFields);
    setDraggedItem(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Add example to field
  const addExample = (fieldIndex: number, example: string) => {
    if (!example.trim()) return;

    const field = fields[fieldIndex];
    const examples = field.examples || [];
    if (!examples.includes(example)) {
      updateField(fieldIndex, { examples: [...examples, example] });
    }
  };

  // Remove example from field
  const removeExample = (fieldIndex: number, exampleIndex: number) => {
    const field = fields[fieldIndex];
    const examples = field.examples || [];
    updateField(fieldIndex, {
      examples: examples.filter((_, i) => i !== exampleIndex),
    });
  };

  // Generate template JSON
  const generateTemplate = () => {
    return {
      name: templateName,
      description: templateDescription,
      schema: {
        fields: fields.map(({ id, ...field }) => ({
          ...field,
          examples: field.examples?.filter((e) => e.trim()),
        })),
      },
      exampleText,
      systemPrompt,
      extractionConfig: {
        model,
        temperature: parseFloat(temperature),
        confidenceThreshold: parseFloat(confidenceThreshold),
        enableStructuredOutput: true,
      },
    };
  };

  // Copy template JSON
  const copyTemplateJson = async () => {
    try {
      const template = generateTemplate();
      await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
      toast({
        title: "Copied",
        description: "Template JSON copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy template to clipboard",
        variant: "destructive",
      });
    }
  };

  // Handle save
  const handleSave = () => {
    const template = generateTemplate();
    onSave(template);
  };

  const isValid =
    templateName &&
    fields.length > 0 &&
    fields.every((f) => f.name && f.description);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Template Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Template Information
          </CardTitle>
          <CardDescription>
            Define the basic information for your extraction template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name*</Label>
            <Input
              id="template-name"
              placeholder="e.g., Order Email, Invoice, Resume"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              data-testid="input-template-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Describe what this template extracts..."
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              rows={3}
              data-testid="input-template-description"
            />
          </div>
        </CardContent>
      </Card>

      {/* Field Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Schema Fields
              </CardTitle>
              <CardDescription>
                Define the fields to extract from text
              </CardDescription>
            </div>
            <Button size="sm" onClick={addField} data-testid="button-add-field">
              <Plus className="w-4 h-4 mr-1" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-4 border rounded-lg cursor-move",
                    draggedItem === index && "opacity-50",
                  )}
                  data-testid={`field-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Field Name*</Label>
                          <Input
                            placeholder="e.g., customerName"
                            value={field.name}
                            onChange={(e) =>
                              updateField(index, { name: e.target.value })
                            }
                            data-testid={`field-name-${index}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Data Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value: any) =>
                              updateField(index, { type: value })
                            }
                          >
                            <SelectTrigger data-testid={`field-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="array">Array</SelectItem>
                              <SelectItem value="object">Object</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description*</Label>
                        <Input
                          placeholder="Describe what to extract for this field"
                          value={field.description}
                          onChange={(e) =>
                            updateField(index, { description: e.target.value })
                          }
                          data-testid={`field-description-${index}`}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`required-${index}`}
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(index, { required: checked })
                            }
                            data-testid={`field-required-${index}`}
                          />
                          <Label htmlFor={`required-${index}`}>
                            Required Field
                          </Label>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteField(index)}
                          data-testid={`delete-field-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Examples */}
                      <div className="space-y-2">
                        <Label className="text-xs">Examples (optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add example value"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addExample(index, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                            className="text-sm"
                            data-testid={`field-example-input-${index}`}
                          />
                        </div>
                        {field.examples && field.examples.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {field.examples.map((example, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs cursor-pointer"
                                onClick={() => removeExample(index, i)}
                              >
                                {example}
                                <span className="w-3 h-3 ml-1">×</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No fields defined. Click "Add Field" to start building your
                  schema.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Example Text */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Example Text
          </CardTitle>
          <CardDescription>
            Provide sample text that this template will extract from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste an example email, document, or message here..."
            value={exampleText}
            onChange={(e) => setExampleText(e.target.value)}
            rows={6}
            data-testid="input-example-text"
          />
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Advanced Settings
            </div>
            <span className="text-xs text-muted-foreground">
              {showAdvanced ? "Hide" : "Show"}
            </span>
          </Button>
        </CardHeader>

        {showAdvanced && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">Custom System Prompt</Label>
              <Textarea
                id="system-prompt"
                placeholder="Override the default extraction prompt..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-5">GPT-5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Confidence Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!isValid}
          className="flex-1"
          data-testid="button-save-template"
        >
          <Save className="w-4 h-4 mr-1" />
          Save Template
        </Button>

        <Button
          variant="outline"
          onClick={copyTemplateJson}
          disabled={!isValid}
          data-testid="button-copy-json"
        >
          <Copy className="w-4 h-4 mr-1" />
          Copy JSON
        </Button>
      </div>
    </div>
  );
}

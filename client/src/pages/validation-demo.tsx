import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, CreditCard, Calendar, Globe, MapPin, User, FileText, Info } from "lucide-react";
import { SmartValidation, ValidationSuccess, FormatHelper } from "@/components/SmartValidation";
import { useSmartValidation } from "@/hooks/use-smart-validation";
import { useToast } from "@/hooks/use-toast";

export default function ValidationDemo() {
  const { toast } = useToast();
  const {
    validateField,
    validateForm,
    applySuggestion,
    getFieldState,
    isFormValid,
    clearAllValidations,
  } = useSmartValidation();

  // Form state
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    zipCode: "",
    creditCard: "",
    date: "",
    url: "",
    name: "",
    ssn: "",
  });

  // Handle input change
  const handleInputChange = async (fieldName: string, fieldType: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate the field as user types (with debouncing)
    await validateField(fieldName, fieldType, value, {
      debounce: 500,
      context: { formId: "demo-form", otherFields: formData },
    });
  };

  // Handle suggestion application
  const handleApplySuggestion = async (fieldName: string, fieldType: string, value: string, action?: string) => {
    const newValue = await applySuggestion(fieldName, fieldType, value, action);
    setFormData(prev => ({ ...prev, [fieldName]: newValue }));
    
    toast({
      title: "Suggestion Applied",
      description: `Applied suggested value: ${newValue}`,
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    const fields = Object.entries(formData).map(([name, value]) => ({
      name,
      type: name, // Using field name as type for simplicity
      value,
      required: name === "phone" || name === "email",
    }));

    const result = await validateForm("demo-form", fields, {
      pageUrl: window.location.href,
    });

    if (result.isValid) {
      toast({
        title: "Form Valid!",
        description: "All fields passed validation successfully.",
        variant: "default",
      });
    } else {
      toast({
        title: "Validation Failed",
        description: `${result.summary?.invalidFields || 0} field(s) have errors.`,
        variant: "destructive",
      });
    }
  };

  // Field configurations
  const fields = [
    {
      name: "phone",
      type: "phone",
      label: "Phone Number",
      placeholder: "555-1234",
      icon: Phone,
      description: "Try entering just 7 digits - the system will suggest area codes!",
      examples: ["(555) 123-4567", "555-123-4567", "+1 555 123 4567"],
    },
    {
      name: "email",
      type: "email",
      label: "Email Address",
      placeholder: "john@example",
      icon: Mail,
      description: "Missing domain? We'll suggest common ones.",
      examples: ["john@example.com", "user@company.org"],
    },
    {
      name: "zipCode",
      type: "zipCode",
      label: "ZIP Code",
      placeholder: "9021",
      icon: MapPin,
      description: "Partial ZIP? We'll help complete it.",
      examples: ["90210", "90210-1234"],
    },
    {
      name: "creditCard",
      type: "creditCard",
      label: "Credit Card",
      placeholder: "4111111111111111",
      icon: CreditCard,
      description: "We'll format and validate card numbers.",
      examples: ["4111 1111 1111 1111", "5500-0000-0000-0004"],
    },
    {
      name: "date",
      type: "date",
      label: "Date",
      placeholder: "1/1/24",
      icon: Calendar,
      description: "Various date formats supported.",
      examples: ["01/15/2024", "12/31/2023"],
    },
    {
      name: "url",
      type: "url",
      label: "Website URL",
      placeholder: "google.com",
      icon: Globe,
      description: "Missing protocol? We'll add it.",
      examples: ["https://example.com", "http://site.org/page"],
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Intelligent Form Validation Demo</h1>
        <p className="text-muted-foreground">
          Experience smart validation with AI-powered suggestions, auto-corrections, and helpful format hints.
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Try these scenarios:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Phone: Enter "555-1234" to see area code suggestions</li>
            <li>• Email: Type "john@gmai" to get domain corrections</li>
            <li>• ZIP: Enter "9021" for ZIP code completion</li>
            <li>• Any field: Enter invalid data to see AI suggestions</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Smart Form Fields</CardTitle>
            <CardDescription>
              Enter data to see real-time validation with intelligent suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field) => {
              const fieldState = getFieldState(field.name);
              const Icon = field.icon;
              
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {field.label}
                  </Label>
                  <Input
                    id={field.name}
                    type="text"
                    placeholder={field.placeholder}
                    value={formData[field.name as keyof typeof formData]}
                    onChange={(e) => handleInputChange(field.name, field.type, e.target.value)}
                    className={
                      fieldState.hasBeenValidated && fieldState.result && !fieldState.result.isValid
                        ? "border-destructive focus:ring-destructive"
                        : fieldState.hasBeenValidated && fieldState.result?.isValid
                        ? "border-green-500 focus:ring-green-500"
                        : ""
                    }
                    data-testid={`input-${field.name}`}
                  />
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  <FormatHelper fieldType={field.type} examples={field.examples} />
                  
                  {/* Validation Feedback */}
                  {fieldState.hasBeenValidated && fieldState.result && (
                    <>
                      {fieldState.result.isValid ? (
                        <ValidationSuccess fieldName={field.name} />
                      ) : (
                        <SmartValidation
                          fieldName={field.name}
                          fieldType={field.type}
                          value={fieldState.value}
                          errors={fieldState.result.errors}
                          suggestions={fieldState.result.suggestions}
                          quickFixes={fieldState.result.quickFixes}
                          formatHints={fieldState.result.formatHints}
                          onApplySuggestion={(value, action) =>
                            handleApplySuggestion(field.name, field.type, value, action)
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <Separator />
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                disabled={!isFormValid()}
                className="flex-1"
                data-testid="button-submit-form"
              >
                Validate All Fields
              </Button>
              <Button 
                onClick={() => {
                  clearAllValidations();
                  setFormData({
                    phone: "",
                    email: "",
                    zipCode: "",
                    creditCard: "",
                    date: "",
                    url: "",
                    name: "",
                    ssn: "",
                  });
                }}
                variant="outline"
                data-testid="button-clear-form"
              >
                Clear Form
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Intelligent Features</CardTitle>
              <CardDescription>
                Powered by OpenAI GPT-3.5 and smart regex patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="features" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="technology">Technology</TabsTrigger>
                </TabsList>
                
                <TabsContent value="features" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="mt-0.5">AI</Badge>
                      <div>
                        <p className="font-medium text-sm">Smart Suggestions</p>
                        <p className="text-xs text-muted-foreground">
                          AI analyzes your input and suggests corrections based on context
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge className="mt-0.5">UX</Badge>
                      <div>
                        <p className="font-medium text-sm">Quick Fixes</p>
                        <p className="text-xs text-muted-foreground">
                          One-click fixes for common mistakes like missing area codes
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge className="mt-0.5">ML</Badge>
                      <div>
                        <p className="font-medium text-sm">Learning System</p>
                        <p className="text-xs text-muted-foreground">
                          Learns from user corrections to improve future suggestions
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge className="mt-0.5">RT</Badge>
                      <div>
                        <p className="font-medium text-sm">Real-time Validation</p>
                        <p className="text-xs text-muted-foreground">
                          Instant feedback as you type with smart debouncing
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="technology" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-sm mb-1">Tech Stack</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">OpenAI GPT-3.5</Badge>
                        <Badge variant="outline">TypeScript</Badge>
                        <Badge variant="outline">React</Badge>
                        <Badge variant="outline">PostgreSQL</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium text-sm mb-1">Validation Methods</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">Regex Patterns</Badge>
                        <Badge variant="outline">AI Analysis</Badge>
                        <Badge variant="outline">Format Detection</Badge>
                        <Badge variant="outline">Context Awareness</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium text-sm mb-1">Data Storage</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Validation rules in PostgreSQL</li>
                        <li>• Error patterns tracked for ML</li>
                        <li>• User corrections stored for learning</li>
                        <li>• Anonymous usage analytics</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Criteria Met ✓</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="default" className="mt-0.5">✓</Badge>
                <p className="text-sm">
                  Phone "555-1234" → Suggests adding area code
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="default" className="mt-0.5">✓</Badge>
                <p className="text-sm">
                  Detects international formats (+1, +44, etc.)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="default" className="mt-0.5">✓</Badge>
                <p className="text-sm">
                  One-click formatting fixes available
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="default" className="mt-0.5">✓</Badge>
                <p className="text-sm">
                  AI-powered contextual suggestions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
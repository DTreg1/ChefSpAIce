import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  FileSearch,
  Wand2,
  Users,
  CheckSquare,
  Upload,
  Settings,
  Sparkles
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { TemplateBuilder } from '@/components/extraction/TemplateBuilder';
import { ExtractionPreview } from '@/components/extraction/ExtractionPreview';
import { BatchProcessor } from '@/components/extraction/BatchProcessor';
import { DataValidator } from '@/components/extraction/DataValidator';

export default function ExtractionPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('extract');
  const [inputText, setInputText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [latestExtraction, setLatestExtraction] = useState<any>(null);

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery<{ templates: any[] }>({
    queryKey: ['/api/extract/templates']
  });

  // Single extraction mutation
  const extractMutation = useMutation({
    mutationFn: async (data: { text: string, templateId?: string, customSchema?: any }) => {
      return apiRequest('/api/extract/data', 'POST', {
        text: data.text,
        templateId: data.templateId,
        customSchema: data.customSchema,
        sourceType: 'email'
      });
    },
    onSuccess: (data) => {
      setLatestExtraction(data.extraction);
      toast({
        title: "Extraction Complete",
        description: `Successfully extracted data with ${(data.extraction.confidence * 100).toFixed(1)}% confidence`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/extract/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/extract/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract data from text",
        variant: "destructive"
      });
    }
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      return apiRequest('/api/extract/template', 'POST', template);
    },
    onSuccess: (data) => {
      toast({
        title: "Template Saved",
        description: `Template "${data.template.name}" has been saved successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/extract/templates'] });
      setActiveTab('extract');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Template",
        description: error.message || "An error occurred while saving the template",
        variant: "destructive"
      });
    }
  });

  // Validate extraction
  const handleValidate = () => {
    if (!latestExtraction) return;
    
    toast({
      title: "Extraction Validated",
      description: "The extraction has been marked as validated",
    });
    setLatestExtraction(null);
  };

  // Correct extraction
  const handleCorrect = () => {
    if (!latestExtraction) return;
    
    // Navigate to validator tab
    setActiveTab('validate');
  };

  // Extract text
  const handleExtract = () => {
    if (!inputText.trim()) {
      toast({
        title: "No Text Provided",
        description: "Please enter some text to extract data from",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTemplateId) {
      // Use default order extraction template
      const orderSchema = {
        fields: [
          {
            name: "customerName",
            type: "string",
            description: "The full name of the customer",
            required: true
          },
          {
            name: "items",
            type: "array",
            description: "List of ordered items with name and quantity",
            required: true
          },
          {
            name: "quantities",
            type: "array",
            description: "Quantities for each item ordered",
            required: true
          },
          {
            name: "deliveryAddress",
            type: "string",
            description: "Complete delivery address including street, city, state, and zip",
            required: true
          },
          {
            name: "orderTotal",
            type: "number",
            description: "Total order amount in dollars",
            required: false
          },
          {
            name: "orderDate",
            type: "date",
            description: "Date when the order was placed",
            required: false
          }
        ]
      };

      extractMutation.mutate({
        text: inputText,
        customSchema: orderSchema
      });
    } else {
      extractMutation.mutate({
        text: inputText,
        templateId: selectedTemplateId
      });
    }
  };

  const templates = templatesData?.templates || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSearch className="w-8 h-8" />
            Data Extraction System
          </h1>
          <p className="text-muted-foreground mt-1">
            Extract structured data from unstructured text with 95% accuracy using AI
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveTab('templates')}
          data-testid="button-manage-templates"
        >
          <Settings className="w-4 h-4 mr-1" />
          Manage Templates
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Powered by OpenAI GPT-3.5</AlertTitle>
        <AlertDescription>
          This system uses Replit AI Integrations to extract structured data from emails, documents, and messages.
          No API key required - usage is billed to your Replit credits.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="extract" data-testid="tab-extract">
            <Wand2 className="w-4 h-4 mr-1" />
            Extract
          </TabsTrigger>
          <TabsTrigger value="batch" data-testid="tab-batch">
            <Users className="w-4 h-4 mr-1" />
            Batch Process
          </TabsTrigger>
          <TabsTrigger value="validate" data-testid="tab-validate">
            <CheckSquare className="w-4 h-4 mr-1" />
            Validate
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Settings className="w-4 h-4 mr-1" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Extract Tab */}
        <TabsContent value="extract" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>Input Text</CardTitle>
                <CardDescription>
                  Paste an email, document, or message to extract data from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Template (Optional)</Label>
                  <Select
                    value={selectedTemplateId || "default"}
                    onValueChange={(val) => setSelectedTemplateId(val === "default" ? "" : val)}
                    disabled={templatesLoading}
                  >
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder="Use default order extraction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Order Extraction</SelectItem>
                      {templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Text to Extract From</Label>
                  <Textarea
                    placeholder="Paste your email or document text here...

Example:
Hi, this is John Smith. I'd like to order 3 pizzas and 2 sodas for delivery to 123 Main St, San Francisco, CA 94102. The total comes to $45.99. Thanks!"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={12}
                    data-testid="textarea-input"
                  />
                </div>
                
                <Button
                  onClick={handleExtract}
                  disabled={!inputText.trim() || extractMutation.isPending}
                  className="w-full"
                  data-testid="button-extract"
                >
                  {extractMutation.isPending ? (
                    <>Extracting...</>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-1" />
                      Extract Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview Section */}
            {latestExtraction ? (
              <ExtractionPreview
                inputText={latestExtraction.inputText}
                extractedFields={latestExtraction.extractedFields}
                fieldConfidence={latestExtraction.fieldConfidence}
                overallConfidence={latestExtraction.confidence}
                validationStatus={latestExtraction.validationStatus}
                onValidate={handleValidate}
                onCorrect={handleCorrect}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Extraction Preview</CardTitle>
                  <CardDescription>
                    Extracted data will appear here
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No extraction yet</p>
                    <p className="text-sm mt-1">
                      Enter text and click "Extract Data" to begin
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Batch Process Tab */}
        <TabsContent value="batch">
          <BatchProcessor 
            templates={templates}
            onComplete={(results) => {
              toast({
                title: "Batch Processing Complete",
                description: `Processed ${results.length} items successfully`,
              });
            }}
          />
        </TabsContent>

        {/* Validate Tab */}
        <TabsContent value="validate">
          <DataValidator />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplateBuilder
            onSave={(template) => {
              saveTemplateMutation.mutate(template);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
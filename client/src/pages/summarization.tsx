import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Sparkles, Copy } from "lucide-react";
import {
  SummaryCardLegacy as SummaryCard,
  SummaryToggleLegacy as SummaryToggle,
  SummaryLengthSelector,
  BulletSummaryLegacy as BulletSummary,
  KeyPointsHighlighter,
} from "@/components/summaries";
import type { Summary } from "@shared/schema";

// Sample article for testing (approximately 1000 words)
const SAMPLE_ARTICLE = `
The Rise of Sustainable Agriculture: Transforming Food Systems for a Better Future

In recent years, sustainable agriculture has emerged as a critical solution to address the interconnected challenges of food security, environmental degradation, and climate change. As the global population continues to grow, expected to reach nearly 10 billion by 2050, the demand for food production intensifies, placing unprecedented pressure on our planet's resources. Traditional farming methods, while having fed humanity for millennia, are increasingly recognized as unsustainable in their current form, contributing to deforestation, soil degradation, water scarcity, and greenhouse gas emissions.

Sustainable agriculture represents a paradigm shift in how we approach food production. Unlike conventional farming, which often prioritizes maximum yield at any environmental cost, sustainable agriculture seeks to balance productivity with ecological health, social equity, and economic viability. This holistic approach recognizes that farming is not an isolated activity but an integral part of complex ecosystems that must be preserved for future generations.

One of the fundamental principles of sustainable agriculture is soil health management. Healthy soil is the foundation of productive farming, yet conventional practices have led to widespread soil degradation. Sustainable farmers employ techniques such as crop rotation, cover cropping, and reduced tillage to maintain soil structure, enhance organic matter content, and promote beneficial microbial activity. These practices not only improve crop yields over time but also increase the soil's capacity to sequester carbon, contributing to climate change mitigation.

Water conservation is another crucial aspect of sustainable agriculture. With agriculture consuming approximately 70% of global freshwater resources, efficient water management is essential. Sustainable farming employs various strategies including drip irrigation, rainwater harvesting, and drought-resistant crop varieties. These methods significantly reduce water waste while maintaining crop productivity, ensuring that this precious resource remains available for future generations and other essential uses.

Biodiversity preservation within agricultural systems is increasingly recognized as vital for long-term sustainability. Monoculture farming, while efficient in the short term, creates vulnerable ecosystems susceptible to pests and diseases. Sustainable agriculture promotes polyculture systems, integrating multiple crop species and maintaining natural habitats within and around farms. This approach not only reduces the need for synthetic pesticides but also supports beneficial insects, birds, and other wildlife that contribute to natural pest control and pollination services.

The economic dimension of sustainable agriculture challenges the notion that environmentally friendly farming is necessarily less profitable. While transitioning to sustainable practices may require initial investments, long-term benefits often include reduced input costs, premium prices for organic or sustainably certified products, and increased resilience to climate-related risks. Many sustainable farms report improved profitability through diversified income streams, including agritourism, direct-to-consumer sales, and value-added products.

Technology plays an increasingly important role in advancing sustainable agriculture. Precision farming techniques, utilizing GPS, sensors, and data analytics, allow farmers to optimize resource use by applying water, fertilizers, and pesticides only where and when needed. Vertical farming and hydroponics offer solutions for urban agriculture, reducing transportation costs and land use. Meanwhile, advances in biological pest control and plant breeding are creating alternatives to chemical inputs and developing climate-resilient crop varieties.

The social aspects of sustainable agriculture extend beyond environmental concerns to encompass fair labor practices, community engagement, and food justice. Sustainable farming often emphasizes local food systems, reducing transportation distances and strengthening connections between producers and consumers. Community-supported agriculture (CSA) programs, farmers' markets, and farm-to-table initiatives not only provide fresh, nutritious food but also educate consumers about farming practices and seasonal eating.

However, the transition to sustainable agriculture faces significant challenges. Initial costs, knowledge gaps, market access, and policy barriers can discourage farmers from adopting sustainable practices. Additionally, the need to feed a growing global population raises questions about whether sustainable methods can match the productivity of industrial agriculture. Critics argue that without synthetic inputs and intensive farming techniques, food production would decline, potentially leading to increased hunger and higher food prices.

Research increasingly suggests that these concerns may be overstated. Studies have shown that sustainable farming methods can match or even exceed conventional yields, particularly in developing countries where access to synthetic inputs is limited. Furthermore, when considering the true cost of food production, including environmental externalities and health impacts, sustainable agriculture often proves more economically efficient than conventional methods.

The path forward requires coordinated action from multiple stakeholders. Governments must create supportive policies, including subsidies for sustainable practices, investment in research and development, and regulations that account for environmental costs. Consumers play a crucial role through their purchasing decisions, supporting sustainable products and reducing food waste. Educational institutions must integrate sustainable agriculture into their curricula, preparing the next generation of farmers and agricultural professionals.

International cooperation is essential, as agricultural challenges transcend national boundaries. Climate change, water scarcity, and biodiversity loss require global solutions and knowledge sharing. Organizations like the Food and Agriculture Organization (FAO) facilitate this cooperation, promoting sustainable practices worldwide and supporting developing nations in their agricultural transitions.

As we look to the future, sustainable agriculture represents not just an alternative to conventional farming but a necessary evolution in our relationship with the land. By embracing practices that work with nature rather than against it, we can create food systems that nourish both people and the planet. The transition will not be without challenges, but the alternative – continued degradation of our agricultural resources – is untenable. Through innovation, collaboration, and commitment, sustainable agriculture offers a path toward food security, environmental health, and rural prosperity for generations to come.
`;

export default function SummarizationPage() {
  const [inputText, setInputText] = useState("");
  const [summaryType, setSummaryType] = useState<'tldr' | 'bullet' | 'paragraph'>('tldr');
  const [summaryLength, setSummaryLength] = useState(2);
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [showSummaryView, setShowSummaryView] = useState(false);
  const { toast } = useToast();

  // Generate summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async (data: {
      content: string;
      type: 'tldr' | 'bullet' | 'paragraph';
      length: number;
    }) => {
      return apiRequest<Summary>('/api/summarize', 'POST', {
        content: data.content,
        type: data.type,
        length: data.length,
        extractKeyPoints: true,
      });
    },
    onSuccess: (data) => {
      setCurrentSummary(data);
      setShowSummaryView(true);
      toast({
        description: `Summary generated successfully (${data.wordCountSummary || 0} words)`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Failed to generate summary. Please try again.",
      });
      console.error('Summary error:', error);
    },
  });

  // Edit summary mutation
  const editSummaryMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      return apiRequest<Summary>(`/api/summarize/${id}`, 'PUT', {
        editedText: text,
        isEdited: true,
      });
    },
    onSuccess: (data) => {
      setCurrentSummary(data);
      toast({
        description: "Summary updated successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to update summary",
      });
    },
  });

  const handleGenerateSummary = () => {
    if (!inputText.trim()) {
      toast({
        variant: "destructive",
        description: "Please enter some text to summarize",
      });
      return;
    }

    if (inputText.length < 50) {
      toast({
        variant: "destructive",
        description: "Text must be at least 50 characters long",
      });
      return;
    }

    generateSummaryMutation.mutate({
      content: inputText,
      type: summaryType,
      length: summaryLength,
    });
  };

  const handleEditSummary = async (summaryId: string, editedText: string) => {
    editSummaryMutation.mutate({ id: summaryId, text: editedText });
  };

  const loadSampleArticle = () => {
    setInputText(SAMPLE_ARTICLE.trim());
    toast({
      description: "Sample article loaded (1000+ words)",
    });
  };

  const handleCopyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      description: "Text copied to clipboard",
    });
  };

  const wordCount = inputText.split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Automatic Summarization</h1>
        <p className="text-muted-foreground">
          Create concise TL;DR versions of long content while preserving key information
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Text</CardTitle>
              <CardDescription>
                Paste your article, document, or any text you want to summarize
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {wordCount} words
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSampleArticle}
                  data-testid="button-load-sample"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Load 1000-Word Sample
                </Button>
              </div>

              <Textarea
                placeholder="Enter your text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[300px] resize-none font-mono text-sm"
                data-testid="textarea-input-text"
              />

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleGenerateSummary}
                  disabled={generateSummaryMutation.isPending || inputText.length < 50}
                  data-testid="button-generate-summary"
                >
                  {generateSummaryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleCopyText(inputText)}
                  disabled={!inputText}
                  data-testid="button-copy-input"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Options */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Options</CardTitle>
              <CardDescription>
                Customize how your summary is generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SummaryLengthSelector
                type={summaryType}
                length={summaryLength}
                onTypeChange={setSummaryType}
                onLengthChange={setSummaryLength}
              />
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
          {currentSummary ? (
            <>
              {/* Toggle between summary and original */}
              <div className="flex justify-end">
                <SummaryToggle
                  showSummary={showSummaryView}
                  onToggle={() => setShowSummaryView(!showSummaryView)}
                />
              </div>

              {showSummaryView ? (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <SummaryCard
                    summary={currentSummary}
                    onEdit={handleEditSummary}
                    showOriginal={true}
                  />

                  {/* Key Points if available */}
                  {currentSummary.keyPoints && currentSummary.keyPoints.length > 0 && (
                    <KeyPointsHighlighter
                      keyPoints={currentSummary.keyPoints}
                      title="Main Takeaways"
                    />
                  )}

                  {/* Show bullet format if it's a bullet summary */}
                  {currentSummary.summaryType === 'bullet' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Formatted View</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <BulletSummary bullets={currentSummary.summary.split('\n')} />
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                // Show original text view
                <Card>
                  <CardHeader>
                    <CardTitle>Original Text</CardTitle>
                    <CardDescription>
                      {currentSummary.wordCountOriginal || 0} words
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[500px] overflow-y-auto">
                      <p className="whitespace-pre-wrap text-sm">
                        {currentSummary.originalContent}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            // Placeholder when no summary yet
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No Summary Yet</h3>
                  <p className="text-muted-foreground">
                    Enter text and click "Generate Summary" to see the result
                  </p>
                </div>
                {!inputText && (
                  <Button
                    variant="outline"
                    onClick={loadSampleArticle}
                    data-testid="button-try-sample"
                  >
                    Try Sample Article
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
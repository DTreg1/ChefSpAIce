import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SummaryCard } from "@/components/summaries/SummaryCard";
import { SummaryToggle } from "@/components/summaries/SummaryToggle";
import { SummaryLength } from "@/components/summaries/SummaryLength";
import { BulletSummary, QuickBulletList } from "@/components/summaries/BulletSummary";
import { KeyPoints, InlineKeyPoints } from "@/components/summaries/KeyPoints";
import { Loader2, FileText, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample test content - a 1000+ word article about AI and machine learning
const sampleContent = `
Artificial Intelligence and Machine Learning: Revolutionizing the Digital Age

In the rapidly evolving landscape of technology, artificial intelligence (AI) and machine learning (ML) have emerged as transformative forces that are fundamentally reshaping how we interact with the digital world. These technologies, once confined to the realm of science fiction, have become integral components of our daily lives, powering everything from smartphone assistants to complex medical diagnostic systems.

The journey of AI began in the 1950s when computer scientist Alan Turing proposed the famous "Turing Test" to determine whether a machine could exhibit intelligent behavior indistinguishable from that of a human. Since then, the field has experienced several waves of enthusiasm and disappointment, commonly referred to as "AI winters" and "AI springs." However, the current surge in AI capabilities, driven by advances in computational power, big data availability, and sophisticated algorithms, represents an unprecedented era of innovation.

Machine learning, a subset of AI, focuses on enabling computers to learn from data without being explicitly programmed for every scenario. This approach has proven particularly powerful because it allows systems to improve their performance over time through experience. The three main types of machine learning – supervised learning, unsupervised learning, and reinforcement learning – each serve different purposes and have unique applications across various industries.

Supervised learning, where algorithms learn from labeled training data, has revolutionized fields such as image recognition and natural language processing. Companies like Google and Facebook use supervised learning to power their photo tagging features, while healthcare providers employ it to detect diseases from medical imaging with remarkable accuracy. The success of these applications has led to widespread adoption across industries, from financial services using it for fraud detection to retail companies employing it for customer behavior prediction.

Unsupervised learning, which identifies patterns in unlabeled data, has proven invaluable for discovering hidden structures and relationships within complex datasets. This approach has enabled breakthroughs in customer segmentation, anomaly detection, and recommendation systems. Netflix's content recommendation engine and Amazon's product suggestions are prime examples of unsupervised learning algorithms working behind the scenes to enhance user experience.

Reinforcement learning, where agents learn through trial and error by receiving rewards or penalties, has achieved spectacular results in game playing and robotics. DeepMind's AlphaGo, which defeated the world champion in the ancient game of Go, demonstrated the power of reinforcement learning to master complex strategic decisions. This same approach is now being applied to optimize energy consumption in data centers, control autonomous vehicles, and develop more effective drug discovery processes.

The impact of AI and ML extends far beyond technical achievements. These technologies are transforming entire industries and creating new economic opportunities. In healthcare, AI-powered diagnostic tools are helping doctors detect cancers earlier and with greater accuracy than ever before. In finance, machine learning algorithms are revolutionizing trading strategies, risk assessment, and customer service through intelligent chatbots. The transportation sector is being reimagined through autonomous vehicles and smart traffic management systems that promise to reduce accidents and improve efficiency.

However, the rapid advancement of AI and ML also raises important ethical and societal questions. Concerns about job displacement, privacy, algorithmic bias, and the concentration of power in the hands of a few technology giants have sparked intense debate among policymakers, technologists, and the public. The "black box" nature of some machine learning models, particularly deep neural networks, makes it difficult to understand how decisions are made, raising questions about accountability and transparency.

The issue of bias in AI systems has become particularly prominent, as studies have shown that algorithms can perpetuate and even amplify existing societal prejudices. Facial recognition systems that perform poorly on certain ethnic groups, hiring algorithms that discriminate against women, and criminal justice risk assessment tools that exhibit racial bias have highlighted the need for more diverse datasets and inclusive development practices.

Despite these challenges, the potential benefits of AI and ML continue to drive massive investment and research. Governments around the world are developing national AI strategies, recognizing these technologies as critical to future economic competitiveness. China and the United States are engaged in what some call an "AI arms race," investing billions of dollars in research and development. The European Union has taken a different approach, focusing on ethical AI and establishing comprehensive regulations to protect citizens' rights while fostering innovation.

Looking ahead, the future of AI and ML appears both exciting and uncertain. Emerging technologies like quantum computing promise to exponentially increase computational power, potentially enabling breakthroughs in areas currently beyond reach. The concept of artificial general intelligence (AGI) – machines that can understand, learn, and apply knowledge across diverse domains like humans – remains a topic of intense speculation and research.

As we stand on the brink of what many consider the Fourth Industrial Revolution, it's clear that AI and machine learning will play central roles in shaping our future. The challenge lies not just in advancing these technologies, but in ensuring they are developed and deployed in ways that benefit humanity as a whole. This requires ongoing collaboration between technologists, ethicists, policymakers, and the public to navigate the complex landscape of opportunities and risks that AI presents.

The transformation brought by AI and ML is not a distant possibility but a present reality that continues to unfold at an accelerating pace. As these technologies become more sophisticated and ubiquitous, understanding their capabilities, limitations, and implications becomes crucial for individuals, organizations, and societies. The decisions we make today about how to develop, regulate, and integrate AI will have profound consequences for generations to come.
`;

export default function SummarizationDemo() {
  const { toast } = useToast();
  const [content, setContent] = useState(sampleContent);
  const [summaryType, setSummaryType] = useState<'tldr' | 'bullet' | 'paragraph'>('tldr');
  const [summaryLength, setSummaryLength] = useState(2);
  const [extractKeyPoints, setExtractKeyPoints] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const summarizeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/summarize', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      setSummaryResult(data);
      setShowSummary(true);
      toast({
        title: "Summary Generated",
        description: `Created ${data.wordCount} word summary (${data.compressionRatio}% reduction)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
    }
  });

  const handleGenerateSummary = () => {
    if (content.trim().length < 50) {
      toast({
        title: "Content too short",
        description: "Please enter at least 50 characters of content to summarize",
        variant: "destructive",
      });
      return;
    }

    summarizeMutation.mutate({
      content: content.trim(),
      type: summaryType,
      length: summaryLength,
      extractKeyPoints
    });
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Summarization Demo
        </h1>
        <p className="text-muted-foreground">
          Test the AI-powered summarization feature with custom content or use our sample article
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Content</CardTitle>
              <CardDescription>
                Enter or paste the content you want to summarize
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="content-input">Content to Summarize</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {wordCount} words
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyContent}
                    data-testid="button-copy-content"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Textarea
                id="content-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your content here..."
                className="min-h-[400px] resize-y"
                data-testid="textarea-content-input"
              />

              <div className="space-y-4 border-t pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="summary-type">Summary Format</Label>
                    <Select value={summaryType} onValueChange={(value: any) => setSummaryType(value)}>
                      <SelectTrigger id="summary-type" data-testid="select-summary-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tldr">TL;DR</SelectItem>
                        <SelectItem value="bullet">Bullet Points</SelectItem>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="key-points"
                      checked={extractKeyPoints}
                      onCheckedChange={setExtractKeyPoints}
                      data-testid="switch-key-points"
                    />
                    <Label htmlFor="key-points">Extract Key Points</Label>
                  </div>
                </div>

                <SummaryLength
                  value={summaryLength}
                  onChange={setSummaryLength}
                  mode="slider"
                  className="border-0 p-0"
                />

                <Button
                  onClick={handleGenerateSummary}
                  disabled={summarizeMutation.isPending || content.trim().length < 50}
                  className="w-full"
                  data-testid="button-generate-summary"
                >
                  {summarizeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {summaryResult && showSummary && (
            <>
              <SummaryCard
                summary={summaryResult.summary}
                originalContent={content}
                type={summaryType}
                wordCount={summaryResult.wordCount}
                originalWordCount={summaryResult.originalWordCount}
                keyPoints={summaryResult.keyPoints}
                compressionRatio={summaryResult.compressionRatio}
                onEdit={(newText) => {
                  setSummaryResult({ ...summaryResult, summary: newText });
                  toast({
                    title: "Summary Updated",
                    description: "Your changes have been saved",
                  });
                }}
              />

              {summaryType === 'bullet' && (
                <BulletSummary
                  bullets={summaryResult.summary.split('\n').filter((line: string) => line.trim())}
                  title="Summary Points"
                  variant="checkmarks"
                />
              )}

              {summaryResult.keyPoints && summaryResult.keyPoints.length > 0 && (
                <KeyPoints
                  keyPoints={summaryResult.keyPoints}
                  variant="highlight"
                  showCopyButton={true}
                />
              )}
            </>
          )}

          {!summaryResult && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your summary will appear here</p>
                  <p className="text-sm mt-2">
                    Click "Generate Summary" to create a concise version of your content
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Component Examples */}
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-bold">Component Showcase</h2>
        
        <Tabs defaultValue="toggle" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="toggle">Toggle Button</TabsTrigger>
            <TabsTrigger value="bullets">Bullet Formats</TabsTrigger>
            <TabsTrigger value="keypoints">Key Points</TabsTrigger>
            <TabsTrigger value="inline">Inline Display</TabsTrigger>
          </TabsList>
          
          <TabsContent value="toggle" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Summary Toggle Button</CardTitle>
                <CardDescription>
                  Different states of the summary toggle button
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4 flex-wrap">
                <SummaryToggle
                  isVisible={false}
                  onToggle={() => setShowSummary(!showSummary)}
                />
                <SummaryToggle
                  isVisible={true}
                  onToggle={() => setShowSummary(!showSummary)}
                />
                <SummaryToggle
                  isVisible={false}
                  isLoading={true}
                  onToggle={() => {}}
                  disabled={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bullets" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <BulletSummary
                bullets={[
                  "AI and ML are transforming industries",
                  "Three types of machine learning exist",
                  "Ethical concerns need addressing",
                  "Future looks promising but uncertain"
                ]}
                title="Default Style"
                variant="default"
              />
              <BulletSummary
                bullets={[
                  "Started in the 1950s with Turing Test",
                  "Experienced multiple AI winters and springs",
                  "Current surge driven by big data and computing power",
                  "Applications span from healthcare to transportation"
                ]}
                title="Numbered Style"
                variant="numbered"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="keypoints" className="space-y-4">
            <KeyPoints
              keyPoints={[
                "AI has evolved from science fiction to daily reality",
                "Machine learning enables computers to learn from data",
                "Ethical challenges include bias and transparency",
                "Global competition drives massive investment"
              ]}
              variant="cards"
              showCopyButton={true}
            />
          </TabsContent>
          
          <TabsContent value="inline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inline Key Points Display</CardTitle>
              </CardHeader>
              <CardContent>
                <InlineKeyPoints
                  keyPoints={[
                    "Revolutionary Technology",
                    "Industry Transformation",
                    "Ethical Considerations",
                    "Future Potential"
                  ]}
                />
                
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Quick Bullet List</h4>
                  <QuickBulletList
                    bullets={[
                      "Supervised learning for labeled data",
                      "Unsupervised learning for pattern discovery",
                      "Reinforcement learning for decision making"
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
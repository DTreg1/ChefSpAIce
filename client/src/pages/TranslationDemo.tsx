import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LanguageSelector, LanguagePreferences } from "@/components/language";
import { TranslationToggle } from "@/components/translation-toggle";
import { TranslatedContent } from "@/components/translated-content";
import { TranslationQuality } from "@/components/translation-quality";
import { Globe, Settings, FileText, MessageSquare } from "lucide-react";

export default function TranslationDemo() {
  const [demoContent, setDemoContent] = useState(`Welcome to our real-time translation system! This platform automatically translates content into multiple languages while preserving formatting and context. Our AI-powered translations ensure that the meaning and tone of your message remain intact across all languages.`);
  const [contentId] = useState(`demo_${Date.now()}`);

  const recipeExample = `Classic Italian Pasta Carbonara

Ingredients:
- 400g spaghetti
- 200g pancetta or guanciale
- 4 large eggs
- 100g Pecorino Romano cheese
- Black pepper
- Salt for pasta water

Instructions:
1. Boil the pasta in salted water until al dente
2. While pasta cooks, dice the pancetta and fry until crispy
3. Beat eggs with grated cheese and black pepper
4. Drain pasta, reserving 1 cup pasta water
5. Mix hot pasta with pancetta, then add egg mixture off heat
6. Add pasta water gradually until creamy
7. Serve immediately with extra cheese and pepper

Chef's tip: The heat from the pasta cooks the eggs - never add eggs over direct heat!`;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Real-Time Translation System</h1>
          </div>
          <TranslationToggle />
        </div>
        
        <p className="text-muted-foreground">
          Experience context-aware translations that preserve formatting and meaning across multiple languages
        </p>
      </div>

      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demo" data-testid="tab-demo">
            <FileText className="h-4 w-4 mr-2" />
            Translation Demo
          </TabsTrigger>
          <TabsTrigger value="examples" data-testid="tab-examples">
            <MessageSquare className="h-4 w-4 mr-2" />
            Examples
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Demo Tab */}
        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Try Live Translation</CardTitle>
              <CardDescription>
                Enter or modify the text below to see real-time translations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Content</label>
                <Textarea
                  value={demoContent}
                  onChange={(e) => setDemoContent(e.target.value)}
                  placeholder="Enter text to translate..."
                  className="min-h-[120px]"
                  data-testid="textarea-demo-content"
                />
              </div>

              <div className="flex items-center justify-between">
                <TranslationQuality quality="balanced" confidence={85} />
                <Button
                  variant="outline"
                  onClick={() => setDemoContent(recipeExample)}
                  data-testid="button-load-example"
                >
                  Load Recipe Example
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Translations</label>
                <TranslatedContent
                  contentId={contentId}
                  originalContent={demoContent}
                  contentType="general"
                  context="Demo content for translation system"
                  autoTranslate={true}
                  showOriginal={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples" className="space-y-6">
          <div className="grid gap-6">
            {/* Recipe Example */}
            <Card>
              <CardHeader>
                <CardTitle>Recipe Translation</CardTitle>
                <CardDescription>
                  Cooking terms and measurements adapted for each culture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TranslatedContent
                  contentId="recipe_example"
                  originalContent={recipeExample}
                  contentType="recipe"
                  context="Italian cuisine recipe"
                  autoTranslate={false}
                  showOriginal={false}
                />
              </CardContent>
            </Card>

            {/* Social Post Example */}
            <Card>
              <CardHeader>
                <CardTitle>Social Media Post</CardTitle>
                <CardDescription>
                  Maintaining voice and tone across languages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TranslatedContent
                  contentId="social_example"
                  originalContent="🎉 Excited to announce our new product launch! After months of hard work, we're finally ready to share something amazing with you all. Stay tuned for more details tomorrow! #Innovation #ProductLaunch #ExcitingNews"
                  contentType="post"
                  context="Product announcement on social media"
                  autoTranslate={false}
                  showOriginal={false}
                />
              </CardContent>
            </Card>

            {/* Message Example */}
            <Card>
              <CardHeader>
                <CardTitle>Business Message</CardTitle>
                <CardDescription>
                  Professional communication with cultural adaptation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TranslatedContent
                  contentId="message_example"
                  originalContent="Dear Team,

I hope this message finds you well. I wanted to update you on our Q4 progress and share some exciting developments. Our sales have exceeded expectations by 23%, and customer satisfaction scores are at an all-time high.

Let's schedule a meeting next week to discuss our strategy for the upcoming quarter. Please let me know your availability.

Best regards,
The Management Team"
                  contentType="message"
                  context="Business communication to team members"
                  autoTranslate={false}
                  showOriginal={false}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <LanguagePreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}
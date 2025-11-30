import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Languages, 
  Check, 
  RefreshCw, 
  Copy, 
  CheckCircle,
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface TranslatedContentProps {
  contentId: string;
  originalContent: string;
  contentType?: 'post' | 'recipe' | 'message' | 'general';
  context?: string;
  autoTranslate?: boolean;
  showOriginal?: boolean;
}

interface Translation {
  id: string;
  contentId: string;
  languageCode: string;
  translatedText: string;
  originalText: string;
  isVerified: boolean;
  translatorId?: string;
  createdAt: string;
  updatedAt: string;
}

// Language code to abbreviation mapping for badge display
const languageAbbreviations: Record<string, string> = {
  'en': 'EN',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
  'it': 'IT',
  'pt': 'PT',
  'ru': 'RU',
  'ja': 'JA',
  'ko': 'KO',
  'zh': 'ZH',
  'ar': 'AR',
  'hi': 'HI',
  'nl': 'NL',
  'sv': 'SV',
  'pl': 'PL'
};

// Helper to render language badge with abbreviation
const renderLanguageBadge = (languageCode: string) => (
  <Badge variant="outline" className="min-w-fit text-xs font-medium">
    {languageAbbreviations[languageCode] || languageCode.toUpperCase()}
  </Badge>
);

export function TranslatedContent({
  contentId,
  originalContent,
  contentType = 'general',
  context,
  autoTranslate = true,
  showOriginal = false
}: TranslatedContentProps) {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [copiedLanguage, setCopiedLanguage] = useState<string | null>(null);

  // Fetch user's language preferences
  const { data: preferences = { autoTranslate: false, preferredLanguages: [] } } = useQuery<{
    autoTranslate: boolean;
    preferredLanguages: string[];
  }>({
    queryKey: ['/api/languages/preferences']
  });

  // Fetch existing translations
  const { 
    data: translationsData = { translations: [] }, 
    isLoading: isLoadingTranslations,
    refetch: refetchTranslations 
  } = useQuery<{ translations: Translation[] }>({
    queryKey: [`/api/content/${contentId}/translations`],
    enabled: !!contentId,
  });

  const translations: Translation[] = translationsData.translations;

  // Fetch supported languages
  const { data: languages = [] } = useQuery<Array<{ code: string; name: string }>>({
    queryKey: ['/api/languages/supported'],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Auto-translate on mount if enabled
  useEffect(() => {
    if (autoTranslate && preferences?.autoTranslate && !isLoadingTranslations) {
      if (translations.length === 0 && preferences?.preferredLanguages?.length > 0) {
        performTranslation.mutate({
          targetLanguages: preferences.preferredLanguages
        });
      }
    }
  }, [
    contentId, 
    autoTranslate, 
    preferences?.autoTranslate, 
    preferences?.preferredLanguages,
    isLoadingTranslations,
    translations.length
  ]);

  // Translate content mutation
  const performTranslation = useMutation({
    mutationFn: async ({ targetLanguages }: { targetLanguages?: string[] }) => {
      return apiRequest('/api/translate', 'POST', {
        content: originalContent,
        contentId,
        targetLanguages: targetLanguages || preferences?.preferredLanguages || ['es', 'fr', 'de'],
        contentType,
        context,
        preserveFormatting: true
      });
    },
    onSuccess: () => {
      refetchTranslations();
      toast({
        title: "Translation complete",
        description: "Content has been translated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Translation failed",
        description: "Failed to translate content. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Verify translation mutation
  const verifyTranslation = useMutation({
    mutationFn: async (translationId: string) => {
      return apiRequest('/api/translate/verify', 'POST', {
        translationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${contentId}/translations`] });
      toast({
        title: "Translation verified",
        description: "Translation has been marked as verified",
      });
    }
  });

  // Copy translation to clipboard
  const copyToClipboard = async (text: string, languageCode: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLanguage(languageCode);
      setTimeout(() => setCopiedLanguage(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Translation has been copied",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy translation",
        variant: "destructive"
      });
    }
  };

  // Get language name from code
  const getLanguageName = (code: string) => {
    const lang = languages.find((l: { code: string; name: string }) => l.code === code);
    return lang?.name || code.toUpperCase();
  };

  if (isLoadingTranslations) {
    return (
      <Card className="p-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    );
  }

  if (translations.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Languages className="h-4 w-4" />
            <span>No translations available</span>
          </div>
          <Button
            size="sm"
            onClick={() => performTranslation.mutate({})}
            disabled={performTranslation.isPending}
            data-testid="button-translate"
          >
            {performTranslation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="h-4 w-4 mr-2" />
                Translate
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={selectedLanguage}
        onValueChange={setSelectedLanguage}
        defaultValue={translations[0]?.languageCode || 'en'}
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid grid-cols-auto gap-1">
            {showOriginal && (
              <TabsTrigger 
                value="original" 
                data-testid="tab-original"
              >
                Original
              </TabsTrigger>
            )}
            {translations.map((translation) => (
              <TabsTrigger 
                key={translation.languageCode} 
                value={translation.languageCode}
                data-testid={`tab-language-${translation.languageCode}`}
                className="flex items-center gap-1.5"
              >
                <Badge variant="outline" className="min-w-fit text-xs font-medium">
                  {languageAbbreviations[translation.languageCode] || translation.languageCode.toUpperCase()}
                </Badge>
                {translation.isVerified && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button
            size="sm"
            variant="outline"
            onClick={() => performTranslation.mutate({})}
            disabled={performTranslation.isPending}
            data-testid="button-refresh-translations"
          >
            <RefreshCw className={`h-4 w-4 ${performTranslation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {showOriginal && (
          <TabsContent value="original" className="mt-4">
            <Card className="p-4">
              <div className="prose max-w-none dark:prose-invert">
                {originalContent}
              </div>
            </Card>
          </TabsContent>
        )}

        {translations.map((translation) => (
          <TabsContent 
            key={translation.languageCode} 
            value={translation.languageCode}
            className="mt-4"
          >
            <Card className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant={translation.isVerified ? "default" : "outline"}>
                    {translation.isVerified ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unverified
                      </>
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(translation.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {!translation.isVerified && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => verifyTranslation.mutate(translation.id)}
                      disabled={verifyTranslation.isPending}
                      data-testid={`button-verify-${translation.languageCode}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(translation.translatedText, translation.languageCode)}
                    data-testid={`button-copy-${translation.languageCode}`}
                  >
                    {copiedLanguage === translation.languageCode ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="prose max-w-none dark:prose-invert">
                {translation.translatedText || <span className="text-muted-foreground">No translation available</span>}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
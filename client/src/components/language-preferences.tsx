import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Globe, 
  Languages, 
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  BarChart2,
  Award
} from "lucide-react";
import { LanguageSelector } from "./language-selector";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguagePreference {
  preferredLanguages: string[];
  autoTranslate: boolean;
  nativeLanguage: string;
  showOriginalText: boolean;
  translationQuality: 'fast' | 'balanced' | 'high';
  excludedContentTypes: string[];
}

export function LanguagePreferences() {
  const { toast } = useToast();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<LanguagePreference>({
    preferredLanguages: ['en'],
    autoTranslate: true,
    nativeLanguage: 'en',
    showOriginalText: false,
    translationQuality: 'balanced',
    excludedContentTypes: []
  });

  // Fetch current preferences
  const { data: currentPrefs, isLoading } = useQuery<LanguagePreference>({
    queryKey: ['/api/languages/preferences']
  });

  // Fetch supported languages
  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ['/api/languages/supported'],
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (currentPrefs) {
      setPreferences(currentPrefs);
      setSelectedLanguages(currentPrefs.preferredLanguages || []);
    }
  }, [currentPrefs]);

  // Save preferences mutation
  const savePreferences = useMutation({
    mutationFn: async (prefs: LanguagePreference) => {
      return apiRequest('/api/languages/preferences', 'POST', prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/languages/preferences'] });
      toast({
        title: "Preferences saved",
        description: "Your language preferences have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAddLanguage = (languageCode: string) => {
    if (!selectedLanguages.includes(languageCode)) {
      const updated = [...selectedLanguages, languageCode];
      setSelectedLanguages(updated);
      setPreferences({ ...preferences, preferredLanguages: updated });
    }
  };

  const handleRemoveLanguage = (languageCode: string) => {
    const updated = selectedLanguages.filter(l => l !== languageCode);
    setSelectedLanguages(updated);
    setPreferences({ ...preferences, preferredLanguages: updated });
  };

  const handleSave = () => {
    savePreferences.mutate(preferences);
  };

  const getLanguageName = (code: string) => {
    const lang = languages.find(l => l.code === code);
    return lang?.name || code.toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading preferences...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Preferences
          </CardTitle>
          <CardDescription>
            Configure how content is translated for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Native Language */}
          <div className="space-y-2">
            <Label htmlFor="native-language">Your Native Language</Label>
            <LanguageSelector
              value={preferences.nativeLanguage}
              onChange={(value) => setPreferences({ ...preferences, nativeLanguage: value })}
              placeholder="Select your native language"
            />
            <p className="text-xs text-muted-foreground">
              Content in this language won't be translated
            </p>
          </div>

          <Separator />

          {/* Preferred Languages */}
          <div className="space-y-2">
            <Label>Preferred Translation Languages</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedLanguages.map((code) => (
                <Badge 
                  key={code} 
                  variant="secondary"
                  className="px-3 py-1"
                  data-testid={`badge-language-${code}`}
                >
                  {getLanguageName(code)}
                  <button
                    onClick={() => handleRemoveLanguage(code)}
                    className="ml-2 hover:text-destructive"
                    data-testid={`button-remove-language-${code}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <LanguageSelector
              value=""
              onChange={handleAddLanguage}
              placeholder="Add a language"
            />
            <p className="text-xs text-muted-foreground">
              Content will be automatically translated to these languages
            </p>
          </div>

          <Separator />

          {/* Auto-translate Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-translate">Auto-translate Content</Label>
              <p className="text-xs text-muted-foreground">
                Automatically translate new content to your preferred languages
              </p>
            </div>
            <Switch
              id="auto-translate"
              checked={preferences.autoTranslate}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, autoTranslate: checked })
              }
              data-testid="switch-auto-translate"
            />
          </div>

          <Separator />

          {/* Show Original Text */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-original" className="flex items-center gap-2">
                {preferences.showOriginalText ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Show Original Text
              </Label>
              <p className="text-xs text-muted-foreground">
                Display original content alongside translations
              </p>
            </div>
            <Switch
              id="show-original"
              checked={preferences.showOriginalText}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, showOriginalText: checked })
              }
              data-testid="switch-show-original"
            />
          </div>

          <Separator />

          {/* Translation Quality */}
          <div className="space-y-3">
            <Label>Translation Quality</Label>
            <RadioGroup
              value={preferences.translationQuality}
              onValueChange={(value: 'fast' | 'balanced' | 'high') => 
                setPreferences({ ...preferences, translationQuality: value })
              }
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="fast" id="fast" data-testid="radio-quality-fast" />
                <Label htmlFor="fast" className="flex items-center gap-2 cursor-pointer">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <div>
                    <div className="font-medium">Fast</div>
                    <div className="text-xs text-muted-foreground">
                      Quick translations, may lack nuance
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="balanced" id="balanced" data-testid="radio-quality-balanced" />
                <Label htmlFor="balanced" className="flex items-center gap-2 cursor-pointer">
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium">Balanced</div>
                    <div className="text-xs text-muted-foreground">
                      Good balance of speed and quality
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="high" id="high" data-testid="radio-quality-high" />
                <Label htmlFor="high" className="flex items-center gap-2 cursor-pointer">
                  <Award className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="font-medium">High Quality</div>
                    <div className="text-xs text-muted-foreground">
                      Most accurate, context-aware translations
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (currentPrefs) {
                  setPreferences(currentPrefs);
                  setSelectedLanguages(currentPrefs.preferredLanguages || []);
                }
              }}
              disabled={savePreferences.isPending}
              data-testid="button-reset"
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={savePreferences.isPending}
              data-testid="button-save-preferences"
            >
              {savePreferences.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
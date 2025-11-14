import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TranslationToggleProps {
  className?: string;
}

export function TranslationToggle({ className }: TranslationToggleProps) {
  const { toast } = useToast();
  
  // Fetch current language preferences
  const { data: preferences = { autoTranslate: false, preferredLanguages: [] }, isLoading } = useQuery<{
    autoTranslate: boolean;
    preferredLanguages: string[];
  }>({
    queryKey: ['/api/languages/preferences']
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (autoTranslate: boolean) => {
      return apiRequest('/api/languages/preferences', 'POST', {
        ...preferences,
        autoTranslate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/languages/preferences'] });
      toast({
        title: "Translation settings updated",
        description: preferences.autoTranslate 
          ? "Auto-translation disabled" 
          : "Auto-translation enabled",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update translation settings",
        variant: "destructive"
      });
    }
  });

  const handleToggle = (checked: boolean) => {
    updatePreferences.mutate(checked);
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Globe className={preferences.autoTranslate ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
      <Switch
        id="auto-translate"
        checked={preferences.autoTranslate}
        onCheckedChange={handleToggle}
        disabled={updatePreferences.isPending}
        data-testid="toggle-auto-translate"
      />
      <Label 
        htmlFor="auto-translate" 
        className="cursor-pointer select-none"
      >
        Auto-translate
      </Label>
    </div>
  );
}
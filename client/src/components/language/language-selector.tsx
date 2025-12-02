import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  showNativeName?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function LanguageSelector({
  value,
  onChange,
  showNativeName = true,
  disabled = false,
  placeholder = "Select language",
}: LanguageSelectorProps) {
  // Fetch supported languages
  const { data: languages = [], isLoading } = useQuery<Language[]>({
    queryKey: ["/api/languages/supported"],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Get popular languages for quick access
  const popularLanguages = ["en", "es", "fr", "de", "zh", "ja"];
  const popular = languages.filter((lang) =>
    popularLanguages.includes(lang.code),
  );
  const others = languages.filter(
    (lang) => !popularLanguages.includes(lang.code),
  );

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full" data-testid="select-language">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {popular.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Popular Languages
            </div>
            {popular.map((lang) => (
              <SelectItem
                key={lang.code}
                value={lang.code}
                data-testid={`select-language-${lang.code}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{lang.name}</span>
                  {showNativeName && lang.nativeName !== lang.name && (
                    <span className="text-muted-foreground ml-2">
                      {lang.nativeName}
                    </span>
                  )}
                  {lang.code === "en" && (
                    <Badge variant="outline" className="ml-2">
                      Default
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </>
        )}

        {others.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Other Languages
            </div>
            {others.map((lang) => (
              <SelectItem
                key={lang.code}
                value={lang.code}
                data-testid={`select-language-${lang.code}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{lang.name}</span>
                  {showNativeName && lang.nativeName !== lang.name && (
                    <span className="text-muted-foreground ml-2">
                      {lang.nativeName}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}

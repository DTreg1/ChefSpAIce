/**
 * Language Selector Component
 *
 * Dropdown for selecting OCR language for better text extraction
 */

import { useState } from "react";
import { Globe, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Language {
  code: string;
  name: string;
  nativeName?: string;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  languages?: Language[];
  disabled?: boolean;
  className?: string;
}

const DEFAULT_LANGUAGES: Language[] = [
  { code: "eng", name: "English", nativeName: "English" },
  { code: "spa", name: "Spanish", nativeName: "Español" },
  { code: "fra", name: "French", nativeName: "Français" },
  { code: "deu", name: "German", nativeName: "Deutsch" },
  { code: "ita", name: "Italian", nativeName: "Italiano" },
  { code: "por", name: "Portuguese", nativeName: "Português" },
  { code: "rus", name: "Russian", nativeName: "Русский" },
  { code: "jpn", name: "Japanese", nativeName: "日本語" },
  { code: "chi_sim", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "chi_tra", name: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "kor", name: "Korean", nativeName: "한국어" },
  { code: "ara", name: "Arabic", nativeName: "العربية" },
  { code: "hin", name: "Hindi", nativeName: "हिन्दी" },
  { code: "nld", name: "Dutch", nativeName: "Nederlands" },
  { code: "pol", name: "Polish", nativeName: "Polski" },
];

const POPULAR_LANGUAGES = ["eng", "spa", "fra", "deu", "chi_sim", "jpn"];

export function LanguageSelector({
  value,
  onChange,
  languages = DEFAULT_LANGUAGES,
  disabled = false,
  className,
}: LanguageSelectorProps) {
  const selectedLanguage = languages.find((lang) => lang.code === value);
  const popularLanguages = languages.filter((lang) =>
    POPULAR_LANGUAGES.includes(lang.code),
  );
  const otherLanguages = languages.filter(
    (lang) => !POPULAR_LANGUAGES.includes(lang.code),
  );

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      data-testid="language-selector"
    >
      <SelectTrigger className={className} data-testid="language-trigger">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue placeholder="Select language">
            {selectedLanguage && (
              <span>
                {selectedLanguage.name}
                {selectedLanguage.nativeName &&
                  selectedLanguage.nativeName !== selectedLanguage.name && (
                    <span className="ml-1 text-muted-foreground">
                      ({selectedLanguage.nativeName})
                    </span>
                  )}
              </span>
            )}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent data-testid="language-content">
        {popularLanguages.length > 0 && (
          <SelectGroup>
            <SelectLabel>Popular Languages</SelectLabel>
            {popularLanguages.map((lang) => (
              <SelectItem
                key={lang.code}
                value={lang.code}
                data-testid={`language-${lang.code}`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{lang.name}</span>
                    {lang.nativeName && lang.nativeName !== lang.name && (
                      <span className="text-sm text-muted-foreground">
                        {lang.nativeName}
                      </span>
                    )}
                  </div>
                  {value === lang.code && (
                    <Check className="ml-2 h-4 w-4 text-primary" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {otherLanguages.length > 0 && (
          <SelectGroup>
            <SelectLabel>All Languages</SelectLabel>
            {otherLanguages.map((lang) => (
              <SelectItem
                key={lang.code}
                value={lang.code}
                data-testid={`language-${lang.code}`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{lang.name}</span>
                    {lang.nativeName && lang.nativeName !== lang.name && (
                      <span className="text-sm text-muted-foreground">
                        {lang.nativeName}
                      </span>
                    )}
                  </div>
                  {value === lang.code && (
                    <Check className="ml-2 h-4 w-4 text-primary" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

// Language Badge Component for displaying selected language
export function LanguageBadge({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const language = DEFAULT_LANGUAGES.find((lang) => lang.code === code);

  if (!language) return null;

  return (
    <Badge
      variant="secondary"
      className={className}
      data-testid={`badge-${code}`}
    >
      <Globe className="mr-1 h-3 w-3" />
      {language.nativeName || language.name}
    </Badge>
  );
}

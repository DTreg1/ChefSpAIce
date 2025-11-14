/**
 * TagInput Component
 * 
 * A sophisticated tag input component with auto-complete functionality.
 * Features:
 * - Auto-complete suggestions from existing tags
 * - Keyboard navigation support
 * - Tag creation on Enter/comma
 * - Visual feedback for suggestions
 * - Debounced search for performance
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TagSearchResult {
  id: string;
  name: string;
}

interface TagSearchResponse {
  tags: TagSearchResult[];
}

interface TagInputProps {
  value: Array<{ id: string; name: string }>;
  onChange: (tags: Array<{ id: string; name: string }>) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  onGenerateTags?: () => void;
  className?: string;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add tags...",
  maxTags = 10,
  disabled = false,
  onGenerateTags,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search query
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Fetch tag suggestions
  const { data: suggestions = { tags: [] } } = useQuery<TagSearchResponse>({
    queryKey: ["/api/ml/tags/search", searchQuery],
    enabled: searchQuery.length > 0 && !disabled,
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  // Handle tag addition
  const addTag = useCallback(
    (tag: { id?: string; name: string }) => {
      if (value.length >= maxTags) return;
      
      const tagName = tag.name.toLowerCase().trim();
      if (!tagName) return;
      
      // Check for duplicates
      if (value.some((t) => t.name === tagName)) return;
      
      const newTag = {
        id: tag.id || `new-${Date.now()}`,
        name: tagName,
      };
      
      onChange([...value, newTag]);
      setInputValue("");
      setIsOpen(false);
    },
    [value, onChange, maxTags]
  );

  // Handle tag removal
  const removeTag = useCallback(
    (tagToRemove: { id: string; name: string }) => {
      onChange(value.filter((tag) => tag.id !== tagToRemove.id));
    },
    [value, onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case ",":
        e.preventDefault();
        if (suggestions.tags && suggestions.tags.length > 0 && selectedIndex >= 0) {
          addTag(suggestions.tags[selectedIndex]);
        } else if (inputValue.trim()) {
          addTag({ name: inputValue });
        }
        break;
        
      case "Backspace":
        if (!inputValue && value.length > 0) {
          removeTag(value[value.length - 1]);
        }
        break;
        
      case "ArrowDown":
        e.preventDefault();
        if (suggestions.tags) {
          setSelectedIndex((prev) =>
            prev < suggestions.tags.length - 1 ? prev + 1 : 0
          );
        }
        break;
        
      case "ArrowUp":
        e.preventDefault();
        if (suggestions.tags) {
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.tags.length - 1
          );
        }
        break;
        
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="hover-elevate active-elevate-2"
            data-testid={`tag-${tag.name}`}
          >
            <Tag className="mr-1 h-3 w-3" />
            {tag.name}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive"
                data-testid={`remove-tag-${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      
      {!disabled && value.length < maxTags && (
        <Popover open={isOpen && inputValue.length > 0}>
          <PopoverTrigger asChild>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => inputValue && setIsOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1"
                data-testid="tag-input"
              />
              {onGenerateTags && (
                <button
                  type="button"
                  onClick={onGenerateTags}
                  className="px-3 py-2 text-sm font-medium text-primary hover-elevate active-elevate-2 rounded-md border"
                  data-testid="button-generate-tags"
                >
                  Generate Tags
                </button>
              )}
            </div>
          </PopoverTrigger>
          
          {suggestions.tags && suggestions.tags.length > 0 && (
            <PopoverContent 
              className="p-0 w-[300px]"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command>
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    {suggestions.tags.map((tag: any, index: number) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => addTag(tag)}
                        className={cn(
                          "cursor-pointer",
                          index === selectedIndex && "bg-accent"
                        )}
                        data-testid={`tag-suggestion-${tag.name}`}
                      >
                        <Tag className="mr-2 h-4 w-4" />
                        {tag.name}
                        {tag.usageCount > 0 && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {tag.usageCount}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          )}
        </Popover>
      )}
      
      {value.length >= maxTags && (
        <p className="text-sm text-muted-foreground">
          Maximum of {maxTags} tags reached
        </p>
      )}
    </div>
  );
}
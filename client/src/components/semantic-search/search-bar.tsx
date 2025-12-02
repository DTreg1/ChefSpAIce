import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  debounceDelay?: number;
  showButton?: boolean;
  isLoading?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = "Search by meaning (e.g., 'how to login' finds 'authentication', 'sign in', etc.)",
  className,
  debounceDelay = 500,
  showButton = false,
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [query, debounceDelay]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        setDebouncedQuery(query); // Immediately trigger search on form submit
        onSearch(query);
      }
    },
    [query, onSearch],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              isLoading && "animate-pulse",
            )}
            data-testid="icon-search"
          />
          <Input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pl-9 pr-4"
            autoComplete="off"
            autoFocus
            disabled={isLoading}
            data-testid="input-semantic-search"
          />
        </div>
        {showButton && (
          <Button
            type="submit"
            disabled={!query.trim() || isLoading}
            data-testid="button-search-submit"
          >
            {isLoading ? "Searching..." : "Search"}
          </Button>
        )}
      </div>
    </form>
  );
}

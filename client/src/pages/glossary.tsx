import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Search, ChefHat, Utensils, Info, BookOpen } from "lucide-react";
import type { CookingTerm } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Glossary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch cooking terms
  const { data: cookingTerms = [], isLoading } = useQuery<CookingTerm[]>({
    queryKey: ["/api/cooking-terms"],
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    cookingTerms.forEach((term) => {
      if (term.category) cats.add(term.category);
    });
    return Array.from(cats).sort();
  }, [cookingTerms]);

  // Filter terms based on search and category
  const filteredTerms = useMemo(() => {
    let filtered = cookingTerms;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((term) => term.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (term) =>
          term.term.toLowerCase().includes(query) ||
          (term.shortDefinition &&
            term.shortDefinition.toLowerCase().includes(query)) ||
          (term.longDefinition &&
            term.longDefinition.toLowerCase().includes(query)) ||
          (term.relatedTerms &&
            term.relatedTerms.some((st: string) =>
              st.toLowerCase().includes(query),
            )),
      );
    }

    // Sort alphabetically
    return filtered.sort((a, b) => a.term.localeCompare(b.term));
  }, [cookingTerms, searchQuery, selectedCategory]);

  // Group terms by first letter
  const groupedTerms = useMemo(() => {
    const groups: { [key: string]: CookingTerm[] } = {};
    filteredTerms.forEach((term) => {
      const firstLetter = term.term[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(term);
    });
    return groups;
  }, [filteredTerms]);

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "technique":
        return <ChefHat className="w-4 h-4" />;
      case "ingredient":
        return <Utensils className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case "technique":
        return "bg-primary/10 text-primary hover-elevate";
      case "ingredient":
        return "bg-accent/10 text-accent hover-elevate";
      case "tool":
        return "bg-secondary/10 text-secondary hover-elevate";
      default:
        return "bg-muted hover-elevate";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Cooking Terms Glossary</h1>
        </div>
        <p className="text-muted-foreground">
          Explore and learn about common cooking techniques, ingredients, and
          culinary terms
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              data-testid="input-search-terms"
              placeholder="Search cooking terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-4 h-auto">
              <TabsTrigger value="all" data-testid="tab-all">
                All Terms ({cookingTerms.length})
              </TabsTrigger>
              {categories.map((category) => {
                const count = cookingTerms.filter(
                  (t) => t.category === category,
                ).length;
                return (
                  <TabsTrigger
                    key={category}
                    value={category}
                    data-testid={`tab-${category.toLowerCase()}`}
                  >
                    <span className="flex items-center gap-1">
                      {getCategoryIcon(category)}
                      {category} ({count})
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {searchQuery && (
            <div className="text-sm text-muted-foreground">
              Found {filteredTerms.length} term
              {filteredTerms.length !== 1 ? "s" : ""} matching "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filteredTerms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery
                ? `No terms found matching "${searchQuery}"`
                : "No cooking terms available"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedTerms).map(([letter, terms]) => (
              <div key={letter}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xl font-semibold">{letter}</h2>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {terms.map((term) => (
                    <Card
                      key={term.id}
                      className="hover-elevate active-elevate-2"
                      data-testid={`term-card-${term.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {term.term}
                            {term.category && (
                              <Badge
                                variant="secondary"
                                className={`${getCategoryColor(term.category)} ml-2`}
                              >
                                <span className="flex items-center gap-1">
                                  {getCategoryIcon(term.category)}
                                  {term.category}
                                </span>
                              </Badge>
                            )}
                          </CardTitle>
                        </div>
                        {term.relatedTerms && term.relatedTerms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs text-muted-foreground">
                              Related terms:
                            </span>
                            {term.relatedTerms.map(
                              (alt: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {alt}
                                </Badge>
                              ),
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base">
                          {term.longDefinition || term.shortDefinition || ""}
                        </CardDescription>
                        {term.example && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-1">Example:</p>
                            <p className="text-sm text-muted-foreground italic">
                              "{term.example}"
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Stats Footer */}
      {!isLoading && (
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-around text-sm">
              <div className="text-center">
                <p className="font-semibold text-lg">{cookingTerms.length}</p>
                <p className="text-muted-foreground">Total Terms</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="font-semibold text-lg">{categories.length}</p>
                <p className="text-muted-foreground">Categories</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="font-semibold text-lg">
                  {Object.keys(groupedTerms).length}
                </p>
                <p className="text-muted-foreground">Letters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

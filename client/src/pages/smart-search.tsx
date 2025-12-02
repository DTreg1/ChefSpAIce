import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Sparkles,
  Tag,
  FolderOpen,
  Loader2,
  Brain,
  Utensils,
  Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface SearchResult {
  results: Array<{
    contentId: string;
    contentType: "recipe" | "inventory";
    content: any;
    similarity: number;
    tags?: string[];
    category?: string;
  }>;
}

interface RelatedContent {
  contentId: string;
  contentType: "recipe" | "inventory";
  content: any;
  score: number;
}

export default function SmartSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );
  const [selectedContentType, setSelectedContentType] = useState<
    "recipe" | "inventory" | null
  >(null);
  const { toast } = useToast();

  // Semantic search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("/api/ml/search/semantic", "POST", {
        query,
        contentType: "all",
      });
      return response;
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to perform search",
        variant: "destructive",
      });
    },
  });

  // Natural language query mutation
  const nlQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("/api/ml/natural-query", "POST", {
        query,
      });
      return response;
    },
    onError: (error: any) => {
      toast({
        title: "Query Failed",
        description:
          error.message || "Failed to process natural language query",
        variant: "destructive",
      });
    },
  });

  // Related content query
  const { data: relatedContent, isLoading: loadingRelated } = useQuery<
    RelatedContent[]
  >({
    queryKey: ["/api/ml/related", selectedContentId, selectedContentType],
    enabled: !!selectedContentId && !!selectedContentType,
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/ml/related?contentId=${selectedContentId}&contentType=${selectedContentType}`,
      );
      return response.json();
    },
  });

  // Update embeddings mutation
  const updateEmbeddingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ml/embeddings/update", "POST");
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Embeddings Updated",
        description: "Your content embeddings have been refreshed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ml"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update embeddings",
        variant: "destructive",
      });
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await searchMutation.mutateAsync(searchQuery);
  };

  const handleNaturalQuery = async () => {
    if (!searchQuery.trim()) return;
    await nlQueryMutation.mutateAsync(searchQuery);
  };

  const renderContentCard = (item: any) => {
    const isRecipe = item.contentType === "recipe";
    const content = item.content;

    return (
      <Card
        key={item.contentId}
        className="hover-elevate cursor-pointer"
        onClick={() => {
          setSelectedContentId(item.contentId);
          setSelectedContentType(item.contentType);
        }}
        data-testid={`card-search-result-${item.contentId}`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isRecipe ? (
                <Utensils className="h-4 w-4" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              {content?.name || content?.title || "Unnamed"}
            </CardTitle>
            {item.similarity !== undefined && (
              <Badge
                variant="secondary"
                data-testid={`badge-similarity-${item.contentId}`}
              >
                {Math.round(item.similarity * 100)}% match
              </Badge>
            )}
            {item.score !== undefined && (
              <Badge
                variant="secondary"
                data-testid={`badge-score-${item.contentId}`}
              >
                Score: {item.score.toFixed(2)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {content?.description ||
              content?.notes ||
              "No description available"}
          </CardDescription>
          <div className="mt-3 flex flex-wrap gap-1">
            {item.category && (
              <Badge
                variant="outline"
                className="text-xs"
                data-testid={`badge-category-${item.contentId}`}
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                {item.category}
              </Badge>
            )}
            {item.tags?.map((tag: string) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs"
                data-testid={`badge-tag-${tag}`}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {!isRecipe && content?.expirationDate && (
              <Badge
                variant="outline"
                className="text-xs"
                data-testid={`badge-expiry-${item.contentId}`}
              >
                Expires: {new Date(content.expirationDate).toLocaleDateString()}
              </Badge>
            )}
            {isRecipe && content?.prepTime && (
              <Badge
                variant="outline"
                className="text-xs"
                data-testid={`badge-prep-${item.contentId}`}
              >
                {content.prepTime} min prep
              </Badge>
            )}
          </div>
          {isRecipe && content?.id && (
            <Link href={`/recipes/${content.id}`}>
              <Button
                variant="ghost"
                className="mt-2 p-0 h-auto"
                data-testid={`button-view-recipe-${content.id}`}
              >
                View Recipe →
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-8 w-8" />
          Smart Search
        </h1>
        <p className="text-muted-foreground">
          Use AI-powered semantic search to find recipes and inventory items
        </p>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search for recipes, ingredients, or ask questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
            data-testid="input-search-query"
          />
          <Button
            onClick={handleSearch}
            disabled={searchMutation.isPending || !searchQuery.trim()}
            data-testid="button-semantic-search"
          >
            {searchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Semantic Search
          </Button>
          <Button
            onClick={handleNaturalQuery}
            disabled={nlQueryMutation.isPending || !searchQuery.trim()}
            variant="secondary"
            data-testid="button-natural-query"
          >
            {nlQueryMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Natural Query
          </Button>
          <Button
            onClick={() => updateEmbeddingsMutation.mutate()}
            disabled={updateEmbeddingsMutation.isPending}
            variant="outline"
            data-testid="button-update-embeddings"
          >
            {updateEmbeddingsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Update Index
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Try: "healthy dinner recipes", "what expires soon?", "ingredients for
          pasta", or "show me vegetarian options"
        </p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" data-testid="tab-search">
            Search Results
          </TabsTrigger>
          <TabsTrigger value="natural" data-testid="tab-natural">
            Natural Query Results
          </TabsTrigger>
          <TabsTrigger
            value="related"
            disabled={!selectedContentId}
            data-testid="tab-related"
          >
            Related Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4">
          {searchMutation.data && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Found {searchMutation.data.results?.length || 0} results
              </p>
              {searchMutation.data.results?.map((item: any) =>
                renderContentCard(item),
              )}
            </div>
          )}
          {searchMutation.data?.results?.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No results found. Try a different search query.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="natural" className="mt-4">
          {nlQueryMutation.data && (
            <div className="space-y-4">
              {nlQueryMutation.data.query && (
                <Card>
                  <CardHeader>
                    <CardTitle>Interpreted Query</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-sm bg-muted p-2 rounded block">
                      {nlQueryMutation.data.query}
                    </code>
                  </CardContent>
                </Card>
              )}
              {nlQueryMutation.data.results?.map((item: any) =>
                renderContentCard({
                  ...item,
                  contentType: item.type || "recipe",
                  content: item,
                  contentId: item.id,
                }),
              )}
              {nlQueryMutation.data.results?.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No results match your query.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="related" className="mt-4">
          {loadingRelated && (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {relatedContent && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Found {relatedContent.length} related items
              </p>
              {relatedContent.map((item) => renderContentCard(item))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  SearchBar, 
  SearchResults, 
  SearchHighlightWithContext,
  type SearchResult 
} from "@/components/SemanticSearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, Search, Sparkles } from "lucide-react";

// Demo content for testing semantic search
const DEMO_CONTENT = [
  {
    id: "demo-1",
    type: "recipe" as const,
    title: "User Authentication Guide",
    content: "Learn how to implement secure login and sign in functionality. This guide covers authentication best practices, password hashing, session management, and how users can access their accounts safely."
  },
  {
    id: "demo-2", 
    type: "chat" as const,
    title: "Password Reset Tutorial",
    content: "Step-by-step instructions for resetting forgotten passwords. Users can regain access to their accounts through email verification and secure password reset links."
  },
  {
    id: "demo-3",
    type: "inventory" as const,
    title: "Account Creation Process",
    content: "Register new users with our streamlined sign up flow. Create accounts with email verification, profile setup, and initial preferences configuration."
  },
  {
    id: "demo-4",
    type: "meal_plan" as const,
    title: "Security Best Practices",
    content: "Protect user credentials with two-factor authentication, secure sessions, and encrypted data storage. Prevent unauthorized access and maintain account security."
  },
  {
    id: "demo-5",
    type: "custom" as const,
    title: "OAuth Integration",
    content: "Enable users to authenticate using their Google, GitHub, or social media accounts. Simplify the login process with single sign-on capabilities."
  }
];

export default function SemanticSearchDemo() {
  const { toast } = useToast();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLogId, setSearchLogId] = useState<string>("");
  const [hasGeneratedEmbeddings, setHasGeneratedEmbeddings] = useState(false);

  // Generate embeddings for demo content
  const generateEmbeddingsMutation = useMutation({
    mutationFn: async (content: typeof DEMO_CONTENT[0]) => {
      const response = await apiRequest("POST", "/api/ml/embeddings/generate", {
        contentId: content.id,
        contentType: content.type,
        content: {
          name: content.title,
          title: content.title,
          content: content.content,
          text: content.content,
        },
        metadata: {
          title: content.title,
          isDemo: true,
        }
      });
      return response.json();
    },
    onSuccess: (_, content) => {
      console.log(`Generated embedding for: ${content.title}`);
    },
    onError: (error) => {
      console.error("Failed to generate embedding:", error);
      toast({
        title: "Error",
        description: "Failed to generate embeddings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Semantic search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/ml/search/semantic", {
        query,
        contentType: "all",
        limit: 10,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.results && Array.isArray(data.results)) {
        // Transform results to match SearchResult interface
        const transformedResults: SearchResult[] = data.results.map((r: any) => ({
          id: r.content?.id || r.contentId,
          type: r.contentType || 'custom',
          title: r.content?.name || r.content?.title || 'Untitled',
          description: r.metadata?.description,
          content: r.content?.content || r.content?.text || r.contentText || '',
          score: r.similarity || r.score || 0,
          metadata: r.metadata,
        }));
        setSearchResults(transformedResults);
        
        // Store search log ID if provided
        if (data.searchLogId) {
          setSearchLogId(data.searchLogId);
        }
      }
    },
    onError: (error) => {
      console.error("Search failed:", error);
      toast({
        title: "Search Error",
        description: "Failed to perform semantic search. Please try again.",
        variant: "destructive",
      });
      setSearchResults([]);
    },
  });

  // Feedback mutation for tracking clicks
  const feedbackMutation = useMutation({
    mutationFn: async (data: {
      searchLogId: string;
      clickedResultId: string;
      clickedResultType: string;
      clickPosition: number;
      timeToClick: number;
    }) => {
      const response = await apiRequest("POST", "/api/ml/search/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      console.log("Search feedback recorded");
    },
    onError: (error) => {
      console.error("Failed to record feedback:", error);
    },
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchMutation.mutate(query);
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleResultClick = useCallback((result: SearchResult & { 
    searchLogId?: string;
    clickPosition?: number;
    timeToClick?: number;
  }, position: number) => {
    // Track click feedback
    if (searchLogId && result.clickPosition && result.timeToClick !== undefined) {
      feedbackMutation.mutate({
        searchLogId,
        clickedResultId: result.id,
        clickedResultType: result.type,
        clickPosition: result.clickPosition,
        timeToClick: result.timeToClick,
      });
    }

    toast({
      title: "Result Clicked",
      description: `You clicked: ${result.title} (Position ${position}, Score: ${(result.score * 100).toFixed(0)}%)`,
    });
  }, [searchLogId]);

  const generateDemoEmbeddings = async () => {
    toast({
      title: "Generating Embeddings",
      description: "Creating vector embeddings for demo content...",
    });

    for (const content of DEMO_CONTENT) {
      await generateEmbeddingsMutation.mutateAsync(content);
    }

    setHasGeneratedEmbeddings(true);
    toast({
      title: "Success",
      description: "Demo embeddings generated! You can now search.",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Semantic Search Demo
          </CardTitle>
          <CardDescription>
            Experience intelligent search that understands meaning, not just keywords.
            Try searching for "how to login" and see how it finds results about authentication, sign in, and account access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasGeneratedEmbeddings ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                First, let's generate embeddings for our demo content. This converts text into numerical vectors that capture semantic meaning.
              </p>
              <Button
                onClick={generateDemoEmbeddings}
                disabled={generateEmbeddingsMutation.isPending}
                data-testid="button-generate-embeddings"
              >
                {generateEmbeddingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Embeddings...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Generate Demo Embeddings
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Badge variant="outline" className="mb-2">
                <Database className="mr-1 h-3 w-3" />
                Embeddings Ready
              </Badge>
              <SearchBar
                onSearch={handleSearch}
                placeholder="Try: 'how to login' or 'forgot password' or 'create account'"
                isLoading={searchMutation.isPending}
                showButton
              />
            </div>
          )}
        </CardContent>
      </Card>

      {(searchResults.length > 0 || searchMutation.isPending) && (
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">
              Search Results ({searchResults.length})
            </TabsTrigger>
            <TabsTrigger value="highlighted">
              Highlighted Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            <SearchResults
              results={searchResults}
              isLoading={searchMutation.isPending}
              error={searchMutation.error?.message}
              onResultClick={handleResultClick}
              searchLogId={searchLogId}
            />
          </TabsContent>

          <TabsContent value="highlighted" className="space-y-4">
            {searchResults.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Context Highlighting</CardTitle>
                  <CardDescription>
                    Relevant sections are highlighted even when exact words don't match
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {searchResults.slice(0, 3).map((result, i) => (
                    <div key={result.id} className="space-y-2 pb-4 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{result.title}</h4>
                        <Badge variant="secondary">
                          {(result.score * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                      <SearchHighlightWithContext
                        text={result.content}
                        query={searchQuery}
                        className="text-sm"
                        contextLength={100}
                        maxContexts={2}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Search to see highlighted context
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {searchQuery && !searchMutation.isPending && searchResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No results found for "{searchQuery}". Try different terms or generate embeddings first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
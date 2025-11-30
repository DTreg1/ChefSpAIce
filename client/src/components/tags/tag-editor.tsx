/**
 * TagEditor Component
 * 
 * Comprehensive tag management interface for content.
 * Features:
 * - View existing tags with relevance scores
 * - Add/remove tags manually
 * - Generate AI suggestions
 * - View related tags
 * - Batch operations
 */

import { useState } from "react";
import { Tag as TagIcon, Plus, Trash2, Sparkles, Link, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { useToast } from "@/hooks/use-toast";
import { TagInput } from "./tag-input";
import { TagCloud } from "./tag-cloud";
import { TagSuggestions } from "./tag-suggestions";

interface ContentTagData {
  id: string;
  name: string;
  relevanceScore?: number;
}

interface ContentTagsResponse {
  tags: ContentTagData[];
}

interface TagEditorProps {
  contentId: string;
  contentType: string;
  content?: any;
  className?: string;
}

export function TagEditor({
  contentId,
  contentType,
  content,
  className,
}: TagEditorProps) {
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<Array<{ id: string; name: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<any[]>([]);

  // Fetch existing tags
  const { data: existingTags = { tags: [] }, isLoading: tagsLoading } = useQuery<ContentTagsResponse>({
    queryKey: [API_ENDPOINTS.ml.content.tags(contentId), contentType],
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  // Generate tags mutation
  const generateTagsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(API_ENDPOINTS.ml.tags.generate, "POST", {
        contentId,
        contentType,
        content,
        maxTags: 8,
      });
    },
    onSuccess: (data) => {
      setGeneratedSuggestions(data.tags);
      setShowSuggestions(true);
      toast({
        title: "Tags generated",
        description: `Generated ${data.tags.length} tag suggestions using AI.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate tags. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add tags mutation
  const addTagsMutation = useMutation({
    mutationFn: async (tags: Array<{ id: string; name: string }>) => {
      const promises = tags.map(tag => 
        apiRequest(API_ENDPOINTS.ml.tags.assign, "POST", {
          contentId,
          contentType,
          tagId: tag.id,
          relevanceScore: 1.0,
          isManual: true,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ml.content.tags(contentId)] });
      setSelectedTags([]);
      toast({
        title: "Tags added",
        description: "Tags have been successfully added to the content.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add tags. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return apiRequest(API_ENDPOINTS.ml.content.removeTag(contentId, tagId), "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ml.content.tags(contentId)] });
      toast({
        title: "Tag removed",
        description: "Tag has been successfully removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove tag. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get related tags for a specific tag
  const getRelatedTags = async (tagId: string) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.ml.tags.related(tagId), "GET");
      return response.tags;
    } catch (error) {
      console.error("Error fetching related tags:", error);
      return [];
    }
  };

  const handleAddTags = () => {
    if (selectedTags.length > 0) {
      addTagsMutation.mutate(selectedTags);
    }
  };

  const handleTagCloudClick = (tag: any) => {
    const exists = selectedTags.some(t => t.id === tag.id);
    if (exists) {
      setSelectedTags(prev => prev.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags(prev => [...prev, { id: tag.id, name: tag.name }]);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current" data-testid="tab-current-tags">
            Current Tags
          </TabsTrigger>
          <TabsTrigger value="add" data-testid="tab-add-tags">
            Add Tags
          </TabsTrigger>
          <TabsTrigger value="suggestions" data-testid="tab-suggestions">
            AI Suggestions
          </TabsTrigger>
        </TabsList>
        
        {/* Current Tags Tab */}
        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Tags</CardTitle>
              <CardDescription>
                Manage tags assigned to this content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : existingTags?.tags && existingTags.tags.length > 0 ? (
                <div className="space-y-4">
                  {existingTags.tags.map((tagItem: any) => (
                    <div
                      key={tagItem.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`existing-tag-${tagItem.tag.name}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          <TagIcon className="mr-1 h-3 w-3" />
                          {tagItem.tag.name}
                        </Badge>
                        
                        <span className="text-sm text-muted-foreground">
                          Relevance: {Math.round((tagItem.relevanceScore || 0) * 100)}%
                        </span>
                        
                        {tagItem.isManual && (
                          <Badge variant="outline" className="text-xs">
                            Manual
                          </Badge>
                        )}
                        
                        {/* Related Tags Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`related-tags-${tagItem.tag.name}`}
                            >
                              <Link className="h-3 w-3 mr-1" />
                              Related
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Related to "{tagItem.tag.name}"</DialogTitle>
                              <DialogDescription>
                                Tags commonly used together
                              </DialogDescription>
                            </DialogHeader>
                            <RelatedTagsList tagId={tagItem.tagId} />
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTagMutation.mutate(tagItem.tagId)}
                        disabled={removeTagMutation.isPending}
                        data-testid={`remove-tag-${tagItem.tag.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tags assigned yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Add Tags Tab */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Tags</CardTitle>
              <CardDescription>
                Search and add tags to this content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TagInput
                value={selectedTags}
                onChange={setSelectedTags}
                placeholder="Search or create tags..."
                maxTags={10}
              />
              
              <TagCloud
                onTagClick={handleTagCloudClick}
                selectedTags={selectedTags.map(t => t.id)}
                limit={15}
              />
              
              {selectedTags.length > 0 && (
                <Button
                  onClick={handleAddTags}
                  disabled={addTagsMutation.isPending}
                  className="w-full"
                  data-testid="button-add-tags"
                >
                  {addTagsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Tags...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add {selectedTags.length} Tag{selectedTags.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          {!showSuggestions ? (
            <Card>
              <CardHeader>
                <CardTitle>AI Tag Generation</CardTitle>
                <CardDescription>
                  Use AI to analyze content and generate relevant tags
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => generateTagsMutation.mutate()}
                  disabled={generateTagsMutation.isPending || !content}
                  className="w-full"
                  data-testid="button-generate-ai-tags"
                >
                  {generateTagsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Tags
                    </>
                  )}
                </Button>
                {!content && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Content data is required for AI tag generation
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <TagSuggestions
              contentId={contentId}
              contentType={contentType}
              suggestions={generatedSuggestions}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ml.content.tags(contentId)] });
                setShowSuggestions(false);
                setGeneratedSuggestions([]);
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component for displaying related tags
function RelatedTagsList({ tagId }: { tagId: string }) {
  const { data: relatedTags = { tags: [] }, isLoading } = useQuery<ContentTagsResponse>({
    queryKey: [API_ENDPOINTS.ml.tags.related(tagId)],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!relatedTags?.tags || relatedTags.tags.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No related tags found
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-4">
      {relatedTags.tags.map((tag: any) => (
        <Badge key={tag.id} variant="outline">
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
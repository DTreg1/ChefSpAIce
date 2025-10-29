import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit2, Trash2, Search, ChefHat, Utensils, Sparkles, Clock, Info } from "lucide-react";
import type { CookingTerm, InsertCookingTerm } from "@shared/schema";

export default function CookingTermsAdmin() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<CookingTerm | null>(null);
  const [formData, setFormData] = useState<Partial<InsertCookingTerm>>({
    term: "",
    category: "cooking_methods",
    shortDefinition: "",
    longDefinition: "",
    difficulty: "beginner",
    timeEstimate: "",
    tools: [],
    tips: [],
    relatedTerms: [],
    searchTerms: [],
  });

  // Fetch cooking terms
  const { data: cookingTerms = [], isLoading } = useQuery<CookingTerm[]>({
    queryKey: ["/api/cooking-terms"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: InsertCookingTerm) => 
      apiRequest("POST", "/api/cooking-terms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cooking-terms"] });
      toast({
        title: "Success",
        description: "Cooking term created successfully",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create cooking term",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertCookingTerm> }) =>
      apiRequest("PUT", `/api/cooking-terms/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cooking-terms"] });
      toast({
        title: "Success",
        description: "Cooking term updated successfully",
      });
      setEditingTerm(null);
      resetForm();
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update cooking term",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/cooking-terms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cooking-terms"] });
      toast({
        title: "Success",
        description: "Cooking term deleted successfully",
      });
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete cooking term",
        variant: "destructive",
      });
    },
  });

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cooking-terms/seed");
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cooking-terms"] });
      toast({
        title: "Success",
        description: `Seeded ${data.count} cooking terms successfully`,
      });
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Info",
        description: "Cooking terms already exist in the database",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      term: "",
      category: "cooking_methods",
      shortDefinition: "",
      longDefinition: "",
      difficulty: "beginner",
      timeEstimate: "",
      tools: [],
      tips: [],
      relatedTerms: [],
      searchTerms: [],
    });
  };

  const handleSubmit = () => {
    if (!formData.term || !formData.shortDefinition || !formData.longDefinition || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingTerm) {
      updateMutation.mutate({ id: editingTerm.id, data: formData as InsertCookingTerm });
    } else {
      createMutation.mutate(formData as InsertCookingTerm);
    }
  };

  const handleEdit = (term: CookingTerm) => {
    setEditingTerm(term);
    setFormData({
      term: term.term,
      category: term.category,
      shortDefinition: term.shortDefinition,
      longDefinition: term.longDefinition,
      difficulty: term.difficulty || "beginner",
      timeEstimate: term.timeEstimate || "",
      tools: term.tools || [],
      tips: term.tips || [],
      relatedTerms: term.relatedTerms || [],
      searchTerms: term.searchTerms || [],
    });
  };

  const handleArrayInput = (field: keyof InsertCookingTerm, value: string) => {
    const items = value.split(",").map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  // Filter terms based on search and category
  const filteredTerms = cookingTerms.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         term.shortDefinition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "knife_skills":
        return <Sparkles className="w-4 h-4" />;
      case "cooking_methods":
        return <ChefHat className="w-4 h-4" />;
      case "prep_techniques":
        return <Utensils className="w-4 h-4" />;
      default:
        return <ChefHat className="w-4 h-4" />;
    }
  };

  const formatCategory = (category: string): string => {
    return category
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card className="glass-morph border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-serif">Cooking Terms Management</CardTitle>
              <CardDescription className="mt-2">
                Manage the cooking terms knowledge bank for recipe instructions
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add New Term
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search cooking terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-terms"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="knife_skills">Knife Skills</SelectItem>
                <SelectItem value="cooking_methods">Cooking Methods</SelectItem>
                <SelectItem value="prep_techniques">Prep Techniques</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Terms List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading cooking terms...</div>
          ) : filteredTerms.length === 0 ? (
            <div className="text-center py-8">
              {searchQuery || selectedCategory !== "all" 
                ? <div className="text-muted-foreground">No cooking terms found matching your criteria</div>
                : (
                  <div className="space-y-4">
                    <div className="text-muted-foreground">No cooking terms yet. Add your first one!</div>
                    {cookingTerms.length === 0 && (
                      <div className="p-4 bg-secondary/20 rounded-lg border border-secondary max-w-md mx-auto">
                        <p className="text-sm text-muted-foreground mb-3">
                          Get started quickly by seeding the database with 22 common cooking terms
                        </p>
                        <Button
                          onClick={() => seedMutation.mutate()}
                          disabled={seedMutation.isPending}
                          data-testid="button-seed-terms"
                          className="gap-2"
                        >
                          {seedMutation.isPending ? (
                            <>Loading...</>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Seed Initial Terms
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTerms.map((term) => (
                <Card key={term.id} className="hover-elevate active-elevate-2">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(term.category)}
                          <h3 className="font-semibold text-lg">{term.term}</h3>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatCategory(term.category)}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(term)}
                          data-testid={`button-edit-${term.term}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(term.id)}
                          data-testid={`button-delete-${term.term}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {term.shortDefinition}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      {term.difficulty && (
                        <Badge variant="secondary" className="text-xs">
                          {term.difficulty}
                        </Badge>
                      )}
                      {term.timeEstimate && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {term.timeEstimate}
                        </Badge>
                      )}
                      {term.tools && term.tools.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Utensils className="w-3 h-3 mr-1" />
                          {term.tools.length} tools
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingTerm} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingTerm(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTerm ? "Edit Cooking Term" : "Add New Cooking Term"}</DialogTitle>
            <DialogDescription>
              {editingTerm ? "Update the cooking term details below" : "Add a new cooking term to the knowledge bank"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="term">Term *</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                  placeholder="e.g., julienne, sauté, blanch"
                  data-testid="input-term"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="category" data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knife_skills">Knife Skills</SelectItem>
                    <SelectItem value="cooking_methods">Cooking Methods</SelectItem>
                    <SelectItem value="prep_techniques">Prep Techniques</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDef">Short Definition * (for tooltip)</Label>
                <Textarea
                  id="shortDef"
                  value={formData.shortDefinition}
                  onChange={(e) => setFormData(prev => ({ ...prev, shortDefinition: e.target.value }))}
                  placeholder="Brief 1-2 sentence description"
                  rows={2}
                  data-testid="textarea-short-definition"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longDef">Long Definition * (for popover)</Label>
                <Textarea
                  id="longDef"
                  value={formData.longDefinition}
                  onChange={(e) => setFormData(prev => ({ ...prev, longDefinition: e.target.value }))}
                  placeholder="Detailed step-by-step instructions"
                  rows={6}
                  data-testid="textarea-long-definition"
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select 
                  value={formData.difficulty || "beginner"} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger id="difficulty" data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeEstimate">Time Estimate</Label>
                <Input
                  id="timeEstimate"
                  value={formData.timeEstimate || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeEstimate: e.target.value }))}
                  placeholder="e.g., 2-3 minutes"
                  data-testid="input-time-estimate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tools">Tools Needed (comma-separated)</Label>
                <Textarea
                  id="tools"
                  value={formData.tools?.join(", ") || ""}
                  onChange={(e) => handleArrayInput("tools", e.target.value)}
                  placeholder="e.g., sharp chef's knife, cutting board, bowl"
                  rows={2}
                  data-testid="textarea-tools"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tips">Pro Tips (comma-separated)</Label>
                <Textarea
                  id="tips"
                  value={formData.tips?.join(", ") || ""}
                  onChange={(e) => handleArrayInput("tips", e.target.value)}
                  placeholder="e.g., Keep your knife sharp, Use a rocking motion"
                  rows={3}
                  data-testid="textarea-tips"
                />
              </div>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="relatedTerms">Related Terms (comma-separated)</Label>
                <Textarea
                  id="relatedTerms"
                  value={formData.relatedTerms?.join(", ") || ""}
                  onChange={(e) => handleArrayInput("relatedTerms", e.target.value)}
                  placeholder="e.g., dice, mince, chop"
                  rows={2}
                  data-testid="textarea-related-terms"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchTerms">Search Terms / Alternative Names (comma-separated)</Label>
                <Textarea
                  id="searchTerms"
                  value={formData.searchTerms?.join(", ") || ""}
                  onChange={(e) => handleArrayInput("searchTerms", e.target.value)}
                  placeholder="e.g., julienne cut, matchstick cut"
                  rows={2}
                  data-testid="textarea-search-terms"
                />
                <p className="text-xs text-muted-foreground">
                  These alternative names will also trigger the term highlighting
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              setEditingTerm(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} data-testid="button-submit-term">
              {editingTerm ? "Update Term" : "Add Term"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
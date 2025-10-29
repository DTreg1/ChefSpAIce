import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Microwave, 
  Plus, 
  Scan, 
  Trash2,
  Edit,
  Search,
  Filter,
  Grid,
  List,
  Loader2,
  Layers
} from "lucide-react";
import type { UserAppliance } from "@shared/schema";

// Extended type with category information
type ApplianceWithCategory = UserAppliance & {
  category?: string | null;
  subcategory?: string | null;
};

export default function Appliances() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "grouped">("grid");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<UserAppliance | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [deleteApplianceId, setDeleteApplianceId] = useState<string | null>(null);

  // Fetch appliances with category filter
  const { data: appliances = [], isLoading } = useQuery<ApplianceWithCategory[]>({
    queryKey: selectedCategory === "all" 
      ? ["/api/appliances"]
      : ["/api/appliances", { category: selectedCategory }],
    queryFn: async () => {
      const url = selectedCategory === "all"
        ? "/api/appliances"
        : `/api/appliances?category=${encodeURIComponent(selectedCategory)}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch appliances');
      return response.json();
    },
  });

  // Fetch categories from user's appliances
  const { data: categories = [] } = useQuery<{ id: string; name: string; count: number }[]>({
    queryKey: ['/api/appliances/categories'],
  });

  // Add appliance mutation
  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/appliances", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Appliance added to your kitchen",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add appliance",
        variant: "destructive",
      });
    },
  });

  // Update appliance mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/appliances/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      setEditingAppliance(null);
      toast({
        title: "Success",
        description: "Appliance updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appliance",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/appliances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      toast({
        title: "Success",
        description: "Appliance removed from your kitchen",
      });
      setDeleteApplianceId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove appliance",
        variant: "destructive",
      });
    },
  });

  // Add from barcode mutation  
  const fromBarcodeMutation = useMutation({
    mutationFn: async (data: { barcode: string; nickname?: string; notes?: string }) => 
      apiRequest("POST", '/api/appliances/from-barcode', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      setIsScanDialogOpen(false);
      setBarcodeInput("");
      toast({
        title: "Success",
        description: "Appliance added from barcode",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add appliance from barcode",
        variant: "destructive",
      });
    },
  });

  // Filter appliances (category filtering is done server-side via query param)
  const filteredAppliances = appliances.filter((appliance: ApplianceWithCategory) => {
    const matchesSearch = appliance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          appliance.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          appliance.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          appliance.customBrand?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Render capabilities badges
  const renderCapabilities = (capabilities?: string[] | null) => {
    if (!capabilities || capabilities.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {capabilities.slice(0, 3).map(cap => (
          <Badge key={cap} variant="secondary" className="text-xs">
            {cap.replace(/_/g, ' ')}
          </Badge>
        ))}
        {capabilities.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{capabilities.length - 3} more
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Kitchen Appliances</h1>
          <p className="text-muted-foreground">
            Manage your kitchen appliances and tools
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsScanDialogOpen(true)} variant="outline" data-testid="button-scan-barcode">
            <Scan className="w-4 h-4 mr-2" />
            Scan Barcode
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-appliance">
            <Plus className="w-4 h-4 mr-2" />
            Add Manually
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search appliances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grouped" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grouped")}
                data-testid="button-view-grouped"
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appliances Display */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredAppliances.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Microwave className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No appliances found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all" 
                ? "Try adjusting your filters" 
                : "Add your first appliance to get started"}
            </p>
            <Button onClick={() => setIsScanDialogOpen(true)} data-testid="button-scan-first">
              <Scan className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grouped" ? (
        // Group appliances by category
        <div className="space-y-6">
          {(() => {
            const grouped = filteredAppliances.reduce((acc, appliance) => {
              const category = appliance.category || 'Uncategorized';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(appliance);
              return acc;
            }, {} as Record<string, ApplianceWithCategory[]>);

            return Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, categoryAppliances]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <Badge variant="secondary">{categoryAppliances.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryAppliances.map((appliance) => (
                      <Card key={appliance.id} className="hover-elevate" data-testid={`card-appliance-${appliance.id}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {appliance.nickname || appliance.name}
                              </CardTitle>
                              {appliance.nickname && appliance.nickname !== appliance.name && (
                                <CardDescription>{appliance.name}</CardDescription>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingAppliance(appliance)}
                                data-testid={`button-edit-${appliance.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteApplianceId(appliance.id)}
                                data-testid={`button-delete-${appliance.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {appliance.imageUrl && (
                            <img 
                              src={appliance.imageUrl} 
                              alt={appliance.name}
                              className="w-full h-32 object-contain mb-3 rounded"
                            />
                          )}
                          <div className="space-y-2">
                            {appliance.customBrand && (
                              <div className="text-sm text-muted-foreground">
                                Brand: {appliance.customBrand}
                              </div>
                            )}
                            {appliance.customCapacity && (
                              <div className="text-sm text-muted-foreground">
                                Capacity: {appliance.customCapacity}
                              </div>
                            )}
                            {renderCapabilities(appliance.customCapabilities)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ));
          })()}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppliances.map((appliance: ApplianceWithCategory) => (
            <Card key={appliance.id} className="hover-elevate" data-testid={`card-appliance-${appliance.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {appliance.nickname || appliance.name}
                    </CardTitle>
                    {appliance.nickname && appliance.nickname !== appliance.name && (
                      <CardDescription>{appliance.name}</CardDescription>
                    )}
                    {appliance.category && (
                      <Badge variant="outline" className="mt-2">
                        {appliance.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingAppliance(appliance)}
                      data-testid={`button-edit-${appliance.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteApplianceId(appliance.id)}
                      data-testid={`button-delete-${appliance.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {appliance.imageUrl && (
                  <img 
                    src={appliance.imageUrl} 
                    alt={appliance.name}
                    className="w-full h-32 object-contain mb-3 rounded"
                  />
                )}
                <div className="space-y-2">
                  {appliance.customBrand && (
                    <div className="text-sm text-muted-foreground">
                      Brand: {appliance.customBrand}
                    </div>
                  )}
                  {appliance.customCapacity && (
                    <div className="text-sm text-muted-foreground">
                      Capacity: {appliance.customCapacity}
                    </div>
                  )}
                  {renderCapabilities(appliance.customCapabilities)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {filteredAppliances.map((appliance: ApplianceWithCategory, index: number) => (
                <div key={appliance.id}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {appliance.imageUrl && (
                        <img 
                          src={appliance.imageUrl} 
                          alt={appliance.name}
                          className="w-16 h-16 object-contain rounded"
                        />
                      )}
                      <div>
                        <div className="font-semibold">
                          {appliance.nickname || appliance.name}
                        </div>
                        {appliance.nickname && appliance.nickname !== appliance.name && (
                          <div className="text-sm text-muted-foreground">{appliance.name}</div>
                        )}
                        {appliance.category && (
                          <Badge variant="outline" className="mt-1">
                            {appliance.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {renderCapabilities(appliance.customCapabilities)}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingAppliance(appliance)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteApplianceId(appliance.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {index < filteredAppliances.length - 1 && <Separator />}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Add Manual Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Appliance Manually</DialogTitle>
            <DialogDescription>
              Add a new appliance to your kitchen inventory
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addMutation.mutate({
              name: formData.get('name'),
              type: formData.get('type') || 'cooking',
              nickname: formData.get('nickname'),
              // UserAppliance schema doesn't have notes or categoryId fields
              // Only send valid fields
            });
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g., Ninja Foodi" />
              </div>
              <div>
                <Label htmlFor="nickname">Nickname (optional)</Label>
                <Input id="nickname" name="nickname" placeholder="e.g., My Air Fryer" />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue="cooking">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cooking">Cooking</SelectItem>
                    <SelectItem value="baking">Baking</SelectItem>
                    <SelectItem value="prep">Food Prep</SelectItem>
                    <SelectItem value="bakeware">Bakeware</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Appliance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Scan Dialog */}
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan or Enter Barcode</DialogTitle>
            <DialogDescription>
              Scan a barcode or enter the number manually to add an appliance
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            fromBarcodeMutation.mutate({
              barcode: formData.get('barcode') as string,
              nickname: formData.get('nickname') as string,
              notes: formData.get('notes') as string,
            });
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="barcode">Barcode Number</Label>
                <Input 
                  id="barcode" 
                  name="barcode" 
                  required 
                  placeholder="e.g., 787790842514"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  data-testid="input-barcode"
                />
              </div>
              <div>
                <Label htmlFor="scan-nickname">Nickname (optional)</Label>
                <Input 
                  id="scan-nickname" 
                  name="nickname" 
                  placeholder="Give it a custom name" 
                />
              </div>
              <div>
                <Label htmlFor="scan-notes">Notes (optional)</Label>
                <Textarea 
                  id="scan-notes" 
                  name="notes" 
                  placeholder="Any special notes..." 
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsScanDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={fromBarcodeMutation.isPending || !barcodeInput} 
                data-testid="button-submit-scan"
              >
                {fromBarcodeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add from Barcode
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Appliance Dialog */}
      {editingAppliance && (
        <Dialog open={!!editingAppliance} onOpenChange={() => setEditingAppliance(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Appliance</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                id: editingAppliance.id,
                data: {
                  nickname: formData.get('edit-nickname'),
                  notes: formData.get('edit-notes'),
                },
              });
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-nickname">Nickname</Label>
                  <Input 
                    id="edit-nickname" 
                    name="edit-nickname" 
                    defaultValue={editingAppliance.nickname || editingAppliance.name}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea 
                    id="edit-notes" 
                    name="edit-notes" 
                    defaultValue={editingAppliance.notes || ""}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setEditingAppliance(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteApplianceId} onOpenChange={() => setDeleteApplianceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Appliance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the appliance from your kitchen registry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteApplianceId && deleteMutation.mutate(deleteApplianceId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
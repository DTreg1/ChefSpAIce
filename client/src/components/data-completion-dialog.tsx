import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserStorage } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DataQualityIndicator } from "@/components/forms";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Package,
  Calendar,
  MapPin,
  Barcode,
  Info
} from "lucide-react";

const dataCompletionSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.string().min(1, "Unit is required"),
  storageLocationId: z.string().min(1, "Storage location is required"),
  expirationDate: z.string().optional(),
  foodCategory: z.string().optional(),
  barcode: z.string().optional(),
  nutrition: z.any().optional(),
  servingSize: z.string().optional(),
  servingUnit: z.string().optional(),
  imageUrl: z.string().optional(),
});

type DataCompletionForm = z.infer<typeof dataCompletionSchema>;

interface DataCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Partial<DataCompletionForm>;
  userId: string;
  onComplete?: (completedData: any) => void;
}

export function DataCompletionDialog({
  open,
  onOpenChange,
  initialData,
  userId,
  onComplete
}: DataCompletionDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<"manual" | "search">("manual");
  const [dataQuality, setDataQuality] = useState<any>(null);

  const form = useForm<DataCompletionForm>({
    resolver: zodResolver(dataCompletionSchema),
    defaultValues: {
      name: initialData.name || "",
      quantity: initialData.quantity || "1",
      unit: initialData.unit || "item",
      storageLocationId: initialData.storageLocationId || "",
      expirationDate: initialData.expirationDate || "",
      foodCategory: initialData.foodCategory || "",
      barcode: initialData.barcode || "",
      ...initialData,
    },
  });

  // Fetch storage locations
  const { data: storageLocations } = useQuery<UserStorage[]>({
    queryKey: ['/api/storage-locations', userId],
  });

  // Assess data quality
  const assessQualityMutation = useMutation({
    mutationFn: async (item: Partial<DataCompletionForm>) => {
      return apiRequest('/api/data-completion/assess-quality', 'POST', {
        item,
        userId
      });
    },
    onSuccess: (data) => {
      setDataQuality(data.assessment);
      // Apply suggestions to form if fields are empty
      if (data.suggestions) {
        Object.entries(data.suggestions).forEach(([key, value]) => {
          if (!form.getValues(key as keyof DataCompletionForm)) {
            form.setValue(key as keyof DataCompletionForm, value as any);
          }
        });
      }
    },
  });

  // Enrich product data
  const enrichProductMutation = useMutation({
    mutationFn: async (product: Partial<DataCompletionForm>) => {
      return apiRequest('/api/data-completion/enrich-product', 'POST', {
        product,
        userId
      });
    },
    onSuccess: (data) => {
      if (data.product) {
        // Update form with enriched data
        Object.entries(data.product).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            form.setValue(key as keyof DataCompletionForm, value as any);
          }
        });
        setDataQuality(data.dataQuality);
        toast({
          title: "Product enriched",
          description: `Data enhanced from ${Object.keys(data.sources).filter(k => data.sources[k]).join(', ')}`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Enrichment failed",
        description: "Could not enhance product data. Please enter manually.",
        variant: "destructive",
      });
    },
  });

  // Search products
  const searchProductsMutation = useMutation({
    mutationFn: async (query: string) => {
      const params = new URLSearchParams({
        query,
        userId,
      });
      const response = await fetch(`/api/data-completion/search-products?${params}`);
      return response.json();
    },
  });

  // Complete and save
  const completeSaveMutation = useMutation({
    mutationFn: async (item: DataCompletionForm) => {
      return apiRequest('/api/data-completion/complete-and-save', 'POST', {
        item,
        userId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Product saved",
        description: "Product has been added to your inventory",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/food-items'] });
      onComplete?.(data.item);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Could not save product. Please check required fields.",
        variant: "destructive",
      });
    },
  });

  // Auto-assess quality when form changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      assessQualityMutation.mutate(value as Partial<DataCompletionForm>);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Initial assessment
  useEffect(() => {
    if (open) {
      assessQualityMutation.mutate(initialData);
    }
  }, [open]);

  const handleSearch = () => {
    if (searchQuery) {
      searchProductsMutation.mutate(searchQuery);
    }
  };

  const handleSelectSearchResult = (product: any) => {
    Object.entries(product).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'source' && key !== 'dataQuality') {
        form.setValue(key as keyof DataCompletionForm, value as any);
      }
    });
    setDataQuality(product.dataQuality);
    setSelectedSource("manual");
  };

  const handleEnrichData = () => {
    const currentData = form.getValues();
    enrichProductMutation.mutate(currentData);
  };

  const onSubmit = (data: DataCompletionForm) => {
    completeSaveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Product Information</DialogTitle>
          <DialogDescription>
            Review and complete missing product information before adding to inventory
          </DialogDescription>
        </DialogHeader>

        {dataQuality && (
          <DataQualityIndicator
            score={dataQuality.score}
            level={dataQuality.level}
            missingFields={dataQuality.missingFields}
            message={dataQuality.message}
          />
        )}

        <Tabs value={selectedSource} onValueChange={(v) => setSelectedSource(v as "search" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" data-testid="tab-manual-entry">Manual Entry</TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-search-products">Search Products</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="input-product-search"
              />
              <Button 
                onClick={handleSearch}
                disabled={searchProductsMutation.isPending}
                data-testid="button-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            {searchProductsMutation.isPending && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {searchProductsMutation.data?.results && (
              <div className="space-y-2">
                {searchProductsMutation.data.results.map((product: any, index: number) => (
                  <Card 
                    key={index} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleSelectSearchResult(product)}
                    data-testid={`card-search-result-${index}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">{product.name}</CardTitle>
                          {product.brand && (
                            <CardDescription className="text-xs">
                              {product.brand}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {product.source}
                          </Badge>
                          {product.dataQuality && (
                            <DataQualityIndicator
                              score={product.dataQuality.score}
                              level={product.dataQuality.level}
                              missingFields={[]}
                              compact
                            />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {product.nutrition && (
                      <CardContent className="pt-0">
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{product.nutrition.calories} cal</span>
                          <span>{product.nutrition.protein}g protein</span>
                          <span>{product.nutrition.carbs}g carbs</span>
                          <span>{product.nutrition.fat}g fat</span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter product name"
                            data-testid="input-product-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="1"
                            data-testid="input-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="item">Item</SelectItem>
                            <SelectItem value="lb">Pound (lb)</SelectItem>
                            <SelectItem value="oz">Ounce (oz)</SelectItem>
                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                            <SelectItem value="g">Gram (g)</SelectItem>
                            <SelectItem value="cup">Cup</SelectItem>
                            <SelectItem value="gallon">Gallon</SelectItem>
                            <SelectItem value="liter">Liter</SelectItem>
                            <SelectItem value="ml">Milliliter</SelectItem>
                            <SelectItem value="can">Can</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="package">Package</SelectItem>
                            <SelectItem value="bottle">Bottle</SelectItem>
                            <SelectItem value="jar">Jar</SelectItem>
                            <SelectItem value="bunch">Bunch</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storageLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-storage">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(storageLocations || []).map((location: any) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            data-testid="input-expiration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="UPC/EAN code"
                            data-testid="input-barcode"
                          />
                        </FormControl>
                        <FormDescription>
                          Scan or enter product barcode
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="foodCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dairy">Dairy</SelectItem>
                            <SelectItem value="Produce">Produce</SelectItem>
                            <SelectItem value="Meat">Meat</SelectItem>
                            <SelectItem value="Seafood">Seafood</SelectItem>
                            <SelectItem value="Grains">Grains</SelectItem>
                            <SelectItem value="Beverages">Beverages</SelectItem>
                            <SelectItem value="Snacks">Snacks</SelectItem>
                            <SelectItem value="Condiments">Condiments</SelectItem>
                            <SelectItem value="Frozen">Frozen</SelectItem>
                            <SelectItem value="Canned">Canned Goods</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Data Enhancement Available</AlertTitle>
                  <AlertDescription>
                    Click "Auto-Fill" to search multiple databases for nutrition and product details
                  </AlertDescription>
                </Alert>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEnrichData}
                    disabled={enrichProductMutation.isPending}
                    data-testid="button-auto-fill"
                  >
                    Auto-Fill Missing Data
                  </Button>
                  <Button
                    type="submit"
                    disabled={completeSaveMutation.isPending || !form.formState.isValid}
                    data-testid="button-save-product"
                  >
                    Save to Inventory
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
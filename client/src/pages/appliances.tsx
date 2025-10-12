import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertApplianceSchema, type Appliance, type InsertAppliance } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed, Plus, Trash2 } from "lucide-react";
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

export default function Appliances() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteApplianceId, setDeleteApplianceId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: appliances, isLoading } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
  });

  const form = useForm<InsertAppliance>({
    resolver: zodResolver(insertApplianceSchema),
    defaultValues: {
      name: "",
      type: "",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertAppliance) => {
      return apiRequest("POST", "/api/appliances", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      toast({
        title: "Success",
        description: "Appliance added to your kitchen",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add appliance",
        variant: "destructive",
      });
    },
  });

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

  const handleAddAppliance = (data: InsertAppliance) => {
    addMutation.mutate(data);
  };

  const handleDeleteAppliance = () => {
    if (deleteApplianceId) {
      deleteMutation.mutate(deleteApplianceId);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">My Appliances</h1>
                <p className="text-muted-foreground">
                  {appliances?.length || 0} appliance{appliances?.length !== 1 ? "s" : ""} registered
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-appliance"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Appliance
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading appliances...</p>
          </div>
        ) : !appliances || appliances.length === 0 ? (
          <div className="py-12">
            <div className="flex flex-col items-center justify-center p-8" data-testid="empty-appliances">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <UtensilsCrossed className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No appliances registered</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                Register your kitchen appliances to get personalized recipe suggestions
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-appliance">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Appliance
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appliances.map((appliance) => (
              <Card key={appliance.id} className="hover-elevate" data-testid={`card-appliance-${appliance.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="text-foreground">{appliance.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteApplianceId(appliance.id)}
                      data-testid={`button-delete-${appliance.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground capitalize">{appliance.type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Appliance Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-appliance">
          <DialogHeader>
            <DialogTitle>Add Kitchen Appliance</DialogTitle>
            <DialogDescription>
              Register a new appliance to get tailored recipe suggestions
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddAppliance)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appliance Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Air Fryer, Slow Cooker"
                        {...field}
                        data-testid="input-appliance-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Cooking, Baking, Prep"
                        {...field}
                        data-testid="input-appliance-type"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    form.reset();
                  }}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addMutation.isPending}
                  data-testid="button-confirm-add"
                >
                  {addMutation.isPending ? "Adding..." : "Add Appliance"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteApplianceId} onOpenChange={() => setDeleteApplianceId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Appliance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the appliance from your kitchen registry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppliance}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

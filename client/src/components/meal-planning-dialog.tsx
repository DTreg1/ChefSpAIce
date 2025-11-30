import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMealPlanSchema } from "@shared/schema";
import { z } from "zod";

interface MealPlanningDialogProps {
  recipeId: string;
  recipeTitle: string;
  defaultServings?: number;
  trigger?: React.ReactNode;
}

// Extend schema to accept Date object for the form, will convert to string on submit
const mealPlanFormSchema = z.object({
  date: z.date({ required_error: "Please select a date" }),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"] as const),
  servings: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

type MealPlanFormValues = z.infer<typeof mealPlanFormSchema>;

export function MealPlanningDialog({ 
  recipeId, 
  recipeTitle, 
  defaultServings = 1,
  trigger 
}: MealPlanningDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<MealPlanFormValues>({
    resolver: zodResolver(mealPlanFormSchema),
    defaultValues: {
      mealType: "dinner",
      servings: defaultServings,
      notes: "",
    },
  });

  const createMealPlanMutation = useMutation({
    mutationFn: async (values: MealPlanFormValues) => {
      // Normalize date to midnight and convert to YYYY-MM-DD
      const normalizedDate = new Date(values.date);
      normalizedDate.setHours(0, 0, 0, 0);
      const dateStr = normalizedDate.toLocaleDateString('en-CA');

      const mealPlan = {
        date: dateStr,
        mealType: values.mealType,
        recipeId,
        servings: values.servings,
        notes: values.notes?.trim() || undefined,
      };

      // Validate with Zod schema
      const validated = insertMealPlanSchema.parse(mealPlan);
      return await apiRequest("/api/meal-plans", "POST", validated);
    },
    onSuccess: (_, values) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({
        title: "Meal scheduled",
        description: `${recipeTitle} scheduled for ${values.mealType} on ${format(values.date, "MMM d, yyyy")}`,
      });
      // Reset form and close dialog
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error scheduling meal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: MealPlanFormValues) => {
    createMealPlanMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-schedule-meal">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-muted" data-testid="dialog-meal-planning">
        <DialogHeader>
          <DialogTitle>Schedule Meal</DialogTitle>
          <DialogDescription>
            Add this recipe to your meal plan calendar
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel htmlFor="recipe">Recipe</FormLabel>
              <Input
                id="recipe"
                value={recipeTitle}
                disabled
                className="bg-muted"
                data-testid="input-recipe-title"
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-select-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        data-testid="calendar-date-picker"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mealType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-meal-type">
                        <SelectValue placeholder="Select meal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="servings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servings</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      data-testid="input-servings"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes or modifications..."
                      rows={3}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMealPlanMutation.isPending}
                data-testid="button-confirm-schedule"
              >
                {createMealPlanMutation.isPending ? "Scheduling..." : "Schedule Meal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

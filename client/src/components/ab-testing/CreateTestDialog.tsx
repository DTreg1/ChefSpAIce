import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type InsertAbTest } from "@shared/schema";

interface CreateTestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTestDialog({ open, onClose, onSuccess }: CreateTestDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertAbTest>>({
    name: "",
    variantA: "",
    variantB: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    status: "draft",
    successMetric: "conversion",
    targetAudience: 0.5,
    metadata: {
      hypothesis: "",
      featureArea: "",
      minimumSampleSize: 1000,
      confidenceLevel: 0.95
    }
  });

  const createTest = useMutation({
    mutationFn: async (data: Partial<InsertAbTest>) => {
      const response = await apiRequest("POST", "/api/ab/create", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test created",
        description: "Your A/B test has been created successfully.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create test",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.variantA || !formData.variantB) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createTest.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New A/B Test</DialogTitle>
            <DialogDescription>
              Set up a new A/B test to optimize your features
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Test Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Homepage CTA Button Test"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-test-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="variantA">Variant A (Control) *</Label>
                <Input
                  id="variantA"
                  placeholder="e.g., Blue button"
                  value={formData.variantA}
                  onChange={(e) => setFormData({ ...formData, variantA: e.target.value })}
                  data-testid="input-variant-a"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="variantB">Variant B (Test) *</Label>
                <Input
                  id="variantB"
                  placeholder="e.g., Green button"
                  value={formData.variantB}
                  onChange={(e) => setFormData({ ...formData, variantB: e.target.value })}
                  data-testid="input-variant-b"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hypothesis">Hypothesis</Label>
              <Textarea
                id="hypothesis"
                placeholder="e.g., Changing the button color to green will increase click-through rate by 10%"
                value={formData.metadata?.hypothesis}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  metadata: { ...formData.metadata, hypothesis: e.target.value } 
                })}
                data-testid="textarea-hypothesis"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground"
                      )}
                      data-testid="button-start-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => setFormData({ ...formData, startDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground"
                      )}
                      data-testid="button-end-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => setFormData({ ...formData, endDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="metric">Success Metric</Label>
                <Select 
                  value={formData.successMetric} 
                  onValueChange={(value) => setFormData({ ...formData, successMetric: value })}
                >
                  <SelectTrigger id="metric" data-testid="select-metric">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversion">Conversion Rate</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="audience">Target Audience %</Label>
                <Input
                  id="audience"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={(formData.targetAudience || 0.5) * 100}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    targetAudience: parseFloat(e.target.value) / 100 
                  })}
                  data-testid="input-audience"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sampleSize">Min Sample Size</Label>
                <Input
                  id="sampleSize"
                  type="number"
                  min="100"
                  step="100"
                  value={formData.metadata?.minimumSampleSize}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    metadata: { ...formData.metadata, minimumSampleSize: parseInt(e.target.value) } 
                  })}
                  data-testid="input-sample-size"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTest.isPending} data-testid="button-submit">
              {createTest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
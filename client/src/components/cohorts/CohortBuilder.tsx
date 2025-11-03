import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Plus, X, Users, Filter, Save } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertCohort } from "@shared/schema";

interface CohortDefinition {
  signupDateRange?: {
    start?: string;
    end?: string;
  };
  source?: string;
  userBehavior?: {
    event?: string;
    minCount?: number;
    timeframe?: number;
  };
  customFilters?: Array<{
    field: string;
    operator: string;
    value: string | number;
  }>;
}

export function CohortBuilder() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [source, setSource] = useState("");
  const [behaviorEvent, setBehaviorEvent] = useState("");
  const [behaviorMinCount, setBehaviorMinCount] = useState("");
  const [behaviorTimeframe, setBehaviorTimeframe] = useState("");
  const [customFilters, setCustomFilters] = useState<CohortDefinition["customFilters"]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createCohortMutation = useMutation({
    mutationFn: (cohort: Partial<InsertCohort>) => 
      apiRequest("/api/cohorts", { method: "POST", body: JSON.stringify(cohort) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
      toast({
        title: "Cohort created",
        description: "Your cohort has been created successfully.",
      });
      // Reset form
      setName("");
      setDescription("");
      setStartDate(undefined);
      setEndDate(undefined);
      setSource("");
      setBehaviorEvent("");
      setBehaviorMinCount("");
      setBehaviorTimeframe("");
      setCustomFilters([]);
    },
    onError: (error) => {
      toast({
        title: "Error creating cohort",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const addCustomFilter = () => {
    setCustomFilters([
      ...customFilters,
      { field: "", operator: "equals", value: "" }
    ]);
  };
  
  const removeCustomFilter = (index: number) => {
    setCustomFilters(customFilters.filter((_, i) => i !== index));
  };
  
  const updateCustomFilter = (index: number, field: keyof typeof customFilters[0], value: any) => {
    const updated = [...customFilters];
    updated[index] = { ...updated[index], [field]: value };
    setCustomFilters(updated);
  };
  
  const handleSubmit = () => {
    if (!name) {
      toast({
        title: "Name required",
        description: "Please enter a name for your cohort.",
        variant: "destructive",
      });
      return;
    }
    
    const definition: CohortDefinition = {};
    
    // Add date range if specified
    if (startDate || endDate) {
      definition.signupDateRange = {
        ...(startDate && { start: startDate.toISOString() }),
        ...(endDate && { end: endDate.toISOString() }),
      };
    }
    
    // Add source if specified
    if (source) {
      definition.source = source;
    }
    
    // Add behavior filters if specified
    if (behaviorEvent) {
      definition.userBehavior = {
        event: behaviorEvent,
        ...(behaviorMinCount && { minCount: parseInt(behaviorMinCount) }),
        ...(behaviorTimeframe && { timeframe: parseInt(behaviorTimeframe) }),
      };
    }
    
    // Add custom filters if any
    if (customFilters.length > 0 && customFilters.every(f => f.field && f.value)) {
      definition.customFilters = customFilters;
    }
    
    createCohortMutation.mutate({
      name,
      description,
      definition,
      isActive,
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create New Cohort
        </CardTitle>
        <CardDescription>
          Define a cohort by combining user attributes and behaviors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Cohort Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., January 2025 Signups"
                data-testid="input-cohort-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this cohort..."
                data-testid="input-cohort-description"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="switch-cohort-active"
              />
            </div>
          </div>
          
          {/* Filtering Options */}
          <Tabs defaultValue="dates" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dates" data-testid="tab-dates">Signup Date</TabsTrigger>
              <TabsTrigger value="source" data-testid="tab-source">Source</TabsTrigger>
              <TabsTrigger value="behavior" data-testid="tab-behavior">Behavior</TabsTrigger>
              <TabsTrigger value="custom" data-testid="tab-custom">Custom</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dates" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-start-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-end-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {(startDate || endDate) && (
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {startDate && format(startDate, "MMM d, yyyy")}
                    {startDate && endDate && " - "}
                    {endDate && format(endDate, "MMM d, yyyy")}
                  </Badge>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="source" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="source">Acquisition Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger id="source" data-testid="select-source">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organic">Organic</SelectItem>
                    <SelectItem value="paid_search">Paid Search</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="email">Email Campaign</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {source && (
                <Badge variant="secondary">
                  Source: {source}
                </Badge>
              )}
            </TabsContent>
            
            <TabsContent value="behavior" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event">Event Type</Label>
                <Select value={behaviorEvent} onValueChange={setBehaviorEvent}>
                  <SelectTrigger id="event" data-testid="select-event">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page_view">Page View</SelectItem>
                    <SelectItem value="button_click">Button Click</SelectItem>
                    <SelectItem value="form_submission">Form Submission</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="signup">Signup</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-count">Minimum Count</Label>
                  <Input
                    id="min-count"
                    type="number"
                    value={behaviorMinCount}
                    onChange={(e) => setBehaviorMinCount(e.target.value)}
                    placeholder="e.g., 5"
                    data-testid="input-min-count"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Within Days</Label>
                  <Input
                    id="timeframe"
                    type="number"
                    value={behaviorTimeframe}
                    onChange={(e) => setBehaviorTimeframe(e.target.value)}
                    placeholder="e.g., 30"
                    data-testid="input-timeframe"
                  />
                </div>
              </div>
              
              {behaviorEvent && (
                <Badge variant="secondary">
                  {behaviorEvent}
                  {behaviorMinCount && ` ≥ ${behaviorMinCount} times`}
                  {behaviorTimeframe && ` in ${behaviorTimeframe} days`}
                </Badge>
              )}
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-4">
                {customFilters.map((filter, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Field"
                      value={filter.field}
                      onChange={(e) => updateCustomFilter(index, "field", e.target.value)}
                      className="flex-1"
                      data-testid={`input-field-${index}`}
                    />
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateCustomFilter(index, "operator", value)}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-operator-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">=</SelectItem>
                        <SelectItem value="not_equals">≠</SelectItem>
                        <SelectItem value="greater">{'>'}</SelectItem>
                        <SelectItem value="less">{'<'}</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={filter.value}
                      onChange={(e) => updateCustomFilter(index, "value", e.target.value)}
                      className="flex-1"
                      data-testid={`input-value-${index}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCustomFilter(index)}
                      data-testid={`button-remove-filter-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addCustomFilter}
                  className="w-full"
                  data-testid="button-add-filter"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Filter
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit}
          disabled={createCohortMutation.isPending}
          className="w-full"
          data-testid="button-create-cohort"
        >
          <Save className="h-4 w-4 mr-2" />
          {createCohortMutation.isPending ? "Creating..." : "Create Cohort"}
        </Button>
      </CardFooter>
    </Card>
  );
}
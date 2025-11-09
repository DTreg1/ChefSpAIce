import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Send, 
  ArrowUpRight, 
  UserCheck, 
  AlertCircle, 
  Settings, 
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  ChevronRight,
  BrainCircuit,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Form schemas
const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  priority: z.string().optional(),
  submittedBy: z.string().min(1, "Submitter email is required").email(),
});

const createRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  keywords: z.string().optional(),
  categories: z.string().optional(),
  priorities: z.string().optional(),
  assigned_to: z.string().min(1, "Assignment target is required"),
  priority: z.string().optional(),
  confidence_threshold: z.string().optional(),
});

type CreateTicketForm = z.infer<typeof createTicketSchema>;
type CreateRuleForm = z.infer<typeof createRuleSchema>;

// Type definitions
interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  submittedBy: string;
  assignedTo: string | null;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface RoutingSuggestion {
  assignedTo: string;
  confidence: number;
  reasoning: string;
  method: string;
}

interface RoutingRule {
  id: string;
  name: string;
  condition: {
    keywords?: string[];
    categories?: string[];
    priorities?: string[];
  };
  assigned_to: string;
  priority: number;
  confidence_threshold: number;
  isActive: boolean;
  metadata?: {
    description?: string;
  };
}

interface Agent {
  agent_id: string;
  name: string;
  email?: string;
  availability: "available" | "busy" | "offline";
  current_load: number;
  max_capacity: number;
  skills?: Array<{
    skill: string;
    level: number;
    categories: string[];
  }>;
}

interface RoutingMetrics {
  totalTickets: number;
  avgConfidence: number;
  avgResponseTime: number;
  routingAccuracy: number;
  topAgents: Array<{ agent: string; count: number }>;
  methodBreakdown: Array<{ method: string; count: number }>;
}

export default function TicketRouting() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");

  // Queries
  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ["/api/routing/tickets"],
    enabled: activeTab === "tickets",
  });

  const { data: rules, isLoading: loadingRules } = useQuery({
    queryKey: ["/api/routing/rules"],
    enabled: activeTab === "rules",
  });

  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ["/api/routing/agents"],
    enabled: activeTab === "agents",
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["/api/routing/performance"],
    enabled: activeTab === "dashboard",
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: (data: CreateTicketForm) => 
      apiRequest("/api/routing/tickets", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing/tickets"] });
      setShowCreateTicket(false);
      toast({
        title: "Ticket Created",
        description: "The support ticket has been created successfully.",
      });
    },
  });

  const assignTicketMutation = useMutation({
    mutationFn: (ticketId: string) => 
      apiRequest(`/api/routing/assign/${ticketId}`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routing/performance"] });
      toast({
        title: "Ticket Routed",
        description: "The ticket has been automatically assigned.",
      });
    },
  });

  const escalateTicketMutation = useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason: string }) => 
      apiRequest(`/api/routing/escalate/${ticketId}`, "POST", { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing/tickets"] });
      toast({
        title: "Ticket Escalated",
        description: "The ticket has been escalated to a higher tier.",
      });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: CreateRuleForm) => {
      const processed = {
        name: data.name,
        condition: {
          keywords: data.keywords ? data.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
          categories: data.categories ? data.categories.split(',').map(c => c.trim()).filter(c => c) : undefined,
          priorities: data.priorities ? data.priorities.split(',').map(p => p.trim()).filter(p => p) : undefined,
        },
        assigned_to: data.assigned_to,
        priority: data.priority ? parseInt(data.priority) : 100,
        confidence_threshold: data.confidence_threshold ? parseFloat(data.confidence_threshold) : 0.7,
      };
      
      return apiRequest("/api/routing/rules", "POST", processed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing/rules"] });
      setShowCreateRule(false);
      toast({
        title: "Rule Created",
        description: "The routing rule has been created successfully.",
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => 
      apiRequest(`/api/routing/rules/${ruleId}`, "PUT", { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing/rules"] });
      toast({
        title: "Rule Updated",
        description: "The routing rule has been updated.",
      });
    },
  });

  // Forms
  const ticketForm = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      priority: "medium",
      submittedBy: "",
    },
  });

  const ruleForm = useForm<CreateRuleForm>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: {
      name: "",
      keywords: "",
      categories: "",
      priorities: "",
      assigned_to: "",
      priority: "100",
      confidence_threshold: "0.7",
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-500";
      case "assigned": return "bg-purple-500";
      case "in_progress": return "bg-yellow-500";
      case "resolved": return "bg-green-500";
      case "escalated": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Intelligent Ticket Routing</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered support ticket classification and assignment
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCreateRule(true)}
            data-testid="button-create-rule"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Rules
          </Button>
          <Button onClick={() => setShowCreateTicket(true)} data-testid="button-create-ticket">
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">
            <Send className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Users className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">
            <BrainCircuit className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {loadingMetrics ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-6">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : metrics?.metrics ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-total-tickets">
                      {metrics.metrics.totalTickets}
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-avg-confidence">
                      {(metrics.metrics.avgConfidence * 100).toFixed(1)}%
                    </div>
                    <Progress value={metrics.metrics.avgConfidence * 100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Routing Accuracy</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-routing-accuracy">
                      {(metrics.metrics.routingAccuracy * 100).toFixed(1)}%
                    </div>
                    <Progress value={metrics.metrics.routingAccuracy * 100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-response-time">
                      {metrics.metrics.avgResponseTime.toFixed(0)}m
                    </div>
                    <p className="text-xs text-muted-foreground">Average</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Agents</CardTitle>
                    <CardDescription>Most assigned agents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics.metrics.topAgents.map((agent, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`top-agent-${idx}`}>{agent.agent}</span>
                          </div>
                          <Badge variant="secondary">{agent.count} tickets</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Routing Methods</CardTitle>
                    <CardDescription>Classification breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics.metrics.methodBreakdown.map((method, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`method-${idx}`}>{method.method}</span>
                          </div>
                          <Badge variant="outline">{method.count} uses</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No metrics available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          {loadingTickets ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tickets?.tickets?.length > 0 ? (
            <div className="grid gap-4">
              {tickets.tickets.map((ticket: Ticket) => (
                <Card key={ticket.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg" data-testid={`ticket-title-${ticket.id}`}>
                          {ticket.title}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          {ticket.category && (
                            <Badge variant="outline">{ticket.category}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {ticket.status === "new" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              assignTicketMutation.mutate(ticket.id);
                            }}
                            data-testid={`button-route-${ticket.id}`}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Route
                          </Button>
                        )}
                        {(ticket.status === "assigned" || ticket.status === "in_progress") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              escalateTicketMutation.mutate({
                                ticketId: ticket.id,
                                reason: "Manual escalation requested",
                              });
                            }}
                            data-testid={`button-escalate-${ticket.id}`}
                          >
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            Escalate
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription className="mt-2" data-testid={`ticket-description-${ticket.id}`}>
                      {ticket.description.substring(0, 150)}
                      {ticket.description.length > 150 && "..."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>From: {ticket.submittedBy}</span>
                      {ticket.assignedTo && (
                        <span>Assigned to: {ticket.assignedTo}</span>
                      )}
                      <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tickets yet</p>
                <Button
                  className="mt-4"
                  onClick={() => setShowCreateTicket(true)}
                  data-testid="button-create-first-ticket"
                >
                  Create First Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          {loadingAgents ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : agents?.agents?.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.agents.map((agent: Agent) => (
                <Card key={agent.agent_id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg" data-testid={`agent-name-${agent.agent_id}`}>
                          {agent.name}
                        </CardTitle>
                        {agent.email && (
                          <CardDescription>{agent.email}</CardDescription>
                        )}
                      </div>
                      <Badge
                        variant={agent.availability === "available" ? "default" : 
                                agent.availability === "busy" ? "secondary" : "outline"}
                      >
                        {agent.availability}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Workload</span>
                          <span>{agent.current_load}/{agent.max_capacity}</span>
                        </div>
                        <Progress value={(agent.current_load / agent.max_capacity) * 100} />
                      </div>
                      
                      {agent.skills && agent.skills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.skills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill.skill} (L{skill.level})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No agents configured</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {loadingRules ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rules?.rules?.length > 0 ? (
            <div className="space-y-4">
              {rules.rules.map((rule: RoutingRule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg" data-testid={`rule-name-${rule.id}`}>
                          {rule.name}
                        </CardTitle>
                        {rule.metadata?.description && (
                          <CardDescription>{rule.metadata.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={rule.isActive ? "default" : "outline"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRuleMutation.mutate({
                            ruleId: rule.id,
                            isActive: !rule.isActive,
                          })}
                          data-testid={`button-toggle-rule-${rule.id}`}
                        >
                          {rule.isActive ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Assigns to:</span>
                        <span>{rule.assigned_to}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Priority:</span>
                        <span>{rule.priority}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Confidence Threshold:</span>
                        <span>{(rule.confidence_threshold * 100).toFixed(0)}%</span>
                      </div>
                      
                      {rule.condition.keywords && rule.condition.keywords.length > 0 && (
                        <div>
                          <span className="font-medium">Keywords:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rule.condition.keywords.map((keyword, idx) => (
                              <Badge key={idx} variant="secondary">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {rule.condition.categories && rule.condition.categories.length > 0 && (
                        <div>
                          <span className="font-medium">Categories:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rule.condition.categories.map((category, idx) => (
                              <Badge key={idx} variant="secondary">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BrainCircuit className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No routing rules configured</p>
                <Button
                  className="mt-4"
                  onClick={() => setShowCreateRule(true)}
                  data-testid="button-create-first-rule"
                >
                  Create First Rule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateTicket} onOpenChange={setShowCreateTicket}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Submit a new support ticket for intelligent routing
            </DialogDescription>
          </DialogHeader>
          <Form {...ticketForm}>
            <form onSubmit={ticketForm.handleSubmit((data) => createTicketMutation.mutate(data))} className="space-y-4">
              <FormField
                control={ticketForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the issue" {...field} data-testid="input-ticket-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ticketForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description of the issue..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-ticket-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ticketForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={ticketForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={ticketForm.control}
                name="submittedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submitter Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} data-testid="input-ticket-submitter" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateTicket(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTicketMutation.isPending} data-testid="button-submit-ticket">
                  {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Routing Rule</DialogTitle>
            <DialogDescription>
              Define conditions for automatic ticket routing
            </DialogDescription>
          </DialogHeader>
          <Form {...ruleForm}>
            <form onSubmit={ruleForm.handleSubmit((data) => createRuleMutation.mutate(data))} className="space-y-4">
              <FormField
                control={ruleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Route billing to finance team" {...field} data-testid="input-rule-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ruleForm.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., payment, invoice, refund" {...field} data-testid="input-rule-keywords" />
                    </FormControl>
                    <FormDescription>
                      Tickets containing these keywords will match this rule
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ruleForm.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categories (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., billing, technical" {...field} data-testid="input-rule-categories" />
                    </FormControl>
                    <FormDescription>
                      Tickets with these categories will match this rule
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ruleForm.control}
                name="priorities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorities (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., critical, high" {...field} data-testid="input-rule-priorities" />
                    </FormControl>
                    <FormDescription>
                      Tickets with these priorities will match this rule
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ruleForm.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., finance-team or john@example.com" {...field} data-testid="input-rule-assignto" />
                    </FormControl>
                    <FormDescription>
                      Team or agent to assign matching tickets to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ruleForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Priority</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} data-testid="input-rule-priority" />
                      </FormControl>
                      <FormDescription>
                        Higher priority rules are evaluated first
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={ruleForm.control}
                  name="confidence_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confidence Threshold</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" max="1" placeholder="0.7" {...field} data-testid="input-rule-confidence" />
                      </FormControl>
                      <FormDescription>
                        Minimum confidence required (0-1)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateRule(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRuleMutation.isPending} data-testid="button-submit-rule">
                  {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
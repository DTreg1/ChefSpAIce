/**
 * @file server/storage/interfaces/ISupportStorage.ts
 * @description Interface for support ticket management and help desk operations
 */

import type {
  Ticket,
  InsertTicket,
  RoutingRule,
  InsertRoutingRule,
  TicketRouting,
  InsertTicketRouting,
  AgentExpertise,
  InsertAgentExpertise,
} from "@shared/schema/support";

export interface ISupportStorage {
  // ==================== Ticket Management ====================
  getTickets(filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    category?: string;
    userId?: string;
  }): Promise<Ticket[]>;
  getTicket(ticketId: string): Promise<Ticket | undefined>;
  getUserTickets(userId: string, status?: string): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<Ticket>;
  deleteTicket(ticketId: string): Promise<void>;
  assignTicket(ticketId: string, agentId: string): Promise<Ticket>;
  resolveTicket(
    ticketId: string,
    resolutionNotes: string,
    timeToResolution: number
  ): Promise<Ticket>;
  closeTicket(ticketId: string, satisfactionRating?: number): Promise<Ticket>;
  getTicketStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    averageResolutionTime: number;
    averageSatisfactionRating: number;
  }>;

  // ==================== Routing Rules ====================
  getRoutingRules(isActive?: boolean): Promise<RoutingRule[]>;
  getRoutingRule(ruleId: string): Promise<RoutingRule | undefined>;
  createRoutingRule(rule: InsertRoutingRule): Promise<RoutingRule>;
  updateRoutingRule(
    ruleId: string,
    updates: Partial<RoutingRule>
  ): Promise<RoutingRule>;
  deleteRoutingRule(ruleId: string): Promise<void>;
  applyRoutingRules(ticket: Ticket): Promise<{
    assignedTo?: string;
    priority?: string;
    category?: string;
    tags?: string[];
    appliedRules: string[];
  }>;

  // ==================== Ticket Routing History ====================
  getTicketRouting(ticketId: string): Promise<TicketRouting[]>;
  createTicketRouting(routing: InsertTicketRouting): Promise<TicketRouting>;
  updateTicketRouting(
    routingId: string,
    updates: Partial<TicketRouting>
  ): Promise<TicketRouting | null>;
  getAllRoutingsWithOutcomes(
    startDate?: Date,
    endDate?: Date
  ): Promise<TicketRouting[]>;
  getRoutingMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTickets: number;
    averageConfidence: number;
    routingAccuracy: number;
    averageResolutionTime: number;
    byCategory: Record<string, number>;
    byAgent: Record<string, { count: number; avgTime: number }>;
  }>;

  // ==================== Agent Expertise ====================
  getAgents(): Promise<AgentExpertise[]>;
  getAgent(agentId: string): Promise<AgentExpertise | undefined>;
  getAvailableAgents(): Promise<AgentExpertise[]>;
  getAgentsByExpertise(expertiseArea: string): Promise<AgentExpertise[]>;
  upsertAgentExpertise(agent: InsertAgentExpertise): Promise<AgentExpertise>;
  updateAgentWorkload(agentId: string, delta: number): Promise<void>;
  updateAgentAvailability(
    agentId: string,
    availability: string
  ): Promise<void>;
  getAgentWorkloadStats(): Promise<
    Array<{
      agentId: string;
      currentLoad: number;
      maxCapacity: number;
      utilization: number;
      avgSatisfactionScore: number;
    }>
  >;
}

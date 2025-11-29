/**
 * @file server/storage/domains/support.storage.ts
 * @description Support ticket and help desk management storage operations
 * 
 * Domain: Support & Customer Service
 * Scope: Ticket management, routing, agent expertise, help desk analytics
 * 
 * EXPORT PATTERN:
 * - Export CLASS (SupportStorage) for dependency injection and testing
 * - Export singleton INSTANCE (supportStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { and, eq, desc, asc, sql, gte, lte, ne } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";
import type { ISupportStorage } from "../interfaces/ISupportStorage";
import {
  tickets,
  routingRules,
  ticketRouting,
  agentExpertise,
  type Ticket,
  type InsertTicket,
  type RoutingRule,
  type InsertRoutingRule,
  type TicketRouting,
  type InsertTicketRouting,
  type AgentExpertise,
  type InsertAgentExpertise,
} from "@shared/schema/support";

/**
 * Support Storage
 * 
 * Manages support tickets, routing rules, agent expertise, and help desk operations.
 * Provides comprehensive ticketing system with intelligent routing and workload management.
 */
export class SupportStorage implements ISupportStorage {
  // ==================== Ticket Management ====================

  async getTickets(filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    category?: string;
    userId?: string;
  }): Promise<Ticket[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(tickets.status, filters.status));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(tickets.assignedTo, filters.assignedTo));
    }
    if (filters?.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }
    if (filters?.category) {
      conditions.push(eq(tickets.category, filters.category));
    }
    if (filters?.userId) {
      conditions.push(eq(tickets.userId, filters.userId));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.createdAt));
    }

    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicket(ticketId: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));
    return ticket;
  }

  async getUserTickets(userId: string, status?: string): Promise<Ticket[]> {
    const conditions = [eq(tickets.userId, userId)];
    
    if (status) {
      conditions.push(eq(tickets.status, status));
    }

    return await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(desc(tickets.createdAt));
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db
      .insert(tickets)
      .values(ticket as any)
      .returning();
    return newTicket;
  }

  async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>
  ): Promise<Ticket> {
    const [updatedTicket] = await db
      .update(tickets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await db.delete(tickets).where(eq(tickets.id, ticketId));
  }

  async assignTicket(ticketId: string, agentId: string): Promise<Ticket> {
    const [updatedTicket] = await db
      .update(tickets)
      .set({
        assignedTo: agentId,
        status: "assigned",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    // Update agent workload
    await this.updateAgentWorkload(agentId, 1);

    // Create routing history
    await this.createTicketRouting({
      ticketId,
      toAssignee: agentId,
      routingReason: "manual",
    });

    return updatedTicket;
  }

  async resolveTicket(
    ticketId: string,
    resolutionNotes: string,
    timeToResolution: number
  ): Promise<Ticket> {
    const [updatedTicket] = await db
      .update(tickets)
      .set({
        status: "resolved",
        resolutionNotes,
        timeToResolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  async closeTicket(
    ticketId: string,
    satisfactionRating?: number
  ): Promise<Ticket> {
    const ticket = await this.getTicket(ticketId);
    
    const [closedTicket] = await db
      .update(tickets)
      .set({
        status: "closed",
        satisfactionRating,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    // Decrease agent workload
    if (ticket?.assignedTo) {
      await this.updateAgentWorkload(ticket.assignedTo, -1);
    }

    return closedTicket;
  }

  async getTicketStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    averageResolutionTime: number;
    averageSatisfactionRating: number;
  }> {
    const conditions = [];

    if (startDate) {
      conditions.push(gte(tickets.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(tickets.createdAt, endDate));
    }

    const filteredTickets = conditions.length > 0
      ? await db.select().from(tickets).where(and(...conditions))
      : await db.select().from(tickets);

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let totalSatisfaction = 0;
    let ratedCount = 0;

    for (const ticket of filteredTickets) {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;

      if (ticket.timeToResolution) {
        totalResolutionTime += ticket.timeToResolution;
        resolvedCount++;
      }

      if (ticket.satisfactionRating) {
        totalSatisfaction += ticket.satisfactionRating;
        ratedCount++;
      }
    }

    return {
      total: filteredTickets.length,
      byStatus,
      byPriority,
      byCategory,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      averageSatisfactionRating: ratedCount > 0 ? totalSatisfaction / ratedCount : 0,
    };
  }

  // ==================== Routing Rules ====================

  async getRoutingRules(isActive?: boolean): Promise<RoutingRule[]> {
    let query = db
      .select()
      .from(routingRules)
      .orderBy(asc(routingRules.ruleOrder));

    if (isActive !== undefined) {
      return await query.where(eq(routingRules.isActive, isActive));
    }

    return await query;
  }

  async getRoutingRule(ruleId: string): Promise<RoutingRule | undefined> {
    const [rule] = await db
      .select()
      .from(routingRules)
      .where(eq(routingRules.id, ruleId));
    return rule;
  }

  async createRoutingRule(rule: InsertRoutingRule): Promise<RoutingRule> {
    const [newRule] = await db
      .insert(routingRules)
      .values(rule as any)
      .returning();
    return newRule;
  }

  async updateRoutingRule(
    ruleId: string,
    updates: Partial<RoutingRule>
  ): Promise<RoutingRule> {
    const [updatedRule] = await db
      .update(routingRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(routingRules.id, ruleId))
      .returning();
    return updatedRule;
  }

  async deleteRoutingRule(ruleId: string): Promise<void> {
    await db.delete(routingRules).where(eq(routingRules.id, ruleId));
  }

  async applyRoutingRules(ticket: Ticket): Promise<{
    assignedTo?: string;
    priority?: string;
    category?: string;
    tags?: string[];
    appliedRules: string[];
  }> {
    const rules = await this.getRoutingRules(true);
    const appliedRules: string[] = [];
    let result: {
      assignedTo?: string;
      priority?: string;
      category?: string;
      tags?: string[];
    } = {};

    for (const rule of rules) {
      let matches = true;

      // Check conditions
      if (rule.conditions.priority && !rule.conditions.priority.includes(ticket.priority)) {
        matches = false;
      }
      if (rule.conditions.category && !rule.conditions.category.includes(ticket.category)) {
        matches = false;
      }

      if (matches) {
        appliedRules.push(rule.id);

        if (rule.assignTo) {
          result.assignedTo = rule.assignTo;
        }
        if (rule.setPriority) {
          result.priority = rule.setPriority;
        }
        if (rule.setCategory) {
          result.category = rule.setCategory;
        }
        if (rule.addTags) {
          result.tags = [...(result.tags || []), ...rule.addTags];
        }
      }
    }

    return { ...result, appliedRules };
  }

  // ==================== Ticket Routing History ====================

  async getTicketRouting(ticketId: string): Promise<TicketRouting[]> {
    return await db
      .select()
      .from(ticketRouting)
      .where(eq(ticketRouting.ticketId, ticketId))
      .orderBy(desc(ticketRouting.routedAt));
  }

  async createTicketRouting(
    routing: InsertTicketRouting
  ): Promise<TicketRouting> {
    const [newRouting] = await db
      .insert(ticketRouting)
      .values([routing])
      .returning();
    return newRouting;
  }

  async updateTicketRouting(
    routingId: string,
    updates: Partial<TicketRouting>
  ): Promise<TicketRouting | null> {
    const result = await db
      .update(ticketRouting)
      .set(updates)
      .where(eq(ticketRouting.id, routingId))
      .returning();
    return result[0] || null;
  }

  async getAllRoutingsWithOutcomes(
    startDate?: Date,
    endDate?: Date
  ): Promise<TicketRouting[]> {
    const conditions = [];

    if (startDate) {
      conditions.push(gte(ticketRouting.routedAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(ticketRouting.routedAt, endDate));
    }

    const routings = conditions.length > 0
      ? await db.select().from(ticketRouting).where(and(...conditions))
      : await db.select().from(ticketRouting);

    // Filter for routings with outcomes recorded
    return routings.filter((routing) => {
      return (routing.notes || "").includes("outcome");
    });
  }

  async getRoutingMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTickets: number;
    averageConfidence: number;
    routingAccuracy: number;
    averageResolutionTime: number;
    byCategory: Record<string, number>;
    byAgent: Record<string, { count: number; avgTime: number }>;
  }> {
    const conditions = [];

    if (startDate) {
      conditions.push(gte(tickets.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(tickets.createdAt, endDate));
    }

    const filteredTickets = conditions.length > 0
      ? await db.select().from(tickets).where(and(...conditions))
      : await db.select().from(tickets);

    // Group by category
    const byCategory: Record<string, number> = {};
    filteredTickets.forEach((ticket) => {
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;
    });

    // Group by agent
    const byAgent: Record<string, { count: number; avgTime: number }> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    filteredTickets.forEach((ticket) => {
      if (ticket.assignedTo) {
        if (!byAgent[ticket.assignedTo]) {
          byAgent[ticket.assignedTo] = { count: 0, avgTime: 0 };
        }
        byAgent[ticket.assignedTo].count++;
        
        if (ticket.timeToResolution) {
          byAgent[ticket.assignedTo].avgTime = 
            ((byAgent[ticket.assignedTo].avgTime * (byAgent[ticket.assignedTo].count - 1)) + 
             ticket.timeToResolution) / byAgent[ticket.assignedTo].count;
          totalResolutionTime += ticket.timeToResolution;
          resolvedCount++;
        }
      }
    });

    return {
      totalTickets: filteredTickets.length,
      averageConfidence: 0.85, // Placeholder - would calculate from routing data
      routingAccuracy: 0.9, // Placeholder - would calculate from actual feedback
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      byCategory,
      byAgent,
    };
  }

  // ==================== Agent Expertise ====================

  async getAgents(): Promise<AgentExpertise[]> {
    return await db
      .select()
      .from(agentExpertise)
      .orderBy(asc(agentExpertise.agentId));
  }

  async getAgent(agentId: string): Promise<AgentExpertise | undefined> {
    const [agent] = await db
      .select()
      .from(agentExpertise)
      .where(eq(agentExpertise.agentId, agentId));
    return agent;
  }

  async getAvailableAgents(): Promise<AgentExpertise[]> {
    return await db
      .select()
      .from(agentExpertise)
      .where(
        and(
          ne(agentExpertise.availability, "offline"),
          sql`${agentExpertise.currentTicketCount} < ${agentExpertise.maxConcurrentTickets}`
        )
      );
  }

  async getAgentsByExpertise(expertiseArea: string): Promise<AgentExpertise[]> {
    return await db
      .select()
      .from(agentExpertise)
      .where(eq(agentExpertise.expertiseArea, expertiseArea))
      .orderBy(desc(agentExpertise.skillLevel));
  }

  async upsertAgentExpertise(
    agent: InsertAgentExpertise
  ): Promise<AgentExpertise> {
    const existingAgent = await this.getAgent(agent.agentId);

    if (existingAgent) {
      const [updatedAgent] = await db
        .update(agentExpertise)
        .set({
          expertiseArea: agent.expertiseArea,
          skillLevel: agent.skillLevel,
          languages: agent.languages,
          certifications: agent.certifications,
          maxConcurrentTickets: agent.maxConcurrentTickets,
          currentTicketCount: agent.currentTicketCount,
          availability: agent.availability,
          averageResolutionTime: agent.averageResolutionTime,
          satisfactionScore: agent.satisfactionScore,
          updatedAt: new Date(),
        })
        .where(eq(agentExpertise.agentId, agent.agentId))
        .returning();
      return updatedAgent;
    } else {
      const [newAgent] = await db
        .insert(agentExpertise)
        .values(agent)
        .returning();
      return newAgent;
    }
  }

  async updateAgentWorkload(agentId: string, delta: number): Promise<void> {
    const agent = await this.getAgent(agentId);
    if (agent) {
      const newLoad = Math.max(0, (agent.currentTicketCount || 0) + delta);
      const maxCapacity = agent.maxConcurrentTickets || 10;
      
      await db
        .update(agentExpertise)
        .set({
          currentTicketCount: newLoad,
          availability: newLoad >= maxCapacity ? "busy" : "available",
          updatedAt: new Date(),
        })
        .where(eq(agentExpertise.agentId, agentId));
    }
  }

  async updateAgentAvailability(
    agentId: string,
    availability: string
  ): Promise<void> {
    await db
      .update(agentExpertise)
      .set({
        availability,
        updatedAt: new Date(),
      })
      .where(eq(agentExpertise.agentId, agentId));
  }

  async getAgentWorkloadStats(): Promise<
    Array<{
      agentId: string;
      currentLoad: number;
      maxCapacity: number;
      utilization: number;
      avgSatisfactionScore: number;
    }>
  > {
    const agents = await this.getAgents();

    return agents.map((agent) => ({
      agentId: agent.agentId,
      currentLoad: agent.currentTicketCount || 0,
      maxCapacity: agent.maxConcurrentTickets || 10,
      utilization: 
        ((agent.currentTicketCount || 0) / (agent.maxConcurrentTickets || 10)) * 100,
      avgSatisfactionScore: agent.satisfactionScore || 0,
    }));
  }
}

// Export singleton instance for convenience
export const supportStorage = new SupportStorage();

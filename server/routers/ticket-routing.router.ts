/**
 * Ticket Routing API Routes
 * 
 * Provides endpoints for intelligent ticket routing using AI classification
 * and rule-based assignment with workload balancing.
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated, adminOnly } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { Request as ExpressRequest } from "express";
import * as aiRoutingService from "../services/aiRoutingService";

const router = Router();

// Request validation schemas
const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional().default("other"),
  priority: z.string().optional().default("medium"),
  submittedBy: z.string().min(1, "Submitter is required"),
  metadata: z.record(z.any()).optional(),
});

const updateTicketSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
});

const createRoutingRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  condition: z.object({
    keywords: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    priorities: z.array(z.string()).optional(),
    patterns: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    products: z.array(z.string()).optional(),
  }),
  assigned_to: z.string().min(1, "Assignment target is required"),
  priority: z.number().optional().default(100),
  isActive: z.boolean().optional().default(true),
  confidence_threshold: z.number().min(0).max(1).optional().default(0.7),
  metadata: z.object({
    description: z.string().optional(),
    escalation_path: z.array(z.string()).optional(),
    sla_minutes: z.number().optional(),
    auto_escalate: z.boolean().optional(),
  }).optional(),
});

const createAgentSchema = z.object({
  agent_id: z.string().min(1, "Agent ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional(),
  skills: z.array(z.object({
    skill: z.string(),
    level: z.number().min(1).max(5),
    categories: z.array(z.string()),
  })).optional().default([]),
  availability: z.enum(["available", "busy", "offline"]).optional().default("available"),
  max_capacity: z.number().min(1).optional().default(10),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional().default(["English"]),
  timezone: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const escalateTicketSchema = z.object({
  reason: z.string().min(1, "Escalation reason is required"),
  targetLevel: z.string().optional(),
});

/**
 * POST /api/routing/tickets
 * Create a new support ticket
 */
router.post(
  "/tickets",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const validation = createTicketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    try {
      const ticket = await storage.createTicket(validation.data);
      res.json({
        success: true,
        ticket,
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({
        error: "Failed to create ticket",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/routing/tickets
 * Get all tickets with optional filters
 */
router.get(
  "/tickets",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        assignedTo: req.query.assignedTo as string,
        priority: req.query.priority as string,
        category: req.query.category as string,
      };

      const tickets = await storage.getTickets(filters);
      res.json({
        success: true,
        tickets,
        total: tickets.length,
      });
    } catch (error) {
      console.error("Error getting tickets:", error);
      res.status(500).json({
        error: "Failed to get tickets",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/routing/tickets/:id
 * Get a single ticket by ID
 */
router.get(
  "/tickets/:id",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({
          error: "Ticket not found",
        });
      }

      // Get routing history
      const routingHistory = await storage.getTicketRouting(req.params.id);

      res.json({
        success: true,
        ticket,
        routingHistory,
      });
    } catch (error) {
      console.error("Error getting ticket:", error);
      res.status(500).json({
        error: "Failed to get ticket",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * PUT /api/routing/tickets/:id
 * Update a ticket
 */
router.put(
  "/tickets/:id",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const validation = updateTicketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    try {
      const updatedTicket = await storage.updateTicket(req.params.id, validation.data);
      res.json({
        success: true,
        ticket: updatedTicket,
      });
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({
        error: "Failed to update ticket",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/routing/assign/:ticketId
 * Automatically assign a ticket using AI
 */
router.post(
  "/assign/:ticketId",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const result = await aiRoutingService.routeTicket(req.params.ticketId);
      
      if (!result.success) {
        return res.status(500).json({
          error: "Routing failed",
          message: result.reasoning,
        });
      }

      res.json({
        success: true,
        assignment: result.assignment,
        confidence: result.confidence,
        method: result.method,
        reasoning: result.reasoning,
      });
    } catch (error) {
      console.error("Error routing ticket:", error);
      res.status(500).json({
        error: "Failed to route ticket",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/routing/suggest/:ticketId
 * Get routing suggestions for a ticket
 */
router.get(
  "/suggest/:ticketId",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const suggestions = await aiRoutingService.suggestRoutings(req.params.ticketId);
      
      res.json({
        success: true,
        suggestions,
      });
    } catch (error) {
      console.error("Error suggesting routings:", error);
      res.status(500).json({
        error: "Failed to suggest routings",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/routing/escalate/:ticketId
 * Escalate a ticket to a higher tier
 */
router.post(
  "/escalate/:ticketId",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const validation = escalateTicketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    try {
      const success = await aiRoutingService.escalateTicket(
        req.params.ticketId,
        validation.data.reason,
        validation.data.targetLevel
      );
      
      if (!success) {
        return res.status(500).json({
          error: "Escalation failed",
        });
      }

      res.json({
        success: true,
        message: "Ticket escalated successfully",
      });
    } catch (error) {
      console.error("Error escalating ticket:", error);
      res.status(500).json({
        error: "Failed to escalate ticket",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/routing/rules
 * Get all routing rules
 */
router.get(
  "/rules",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const isActive = req.query.active === "true" ? true : 
                       req.query.active === "false" ? false : undefined;
      
      const rules = await storage.getRoutingRules(isActive);
      
      res.json({
        success: true,
        rules,
        total: rules.length,
      });
    } catch (error) {
      console.error("Error getting routing rules:", error);
      res.status(500).json({
        error: "Failed to get routing rules",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/routing/rules
 * Create a new routing rule
 */
router.post(
  "/rules",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const validation = createRoutingRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    try {
      const rule = await storage.createRoutingRule(validation.data);
      res.json({
        success: true,
        rule,
      });
    } catch (error) {
      console.error("Error creating routing rule:", error);
      res.status(500).json({
        error: "Failed to create routing rule",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * PUT /api/routing/rules/:id
 * Update a routing rule
 */
router.put(
  "/rules/:id",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const updatedRule = await storage.updateRoutingRule(req.params.id, req.body);
      res.json({
        success: true,
        rule: updatedRule,
      });
    } catch (error) {
      console.error("Error updating routing rule:", error);
      res.status(500).json({
        error: "Failed to update routing rule",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * DELETE /api/routing/rules/:id
 * Delete a routing rule
 */
router.delete(
  "/rules/:id",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      await storage.deleteRoutingRule(req.params.id);
      res.json({
        success: true,
        message: "Rule deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting routing rule:", error);
      res.status(500).json({
        error: "Failed to delete routing rule",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/routing/agents
 * Get all agents
 */
router.get(
  "/agents",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const agents = await storage.getAgents();
      
      res.json({
        success: true,
        agents,
        total: agents.length,
      });
    } catch (error) {
      console.error("Error getting agents:", error);
      res.status(500).json({
        error: "Failed to get agents",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/routing/agents/available
 * Get available agents (not at max capacity)
 */
router.get(
  "/agents/available",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const agents = await storage.getAvailableAgents();
      
      res.json({
        success: true,
        agents,
        total: agents.length,
      });
    } catch (error) {
      console.error("Error getting available agents:", error);
      res.status(500).json({
        error: "Failed to get available agents",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/routing/agents
 * Create or update agent expertise
 */
router.post(
  "/agents",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const validation = createAgentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    try {
      const agent = await storage.upsertAgentExpertise(validation.data);
      res.json({
        success: true,
        agent,
      });
    } catch (error) {
      console.error("Error creating/updating agent:", error);
      res.status(500).json({
        error: "Failed to create/update agent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/routing/performance
 * Get routing performance metrics
 */
router.get(
  "/performance",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const metrics = await storage.getRoutingMetrics(startDate, endDate);
      
      // Get accuracy metrics using the AI routing service
      const accuracyMetrics = await aiRoutingService.calculateRoutingAccuracy(startDate, endDate);
      
      // Combine metrics
      const combinedMetrics = {
        ...metrics,
        accuracy: {
          overall: accuracyMetrics.overall_accuracy,
          technical: accuracyMetrics.technical_accuracy,
          billing: accuracyMetrics.billing_accuracy,
          byMethod: accuracyMetrics.by_method,
          totalWithOutcomes: accuracyMetrics.total_routings,
          correctRoutings: accuracyMetrics.correct_routings
        }
      };
      
      res.json({
        success: true,
        metrics: combinedMetrics,
      });
    } catch (error) {
      console.error("Error getting routing metrics:", error);
      res.status(500).json({
        error: "Failed to get routing metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/routing/outcome/:ticketId
 * Record the outcome of a ticket routing for accuracy tracking
 */
router.post(
  "/outcome/:ticketId",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const { wasCorrect, actualTeam, notes } = req.body;
    
    try {
      await aiRoutingService.recordRoutingOutcome(
        req.params.ticketId,
        wasCorrect,
        actualTeam,
        notes
      );
      
      res.json({
        success: true,
        message: "Routing outcome recorded successfully",
      });
    } catch (error) {
      console.error("Error recording routing outcome:", error);
      res.status(500).json({
        error: "Failed to record routing outcome",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

export default router;
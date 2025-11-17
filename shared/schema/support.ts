/**
 * Support & Ticketing Schema
 * 
 * Tables for user feedback, support tickets, and customer service management.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Ticket metadata structure
 */
export interface TicketMetadata {
  browser?: string;
  os?: string;
  appVersion?: string;
  attachments?: Array<{
    url: string;
    type: string;
    size: number;
  }>;
  relatedTickets?: string[];
  customFields?: Record<string, any>;
}

/**
 * Routing rule conditions
 */
export interface RoutingConditions {
  priority?: string[];
  category?: string[];
  keywords?: string[];
  customerType?: string[];
  language?: string[];
  [key: string]: any;
}

// ==================== Tables ====================

/**
 * User Feedback Table
 * 
 * General feedback and feature requests from users.
 */
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(), // 'bug', 'feature', 'complaint', 'praise'
  category: text("category"), // 'ui', 'performance', 'functionality', 'content'
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default('new'), // 'new', 'in-review', 'planned', 'completed', 'dismissed'
  priority: text("priority"), // 'low', 'medium', 'high', 'urgent'
  sentiment: real("sentiment"), // -1 to 1 sentiment score
  rating: integer("rating"), // 1-5 star rating
  userEmail: text("user_email"),
  userAgent: text("user_agent"),
  pageUrl: text("page_url"),
  isPublic: boolean("is_public").notNull().default(false),
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  respondedBy: varchar("responded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_feedback_user_id_idx").on(table.userId),
  index("user_feedback_type_idx").on(table.type),
  index("user_feedback_status_idx").on(table.status),
  index("user_feedback_created_at_idx").on(table.createdAt),
]);

/**
 * Support Tickets Table
 * 
 * Formal support requests requiring tracking and resolution.
 */
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: text("ticket_number").notNull().unique(), // Human-readable ticket ID
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'technical', 'billing', 'account', 'general'
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
  status: text("status").notNull().default('open'), // 'open', 'assigned', 'in-progress', 'resolved', 'closed'
  assignedTo: varchar("assigned_to"),
  metadata: jsonb("metadata").$type<TicketMetadata>(),
  resolutionNotes: text("resolution_notes"),
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  timeToResolution: integer("time_to_resolution"), // hours
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
}, (table) => [
  index("tickets_user_id_idx").on(table.userId),
  index("tickets_status_idx").on(table.status),
  index("tickets_priority_idx").on(table.priority),
  index("tickets_assigned_to_idx").on(table.assignedTo),
  index("tickets_created_at_idx").on(table.createdAt),
]);

/**
 * Routing Rules Table
 * 
 * Automated ticket routing rules based on conditions.
 */
export const routingRules = pgTable("routing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: text("rule_name").notNull(),
  ruleOrder: integer("rule_order").notNull().default(0),
  conditions: jsonb("conditions").$type<RoutingConditions>().notNull(),
  assignTo: varchar("assign_to"), // User ID or team ID
  assignToTeam: text("assign_to_team"),
  setPriority: text("set_priority"),
  setCategory: text("set_category"),
  addTags: jsonb("add_tags").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("routing_rules_rule_order_idx").on(table.ruleOrder),
  index("routing_rules_is_active_idx").on(table.isActive),
]);

/**
 * Ticket Routing History Table
 * 
 * Tracks how tickets were routed and reassigned.
 */
export const ticketRouting = pgTable("ticket_routing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  fromAssignee: varchar("from_assignee"),
  toAssignee: varchar("to_assignee"),
  routingReason: text("routing_reason"), // 'manual', 'rule', 'escalation', 'workload'
  ruleId: varchar("rule_id").references(() => routingRules.id, { onDelete: "set null" }),
  notes: text("notes"),
  routedAt: timestamp("routed_at").defaultNow(),
}, (table) => [
  index("ticket_routing_ticket_id_idx").on(table.ticketId),
  index("ticket_routing_routed_at_idx").on(table.routedAt),
]);

/**
 * Agent Expertise Table
 * 
 * Support agent skills and expertise for intelligent routing.
 */
export const agentExpertise = pgTable("agent_expertise", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(), // References staff/agent user ID
  expertiseArea: text("expertise_area").notNull(), // 'technical', 'billing', 'product'
  skillLevel: integer("skill_level").notNull(), // 1-10
  languages: jsonb("languages").$type<string[]>(),
  certifications: jsonb("certifications").$type<string[]>(),
  maxConcurrentTickets: integer("max_concurrent_tickets").default(10),
  currentTicketCount: integer("current_ticket_count").default(0),
  availability: text("availability"), // 'available', 'busy', 'away', 'offline'
  averageResolutionTime: integer("average_resolution_time"), // hours
  satisfactionScore: real("satisfaction_score"), // Average rating
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("agent_expertise_agent_id_idx").on(table.agentId),
  index("agent_expertise_expertise_area_idx").on(table.expertiseArea),
  index("agent_expertise_availability_idx").on(table.availability),
]);

// ==================== Zod Schemas & Type Exports ====================

export const feedbackTypeSchema = z.enum(['bug', 'feature', 'complaint', 'praise', 'question']);
export const feedbackCategorySchema = z.enum(['ui', 'performance', 'functionality', 'content', 'other']);
export const feedbackStatusSchema = z.enum(['new', 'in-review', 'planned', 'completed', 'dismissed']);
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const ticketCategorySchema = z.enum(['technical', 'billing', 'account', 'general', 'feature-request']);
export const ticketStatusSchema = z.enum(['open', 'assigned', 'in-progress', 'pending', 'resolved', 'closed']);
export const routingReasonSchema = z.enum(['manual', 'rule', 'escalation', 'workload', 'expertise']);
export const availabilitySchema = z.enum(['available', 'busy', 'away', 'offline']);

export const insertUserFeedbackSchema = createInsertSchema(userFeedback)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    respondedAt: true,
  })
  .extend({
    type: feedbackTypeSchema,
    category: feedbackCategorySchema.optional(),
    status: feedbackStatusSchema.default('new'),
    priority: prioritySchema.optional(),
    rating: z.number().min(1).max(5).optional(),
    sentiment: z.number().min(-1).max(1).optional(),
  });

export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;

export const insertTicketSchema = createInsertSchema(tickets)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    resolvedAt: true,
    closedAt: true,
  })
  .extend({
    ticketNumber: z.string().regex(/^[A-Z]{3}-\d{6}$/), // Format: ABC-123456
    category: ticketCategorySchema,
    priority: prioritySchema.default('medium'),
    status: ticketStatusSchema.default('open'),
    satisfactionRating: z.number().min(1).max(5).optional(),
    timeToResolution: z.number().positive().optional(),
  });

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export const insertRoutingRuleSchema = createInsertSchema(routingRules)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    ruleOrder: z.number().nonnegative().default(0),
    setPriority: prioritySchema.optional(),
    setCategory: ticketCategorySchema.optional(),
    addTags: z.array(z.string()).optional(),
  });

export type InsertRoutingRule = z.infer<typeof insertRoutingRuleSchema>;
export type RoutingRule = typeof routingRules.$inferSelect;

export const insertTicketRoutingSchema = createInsertSchema(ticketRouting)
  .omit({
    id: true,
    routedAt: true,
  })
  .extend({
    routingReason: routingReasonSchema.optional(),
  });

export type InsertTicketRouting = z.infer<typeof insertTicketRoutingSchema>;
export type TicketRouting = typeof ticketRouting.$inferSelect;

export const insertAgentExpertiseSchema = createInsertSchema(agentExpertise)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    skillLevel: z.number().min(1).max(10),
    maxConcurrentTickets: z.number().positive().default(10),
    currentTicketCount: z.number().nonnegative().default(0),
    availability: availabilitySchema.optional(),
    languages: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    satisfactionScore: z.number().min(0).max(5).optional(),
  });

export type InsertAgentExpertise = z.infer<typeof insertAgentExpertiseSchema>;
export type AgentExpertise = typeof agentExpertise.$inferSelect;
/**
 * Natural Language Query Router
 * 
 * Provides API endpoints for converting natural language questions to SQL queries
 * and executing them safely against the database with proper validation.
 * 
 * Base path: /api/v1/natural-query
 * 
 * Features:
 * - Natural language to SQL conversion using OpenAI GPT-4
 * - Safe query execution with validation
 * - Query history tracking
 * 
 * All endpoints require authentication.
 * 
 * @module server/routers/natural-query.router
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { isAuthenticated } from "../middleware/oauth.middleware";
import { convertNaturalLanguageToSQL, executeValidatedQuery } from "../services/openai-query";

const router = Router();

const naturalQuerySchema = z.object({
  naturalQuery: z.string().min(1, "Query is required").max(500, "Query too long"),
});

/**
 * POST /natural
 * Convert natural language to SQL query
 */
router.post("/natural", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { naturalQuery } = naturalQuerySchema.parse(req.body);
    
    const result = await convertNaturalLanguageToSQL(naturalQuery, userId);
    
    const queryLog = await storage.platform.ai.createQueryLog(userId, {
      tableName: result.tablesAccessed?.[0] || 'unknown',
      queryType: result.queryType,
      executionTime: 0
    });
    
    res.json({
      queryId: queryLog.id,
      sql: result.sql,
      explanation: result.explanation,
      confidence: result.confidence,
      queryType: result.queryType,
      tablesAccessed: result.tablesAccessed,
    });
  } catch (error) {
    console.error("Error converting natural language to SQL:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to convert query"
    });
  }
});

const executeQuerySchema = z.object({
  queryId: z.string().uuid("Invalid query ID"),
  sql: z.string().min(1, "SQL query is required"),
});

/**
 * POST /execute
 * Execute a validated SQL query
 */
router.post("/execute", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { queryId, sql } = executeQuerySchema.parse(req.body);
    
    const logs = await storage.platform.ai.getQueryLogs(userId, 100);
    const queryLog = logs.find(log => log.id === queryId);
    
    if (!queryLog) {
      return res.status(404).json({ error: "Query not found" });
    }
    
    const startTime = Date.now();
    try {
      const { results, rowCount } = await executeValidatedQuery(
        sql,
        userId,
        queryLog.queryHash || ''
      );
      const executionTime = Date.now() - startTime;
      
      await storage.platform.ai.updateQueryLog(queryId, {
        rowsAffected: rowCount,
        executionTime
      });
      
      res.json({
        results,
        rowCount,
        executionTime,
      });
    } catch (execError) {
      const executionTime = Date.now() - startTime;
      
      await storage.platform.ai.updateQueryLog(queryId, {
        executionTime
      });
      
      throw execError;
    }
  } catch (error) {
    console.error("Error executing query:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to execute query"
    });
  }
});

/**
 * GET /history
 * Get user's query history
 */
router.get("/history", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = await storage.platform.ai.getQueryLogs(userId, limit);
    res.json(history);
  } catch (error) {
    console.error("Error getting query history:", error);
    res.status(500).json({ error: "Failed to get query history" });
  }
});

/**
 * GET /:id
 * Get a specific query by ID
 */
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const logs = await storage.platform.ai.getQueryLogs(userId, 100);
    const query = logs.find(log => log.id === req.params.id);
    
    if (!query) {
      return res.status(404).json({ error: "Query not found" });
    }
    
    res.json(query);
  } catch (error) {
    console.error("Error getting query:", error);
    res.status(500).json({ error: "Failed to get query" });
  }
});

export default router;

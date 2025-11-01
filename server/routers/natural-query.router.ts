/**
 * Natural Language Query Router
 * 
 * Provides API endpoints for converting natural language questions to SQL queries
 * and executing them safely against the database with proper validation.
 * 
 * Features:
 * - Natural language to SQL conversion using OpenAI GPT-4
 * - Safe query execution with validation
 * - Query history tracking
 * - Saved queries management
 * 
 * All endpoints require authentication.
 * 
 * @module server/routers/natural-query.router
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth.middleware";
import { convertNaturalLanguageToSQL, executeValidatedQuery } from "../services/openai-query";

const router = Router();

// ==================== Natural Language Query Routes ====================

/**
 * POST /api/query/natural
 * Convert natural language to SQL query
 */
const naturalQuerySchema = z.object({
  naturalQuery: z.string().min(1, "Query is required").max(500, "Query too long"),
});

router.post("/natural", isAuthenticated, async (req, res) => {
  try {
    const { naturalQuery } = naturalQuerySchema.parse(req.body);
    
    // Convert natural language to SQL using OpenAI
    const result = await convertNaturalLanguageToSQL(naturalQuery, req.user!.id);
    
    // Log the query (without executing it yet)
    const queryLog = await storage.createQueryLog(req.user!.id, {
      naturalQuery,
      generatedSql: result.sql,
      queryType: result.queryType,
      tablesAccessed: result.tablesAccessed,
      isSuccessful: true,
      metadata: {
        model: "gpt-5",
        confidence: result.confidence,
        explanations: result.explanation,
      },
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
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to convert query"
    });
  }
});

/**
 * POST /api/query/execute
 * Execute a validated SQL query
 */
const executeQuerySchema = z.object({
  queryId: z.string().uuid("Invalid query ID"),
  sql: z.string().min(1, "SQL query is required"),
});

router.post("/execute", isAuthenticated, async (req, res) => {
  try {
    const { queryId, sql } = executeQuerySchema.parse(req.body);
    
    // Get the original query log
    const queryLog = await storage.getQueryLog(req.user!.id, queryId);
    if (!queryLog) {
      return res.status(404).json({ error: "Query not found" });
    }
    
    // Execute the SQL query
    const startTime = Date.now();
    try {
      const { results, rowCount } = await executeValidatedQuery(
        sql,
        req.user!.id,
        queryLog.naturalQuery
      );
      const executionTime = Date.now() - startTime;
      
      // Update the query log with execution results
      await storage.updateQueryLog(queryId, {
        resultCount: rowCount,
        executionTime,
        isSuccessful: true,
      });
      
      res.json({
        results,
        rowCount,
        executionTime,
      });
    } catch (execError) {
      const executionTime = Date.now() - startTime;
      
      // Update the query log with error
      await storage.updateQueryLog(queryId, {
        executionTime,
        isSuccessful: false,
        error: execError instanceof Error ? execError.message : "Unknown error",
      });
      
      throw execError;
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to execute query"
    });
  }
});

/**
 * GET /api/query/history
 * Get user's query history
 */
router.get("/history", isAuthenticated, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = await storage.getQueryLogs(req.user!.id, limit);
    res.json(history);
  } catch (error) {
    console.error("Error getting query history:", error);
    res.status(500).json({ error: "Failed to get query history" });
  }
});

/**
 * GET /api/query/saved
 * Get user's saved queries
 */
router.get("/saved", isAuthenticated, async (req, res) => {
  try {
    const savedQueries = await storage.getSavedQueries(req.user!.id);
    res.json(savedQueries);
  } catch (error) {
    console.error("Error getting saved queries:", error);
    res.status(500).json({ error: "Failed to get saved queries" });
  }
});

/**
 * POST /api/query/save
 * Save a query for future use
 */
const saveQuerySchema = z.object({
  queryId: z.string().uuid("Invalid query ID"),
  savedName: z.string().min(1, "Name is required").max(255, "Name too long"),
});

router.post("/save", isAuthenticated, async (req, res) => {
  try {
    const { queryId, savedName } = saveQuerySchema.parse(req.body);
    
    const savedQuery = await storage.saveQuery(req.user!.id, queryId, savedName);
    res.json(savedQuery);
  } catch (error) {
    console.error("Error saving query:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to save query"
    });
  }
});

/**
 * GET /api/query/:id
 * Get a specific query by ID
 */
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const query = await storage.getQueryLog(req.user!.id, req.params.id);
    if (!query) {
      return res.status(404).json({ error: "Query not found" });
    }
    res.json(query);
  } catch (error) {
    console.error("Error getting query:", error);
    res.status(500).json({ error: "Failed to get query" });
  }
});

/**
 * DELETE /api/query/:id
 * Delete a saved query
 */
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const query = await storage.getQueryLog(req.user!.id, req.params.id);
    if (!query) {
      return res.status(404).json({ error: "Query not found" });
    }
    
    // Only allow deleting saved queries
    if (!query.isSaved) {
      return res.status(403).json({ error: "Cannot delete unsaved queries" });
    }
    
    // Update to mark as unsaved rather than actually deleting
    await storage.updateQueryLog(req.params.id, {
      isSaved: false,
      savedName: null,
    });
    
    res.json({ message: "Query removed from saved list" });
  } catch (error) {
    console.error("Error deleting query:", error);
    res.status(500).json({ error: "Failed to delete query" });
  }
});

export default router;
/**
 * AI Metrics Router
 * 
 * API endpoints for monitoring AI service metrics and errors
 */

import { Router, Request, Response } from 'express';
import { isAuthenticated, adminOnly } from '../middleware/auth.middleware';
import { getCircuitBreaker } from '../utils/circuit-breaker';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { subHours } from 'date-fns';
import { apiUsageLogs } from '@shared/schema';

const router = Router();

// Get circuit breaker instances (shared with other routers)
const chatCircuitBreaker = getCircuitBreaker('openai-chat-standard');
const recipeCircuitBreaker = getCircuitBreaker('openai-recipe-generation');

// In-memory error log for real-time monitoring
interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  code: string;
  message: string;
  endpoint: string;
  retryable: boolean;
  resolved: boolean;
  retryCount: number;
}

// Store recent errors in memory (with max size limit)
const recentErrors: ErrorLogEntry[] = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Log an AI error for monitoring
 */
export function logAIError(
  userId: string,
  endpoint: string,
  error: any,
  resolved = false,
  retryCount = 0
) {
  const entry: ErrorLogEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    code: error.code || 'UNKNOWN',
    message: error.message || 'Unknown error',
    endpoint,
    retryable: error.retryable ?? false,
    resolved,
    retryCount
  };

  // Add to recent errors (FIFO)
  recentErrors.unshift(entry);
  if (recentErrors.length > MAX_ERROR_LOG_SIZE) {
    recentErrors.pop();
  }
}

/**
 * GET /admin/ai-metrics
 * 
 * Get comprehensive AI service metrics
 * Requires admin authentication
 */
router.get('/admin/ai-metrics', isAuthenticated, adminOnly, async (req: any, res: Response) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    // Calculate time window
    const hoursAgo = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1;
    const since = subHours(new Date(), hoursAgo);

    // Get API usage metrics from database
    const metrics = await db
      .select({
        totalRequests: sql<number>`COUNT(*)`,
        successfulRequests: sql<number>`COUNT(*) FILTER (WHERE success = true)`,
        failedRequests: sql<number>`COUNT(*) FILTER (WHERE success = false)`,
        avgResponseTime: sql<number>`AVG(response_time_ms)`,
      })
      .from(apiUsageLogs)
      .where(sql`api_name = 'openai' AND timestamp >= ${since.toISOString()}`)
      .execute();

    const metricsData = metrics[0] || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0
    };

    // Calculate success rate
    const successRate = metricsData.totalRequests > 0
      ? (metricsData.successfulRequests / metricsData.totalRequests) * 100
      : 100;

    // Get error distribution
    const errorsByCode: Record<string, number> = {};
    const recentErrorsInTimeRange = recentErrors.filter(
      err => err.timestamp >= since
    );
    
    recentErrorsInTimeRange.forEach(error => {
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    });

    // Get circuit breaker status for both services
    const chatStats = chatCircuitBreaker.getStats();
    const recipeStats = recipeCircuitBreaker.getStats();
    
    // Provide comprehensive circuit breaker status
    const circuitBreakerStatus = {
      // Primary circuit breaker (chat) for compatibility
      state: chatStats.state,
      failures: chatStats.failures,
      successCount: chatStats.successes,
      lastFailureTime: chatStats.lastFailureTime ? new Date(chatStats.lastFailureTime) : undefined,
      nextAttemptTime: chatStats.state === 'open' && chatStats.lastFailureTime
        ? new Date(chatStats.lastFailureTime + 60000) // recovery timeout of 60 seconds
        : undefined,
      // Detailed status for both services
      services: {
        chat: {
          state: chatStats.state,
          failures: chatStats.failures,
          successes: chatStats.successes,
          totalRequests: chatStats.totalRequests,
          totalFailures: chatStats.totalFailures,
          totalSuccesses: chatStats.totalSuccesses,
          lastFailureTime: chatStats.lastFailureTime ? new Date(chatStats.lastFailureTime) : undefined
        },
        recipe: {
          state: recipeStats.state,
          failures: recipeStats.failures,
          successes: recipeStats.successes,
          totalRequests: recipeStats.totalRequests,
          totalFailures: recipeStats.totalFailures,
          totalSuccesses: recipeStats.totalSuccesses,
          lastFailureTime: recipeStats.lastFailureTime ? new Date(recipeStats.lastFailureTime) : undefined
        }
      }
    };

    // Return metrics
    res.json({
      totalRequests: Number(metricsData.totalRequests),
      successfulRequests: Number(metricsData.successfulRequests),
      failedRequests: Number(metricsData.failedRequests),
      successRate,
      averageResponseTime: Number(metricsData.avgResponseTime) || 0,
      errorsByCode,
      recentErrors: recentErrorsInTimeRange.slice(0, 50), // Last 50 errors
      circuitBreakerStatus: circuitBreakerStatus.services.chat, // Use chat circuit breaker as primary
      timeRange
    });
  } catch (error) {
    console.error('Error fetching AI metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /admin/ai-errors
 * 
 * Get detailed error logs
 * Requires admin authentication
 */
router.get('/admin/ai-errors', isAuthenticated, adminOnly, async (req: any, res: Response) => {
  try {
    const { limit = 100, offset = 0, code, endpoint } = req.query;
    
    let errors = [...recentErrors];
    
    // Filter by code if specified
    if (code) {
      errors = errors.filter(err => err.code === code);
    }
    
    // Filter by endpoint if specified
    if (endpoint) {
      errors = errors.filter(err => err.endpoint === endpoint);
    }
    
    // Paginate
    const paginatedErrors = errors.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );
    
    res.json({
      errors: paginatedErrors,
      total: errors.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('Error fetching AI errors:', error);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

/**
 * POST /admin/ai-metrics/reset-circuit-breaker
 * 
 * Reset circuit breaker for a service
 * Requires admin authentication
 */
router.post('/admin/ai-metrics/reset-circuit-breaker', isAuthenticated, adminOnly, async (req: any, res: Response) => {
  try {
    const { service } = req.body;
    
    if (service === 'chat' || service === 'all') {
      chatCircuitBreaker.reset();
    }
    
    if (service === 'recipe' || service === 'all') {
      recipeCircuitBreaker.reset();
    }
    
    res.json({ 
      success: true, 
      message: `Circuit breaker${service === 'all' ? 's' : ''} reset successfully` 
    });
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    res.status(500).json({ error: 'Failed to reset circuit breaker' });
  }
});

/**
 * GET /admin/ai-metrics/health
 * 
 * Health check endpoint for monitoring
 */
router.get('/admin/ai-metrics/health', async (req: Request, res: Response) => {
  try {
    const chatState = chatCircuitBreaker.getState();
    const recipeState = recipeCircuitBreaker.getState();
    
    // Consider unhealthy if any circuit is open
    const isHealthy = chatState !== 'open' && recipeState !== 'open';
    
    res.status(isHealthy ? 200 : 503).json({
      healthy: isHealthy,
      services: {
        chat: {
          state: chatState,
          healthy: chatState !== 'open'
        },
        recipe: {
          state: recipeState,
          healthy: recipeState !== 'open'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ 
      healthy: false, 
      error: 'Failed to check health' 
    });
  }
});

export default router;
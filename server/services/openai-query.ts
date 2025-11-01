import OpenAI from "openai";
import { db } from "../db";
import { queryLogs, InsertQueryLog } from "@shared/schema";
import * as schema from "@shared/schema";

// Referenced from: blueprint:javascript_openai_ai_integrations
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const MODEL = "gpt-5";

// Get database schema information for context
function getDatabaseSchema(): string {
  const tableNames = Object.keys(schema).filter(key => 
    !key.includes('insert') && 
    !key.includes('Insert') && 
    !key.includes('Schema') &&
    typeof (schema as any)[key] === 'object' &&
    (schema as any)[key]._ &&
    (schema as any)[key]._.name
  );

  const schemaInfo = tableNames.map(tableName => {
    const table = (schema as any)[tableName];
    const columns = Object.keys(table).filter(key => key !== '_' && typeof table[key] === 'object');
    
    return `Table: ${table._.name}
Columns: ${columns.join(', ')}`;
  }).join('\n\n');

  return schemaInfo;
}

// Parse SQL to extract table names
function extractTableNames(sql: string): string[] {
  const tableRegex = /(?:FROM|JOIN|INTO|UPDATE|DELETE FROM)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  const matches = sql.matchAll(tableRegex);
  const tables = new Set<string>();
  
  for (const match of matches) {
    if (match[1]) {
      tables.add(match[1].toLowerCase());
    }
  }
  
  return Array.from(tables);
}

// Detect query type from SQL
function detectQueryType(sql: string): string {
  const trimmedSql = sql.trim().toUpperCase();
  if (trimmedSql.startsWith('SELECT')) return 'SELECT';
  if (trimmedSql.startsWith('INSERT')) return 'INSERT';
  if (trimmedSql.startsWith('UPDATE')) return 'UPDATE';
  if (trimmedSql.startsWith('DELETE')) return 'DELETE';
  return 'SELECT';
}

export interface NaturalQueryResult {
  sql: string;
  explanation: string[];
  confidence: number;
  queryType: string;
  tablesAccessed: string[];
}

/**
 * Convert natural language to SQL using OpenAI
 */
export async function convertNaturalLanguageToSQL(
  naturalQuery: string,
  userId: string
): Promise<NaturalQueryResult> {
  const schemaContext = getDatabaseSchema();
  
  const systemPrompt = `You are a SQL query generator for a PostgreSQL database. Convert natural language questions to SQL queries.

Database Schema:
${schemaContext}

IMPORTANT RULES:
1. Generate ONLY SELECT queries for safety (no INSERT, UPDATE, DELETE unless explicitly requested)
2. Always include proper JOIN conditions when accessing multiple tables
3. Use proper PostgreSQL syntax
4. Include appropriate WHERE clauses to filter by userId when relevant
5. Return results in a useful format with meaningful column aliases
6. For user-specific queries, filter by userId = '${userId}'
7. Handle dates properly using PostgreSQL date functions
8. Use LIMIT clause for potentially large result sets

Response Format (JSON):
{
  "sql": "the SQL query",
  "explanation": ["step by step explanation of the query"],
  "confidence": 0.95,
  "queryType": "SELECT",
  "tablesAccessed": ["table1", "table2"]
}`;

  const userPrompt = `Convert this natural language question to a SQL query:
"${naturalQuery}"

Remember to filter by userId = '${userId}' for user-specific data.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content) as NaturalQueryResult;
    
    // Validate and enhance the result
    if (!result.sql) {
      throw new Error("No SQL query generated");
    }

    // Extract tables if not provided
    if (!result.tablesAccessed || result.tablesAccessed.length === 0) {
      result.tablesAccessed = extractTableNames(result.sql);
    }

    // Detect query type if not provided
    if (!result.queryType) {
      result.queryType = detectQueryType(result.sql);
    }

    // Set default confidence if not provided
    if (typeof result.confidence !== 'number') {
      result.confidence = 0.8;
    }

    return result;
  } catch (error) {
    console.error("Error converting natural language to SQL:", error);
    throw new Error(`Failed to convert query: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute a validated SQL query safely
 */
export async function executeValidatedQuery(
  sql: string,
  userId: string,
  naturalQuery?: string
): Promise<{ results: any[]; executionTime: number; rowCount: number }> {
  // Basic SQL injection prevention - only allow SELECT queries by default
  const trimmedSql = sql.trim().toUpperCase();
  if (!trimmedSql.startsWith('SELECT')) {
    throw new Error("Only SELECT queries are allowed for safety");
  }

  // Additional safety checks
  const dangerousKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE', 'CREATE', 'EXEC', 'EXECUTE'];
  for (const keyword of dangerousKeywords) {
    if (trimmedSql.includes(keyword)) {
      throw new Error(`Query contains forbidden keyword: ${keyword}`);
    }
  }

  const startTime = Date.now();
  
  try {
    // Execute the query
    const results = await db.execute(sql);
    const executionTime = Date.now() - startTime;
    const rowCount = results.rows.length;

    // Log the query execution
    if (naturalQuery) {
      const queryLog: InsertQueryLog = {
        userId,
        naturalQuery,
        generatedSql: sql,
        resultCount: rowCount,
        executionTime,
        isSuccessful: true,
        queryType: detectQueryType(sql),
        tablesAccessed: extractTableNames(sql),
        metadata: {
          model: MODEL,
        }
      };
      
      await db.insert(queryLogs).values(queryLog);
    }

    return {
      results: results.rows,
      executionTime,
      rowCount
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Log failed query
    if (naturalQuery) {
      const queryLog: InsertQueryLog = {
        userId,
        naturalQuery,
        generatedSql: sql,
        resultCount: 0,
        executionTime,
        isSuccessful: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryType: detectQueryType(sql),
        tablesAccessed: extractTableNames(sql),
        metadata: {
          model: MODEL,
        }
      };
      
      await db.insert(queryLogs).values(queryLog);
    }

    throw error;
  }
}

/**
 * Get saved queries for a user
 */
export async function getSavedQueries(userId: string) {
  const savedQueries = await db
    .select()
    .from(queryLogs)
    .where(eq(queryLogs.userId, userId))
    .where(eq(queryLogs.isSaved, true))
    .orderBy(desc(queryLogs.createdAt));
    
  return savedQueries;
}

/**
 * Save a query for future use
 */
export async function saveQuery(queryId: string, savedName: string, userId: string) {
  await db
    .update(queryLogs)
    .set({
      isSaved: true,
      savedName
    })
    .where(eq(queryLogs.id, queryId))
    .where(eq(queryLogs.userId, userId));
}

// Import necessary functions for queries
import { eq, desc } from "drizzle-orm";
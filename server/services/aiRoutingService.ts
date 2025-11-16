/**
 * AI Routing Service
 * 
 * Intelligent ticket routing using OpenAI GPT for classification and assignment.
 * Analyzes ticket content to determine the best team/agent assignment.
 * 
 * This is using Replit AI Integrations for OpenAI access (from blueprint:javascript_openai_ai_integrations)
 */

import OpenAI from 'openai';
import { storage } from '../storage';
import type { 
  Ticket, 
  RoutingRule, 
  AgentExpertise, 
  InsertTicketRouting 
} from '@shared/schema';

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const hasAICredentials = !!(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY);

if (!hasAICredentials) {
  console.warn("AI credentials not configured. System will use enhanced rule-based routing with pattern matching.");
}

const openai = hasAICredentials ? new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
}) : null;

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const AI_MODEL = "gpt-5";

export interface RoutingDecision {
  recommendedAssignment: string;
  confidence: number;
  reasoning: string;
  detectedCategory: string;
  detectedUrgency: string;
  keyPhrases: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  technicalIndicators: string[];
  suggestedPriority: string;
}

export interface RoutingSuggestion {
  agentId: string;
  agentName: string;
  confidence: number;
  reasoning: string;
  workloadScore: number;
  skillMatch: number;
}

/**
 * Analyzes ticket content using AI to determine routing
 */
/**
 * Enhanced rule-based analysis for when AI is not available
 */
function enhancedRuleBasedAnalysis(ticket: Ticket): RoutingDecision {
  const title = ticket.title.toLowerCase();
  const description = ticket.description.toLowerCase();
  const combined = `${title} ${description}`;
  
  // Technical indicators
  const technicalKeywords = ['api', 'error', 'bug', 'crash', 'database', 'server', 'authentication', 
                            'login', 'password', '500', '404', 'timeout', 'connection', 'ssl', 'certificate'];
  const billingKeywords = ['payment', 'billing', 'invoice', 'refund', 'charge', 'subscription', 
                          'credit', 'plan', 'pricing', 'cost', 'fee'];
  const featureKeywords = ['feature', 'request', 'enhancement', 'add', 'implement', 'need', 'want'];
  
  const technicalMatches = technicalKeywords.filter(kw => combined.includes(kw));
  const billingMatches = billingKeywords.filter(kw => combined.includes(kw));
  const featureMatches = featureKeywords.filter(kw => combined.includes(kw));
  
  let recommendedAssignment = 'support-team';
  let detectedCategory = ticket.category || 'other';
  let confidence = 0.5;
  let reasoning = 'Rule-based analysis';
  
  // Determine assignment based on keyword matches
  if (billingMatches.length > technicalMatches.length && billingMatches.length >= 2) {
    recommendedAssignment = 'finance-team';
    detectedCategory = 'billing';
    confidence = Math.min(0.9, 0.5 + billingMatches.length * 0.1);
    reasoning = `Detected billing-related keywords: ${billingMatches.join(', ')}`;
  } else if (technicalMatches.length >= 2) {
    recommendedAssignment = 'backend-team';
    detectedCategory = 'technical';
    confidence = Math.min(0.9, 0.5 + technicalMatches.length * 0.1);
    reasoning = `Detected technical keywords: ${technicalMatches.join(', ')}`;
  } else if (featureMatches.length >= 1) {
    recommendedAssignment = 'product-team';
    detectedCategory = 'feature';
    confidence = Math.min(0.8, 0.5 + featureMatches.length * 0.15);
    reasoning = `Detected feature request keywords: ${featureMatches.join(', ')}`;
  }
  
  // Detect urgency based on priority and keywords
  const urgencyKeywords = ['urgent', 'critical', 'asap', 'immediately', 'emergency', 'down', 'broken'];
  const hasUrgency = urgencyKeywords.some(kw => combined.includes(kw));
  const detectedUrgency = hasUrgency || ticket.priority === 'critical' ? 'critical' :
                          ticket.priority === 'high' ? 'high' : 'medium';
  
  // Simple sentiment detection
  const negativeWords = ['frustrated', 'angry', 'disappointed', 'upset', 'terrible', 'horrible', 'worst'];
  const positiveWords = ['thank', 'appreciate', 'great', 'excellent', 'good', 'love'];
  const negativeCount = negativeWords.filter(w => combined.includes(w)).length;
  const positiveCount = positiveWords.filter(w => combined.includes(w)).length;
  const sentiment = negativeCount > positiveCount ? 'negative' :
                   positiveCount > negativeCount ? 'positive' : 'neutral';
  
  return {
    recommendedAssignment,
    confidence,
    reasoning,
    detectedCategory,
    detectedUrgency,
    keyPhrases: [...technicalMatches, ...billingMatches, ...featureMatches],
    sentiment,
    technicalIndicators: technicalMatches,
    suggestedPriority: detectedUrgency === 'critical' ? 'high' : ticket.priority
  };
}

export async function analyzeTicket(ticket: Ticket): Promise<RoutingDecision> {
  // If AI is not available, use enhanced rule-based analysis
  if (!openai) {
    return enhancedRuleBasedAnalysis(ticket);
  }
  
  try {
    const prompt = `Analyze this support ticket and provide routing recommendations.

Ticket Information:
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
Submitted By: ${ticket.submittedBy}

Analyze the ticket and provide a JSON response with:
1. detectedCategory: The most appropriate category (technical/billing/feature/bug/other)
2. detectedUrgency: The urgency level (low/medium/high/critical)
3. keyPhrases: Array of important keywords/phrases that indicate the issue type
4. sentiment: Customer sentiment (positive/neutral/negative)
5. technicalIndicators: Array of technical terms/technologies mentioned (e.g., "API", "database", "authentication", "payment", etc.)
6. suggestedPriority: Recommended priority based on content (low/medium/high/urgent)
7. recommendedTeam: Which team should handle this (backend/frontend/billing/support/devops)
8. reasoning: Brief explanation of why this routing is recommended
9. confidence: Confidence score from 0.0 to 1.0

Focus on identifying:
- Technical issues (API errors, database problems, authentication issues)
- Billing/payment concerns
- Feature requests vs bug reports
- Customer frustration level
- Security or data concerns

Provide response as valid JSON.`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert support ticket classifier. Analyze tickets to determine the best routing and provide structured analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const analysis = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    // Map team to actual assignment
    const teamMapping: Record<string, string> = {
      'backend': 'backend-team',
      'frontend': 'frontend-team',
      'billing': 'finance-team',
      'support': 'support-team',
      'devops': 'ops-team'
    };
    
    return {
      recommendedAssignment: teamMapping[analysis.recommendedTeam] || 'support-team',
      confidence: analysis.confidence || 0.7,
      reasoning: analysis.reasoning || 'AI analysis completed',
      detectedCategory: analysis.detectedCategory || ticket.category,
      detectedUrgency: analysis.detectedUrgency || 'medium',
      keyPhrases: analysis.keyPhrases || [],
      sentiment: analysis.sentiment || 'neutral',
      technicalIndicators: analysis.technicalIndicators || [],
      suggestedPriority: analysis.suggestedPriority || ticket.priority
    };
  } catch (error) {
    console.error('Error analyzing ticket with AI:', error);
    // Return default routing on error
    return {
      recommendedAssignment: 'support-team',
      confidence: 0.3,
      reasoning: 'AI analysis failed, defaulting to support team',
      detectedCategory: ticket.category,
      detectedUrgency: 'medium',
      keyPhrases: [],
      sentiment: 'neutral',
      technicalIndicators: [],
      suggestedPriority: ticket.priority
    };
  }
}

/**
 * Evaluates routing rules against a ticket
 */
export async function evaluateRoutingRules(
  ticket: Ticket,
  aiAnalysis: RoutingDecision
): Promise<{ rule: RoutingRule | null; confidence: number }> {
  try {
    // Get active routing rules sorted by priority
    const rules = await storage.getRoutingRules(true);
    
    for (const rule of rules) {
      let matchScore = 0;
      let maxScore = 0;
      
      const conditions = rule.condition as any;
      
      // Check keyword matches
      if (conditions.keywords && conditions.keywords.length > 0) {
        maxScore += conditions.keywords.length;
        const ticketText = `${ticket.title} ${ticket.description}`.toLowerCase();
        
        for (const keyword of conditions.keywords) {
          if (ticketText.includes(keyword.toLowerCase())) {
            matchScore++;
          }
        }
      }
      
      // Check category match
      if (conditions.categories && conditions.categories.length > 0) {
        maxScore += 2;
        if (conditions.categories.includes(ticket.category) || 
            conditions.categories.includes(aiAnalysis.detectedCategory)) {
          matchScore += 2;
        }
      }
      
      // Check priority match
      if (conditions.priorities && conditions.priorities.length > 0) {
        maxScore += 1;
        if (conditions.priorities.includes(ticket.priority) ||
            conditions.priorities.includes(aiAnalysis.suggestedPriority)) {
          matchScore += 1;
        }
      }
      
      // Check pattern matches (regex)
      if (conditions.patterns && conditions.patterns.length > 0) {
        maxScore += conditions.patterns.length * 2;
        const ticketText = `${ticket.title} ${ticket.description}`;
        
        for (const pattern of conditions.patterns) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(ticketText)) {
              matchScore += 2;
            }
          } catch (e) {
            console.error(`Invalid regex pattern: ${pattern}`);
          }
        }
      }
      
      // Calculate confidence based on match percentage
      const confidence = maxScore > 0 ? matchScore / maxScore : 0;
      
      // Check if this rule meets the confidence threshold
      if (confidence >= rule.confidence_threshold) {
        return { rule, confidence };
      }
    }
    
    return { rule: null, confidence: 0 };
  } catch (error) {
    console.error('Error evaluating routing rules:', error);
    return { rule: null, confidence: 0 };
  }
}

/**
 * Finds the best available agent based on skills and workload
 */
export async function findBestAgent(
  ticket: Ticket,
  aiAnalysis: RoutingDecision,
  teamId?: string
): Promise<RoutingSuggestion | null> {
  try {
    // Get all available agents
    const agents = await storage.getAvailableAgents();
    
    // Filter by team if specified
    let candidateAgents = agents;
    if (teamId) {
      candidateAgents = agents.filter(agent => {
        const metadata = agent.metadata as any;
        return agent.agent_id === teamId || 
               metadata?.team === teamId ||
               metadata?.department === teamId;
      });
    }
    
    if (candidateAgents.length === 0) {
      return null;
    }
    
    // Score each agent
    const scoredAgents = candidateAgents.map(agent => {
      let skillScore = 0;
      let maxSkillScore = 0;
      
      // Check skill matches
      const agentSkills = agent.skills as any[];
      if (agentSkills && agentSkills.length > 0) {
        for (const skill of agentSkills) {
          maxSkillScore += skill.level || 1;
          
          // Check if skill matches technical indicators
          const skillName = skill.skill.toLowerCase();
          for (const indicator of aiAnalysis.technicalIndicators) {
            if (skillName.includes(indicator.toLowerCase()) || 
                indicator.toLowerCase().includes(skillName)) {
              skillScore += skill.level || 1;
            }
          }
          
          // Check if skill matches category
          if (skill.categories && skill.categories.includes(aiAnalysis.detectedCategory)) {
            skillScore += (skill.level || 1) * 0.5;
          }
        }
      }
      
      // Calculate workload score (inverse of load percentage)
      const loadPercentage = agent.current_load / agent.max_capacity;
      const workloadScore = 1 - loadPercentage;
      
      // Calculate skill match score
      const skillMatch = maxSkillScore > 0 ? skillScore / maxSkillScore : 0;
      
      // Calculate overall score (weighted combination)
      const overallScore = (skillMatch * 0.7) + (workloadScore * 0.3);
      
      return {
        agent,
        skillMatch,
        workloadScore,
        overallScore
      };
    });
    
    // Sort by overall score and get the best match
    scoredAgents.sort((a, b) => b.overallScore - a.overallScore);
    const bestMatch = scoredAgents[0];
    
    if (!bestMatch || bestMatch.overallScore < 0.3) {
      return null;
    }
    
    return {
      agentId: bestMatch.agent.agent_id,
      agentName: bestMatch.agent.name,
      confidence: bestMatch.overallScore,
      reasoning: `Agent has ${Math.round(bestMatch.skillMatch * 100)}% skill match and ${Math.round(bestMatch.workloadScore * 100)}% availability`,
      workloadScore: bestMatch.workloadScore,
      skillMatch: bestMatch.skillMatch
    };
  } catch (error) {
    console.error('Error finding best agent:', error);
    return null;
  }
}

/**
 * Main routing function that combines all strategies
 */
export async function routeTicket(ticketId: string): Promise<{
  success: boolean;
  assignment: string;
  confidence: number;
  method: 'rule' | 'ai' | 'fallback';
  reasoning: string;
}> {
  try {
    // Get the ticket
    const ticket = await storage.getTicket(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }
    
    // Analyze with AI
    const aiAnalysis = await analyzeTicket(ticket);
    
    // Try rule-based routing first
    const { rule, confidence: ruleConfidence } = await evaluateRoutingRules(ticket, aiAnalysis);
    
    if (rule && ruleConfidence >= 0.8) {
      // High confidence rule match - still apply workload balancing
      const agentSuggestion = await findBestAgent(ticket, aiAnalysis, rule.assigned_to);
      
      // Use the best available agent from the team/department specified by the rule
      const finalAssignment = agentSuggestion && agentSuggestion.confidence >= 0.4 
        ? agentSuggestion.agentId 
        : rule.assigned_to;
      
      const finalConfidence = agentSuggestion 
        ? (ruleConfidence * 0.7 + agentSuggestion.confidence * 0.3)
        : ruleConfidence;
      
      await storage.createTicketRouting({
        ticket_id: ticketId,
        routed_to: finalAssignment,
        routing_method: 'rule',
        confidence_score: finalConfidence,
        routing_reason: `Matched rule: ${rule.name}${agentSuggestion ? ` (assigned to ${agentSuggestion.agentName} based on workload)` : ''}`,
        rule_id: rule.id,
        ai_analysis: {
          detected_intent: aiAnalysis.reasoning,
          detected_category: aiAnalysis.detectedCategory,
          detected_urgency: aiAnalysis.detectedUrgency,
          key_phrases: aiAnalysis.keyPhrases,
          sentiment: aiAnalysis.sentiment,
          technical_indicators: aiAnalysis.technicalIndicators
        },
        metadata: {
          
        }
      });
      
      // Update ticket assignment
      await storage.updateTicket(ticketId, {
        assignedTo: finalAssignment,
        status: 'assigned',
        priority: aiAnalysis.suggestedPriority
      });
      
      // Update agent workload if specific agent was selected
      if (agentSuggestion) {
        await storage.updateAgentWorkload(agentSuggestion.agentId, 1);
      }
      
      return {
        success: true,
        assignment: finalAssignment,
        confidence: finalConfidence,
        method: 'rule',
        reasoning: `Matched rule: ${rule.name}${agentSuggestion ? ` (workload balanced)` : ''}`
      };
    }
    
    // Try AI-based routing with agent matching
    const agentSuggestion = await findBestAgent(ticket, aiAnalysis, aiAnalysis.recommendedAssignment);
    
    if (agentSuggestion && agentSuggestion.confidence >= 0.6) {
      // Good agent match found
      await storage.createTicketRouting({
        ticket_id: ticketId,
        routed_to: agentSuggestion.agentId,
        routing_method: 'ai',
        confidence_score: agentSuggestion.confidence,
        routing_reason: agentSuggestion.reasoning,
        ai_analysis: {
          detected_intent: aiAnalysis.reasoning,
          detected_category: aiAnalysis.detectedCategory,
          detected_urgency: aiAnalysis.detectedUrgency,
          key_phrases: aiAnalysis.keyPhrases,
          sentiment: aiAnalysis.sentiment,
          technical_indicators: aiAnalysis.technicalIndicators
        },
        metadata: {
          ai_model: AI_MODEL,
          processing_time_ms: Date.now()
        }
      });
      
      // Update ticket assignment and agent workload
      await storage.updateTicket(ticketId, {
        assignedTo: agentSuggestion.agentId,
        status: 'assigned',
        priority: aiAnalysis.suggestedPriority
      });
      
      await storage.updateAgentWorkload(agentSuggestion.agentId, 1);
      
      return {
        success: true,
        assignment: agentSuggestion.agentId,
        confidence: agentSuggestion.confidence,
        method: 'ai',
        reasoning: agentSuggestion.reasoning
      };
    }
    
    // Fallback to default assignment
    const fallbackAssignment = aiAnalysis.recommendedAssignment || 'support-team';
    
    await storage.createTicketRouting({
      ticket_id: ticketId,
      routed_to: fallbackAssignment,
      routing_method: 'ai',
      confidence_score: aiAnalysis.confidence * 0.5,
      routing_reason: 'Fallback assignment based on AI analysis',
      ai_analysis: {
        detected_intent: aiAnalysis.reasoning,
        detected_category: aiAnalysis.detectedCategory,
        detected_urgency: aiAnalysis.detectedUrgency,
        key_phrases: aiAnalysis.keyPhrases,
        sentiment: aiAnalysis.sentiment,
        technical_indicators: aiAnalysis.technicalIndicators
      },
      metadata: {
        ai_model: AI_MODEL,
        fallback_applied: true
      }
    });
    
    await storage.updateTicket(ticketId, {
      assignedTo: fallbackAssignment,
      status: 'assigned',
      priority: aiAnalysis.suggestedPriority
    });
    
    return {
      success: true,
      assignment: fallbackAssignment,
      confidence: aiAnalysis.confidence * 0.5,
      method: 'ai',
      reasoning: 'Fallback assignment based on AI analysis'
    };
  } catch (error) {
    console.error('Error routing ticket:', error);
    return {
      success: false,
      assignment: 'support-team',
      confidence: 0,
      method: 'fallback',
      reasoning: 'Routing failed, assigned to default support team'
    };
  }
}

/**
 * Suggests multiple routing options for manual review
 */
export async function suggestRoutings(ticketId: string): Promise<RoutingSuggestion[]> {
  try {
    const ticket = await storage.getTicket(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }
    
    // Analyze with AI
    const aiAnalysis = await analyzeTicket(ticket);
    
    // Get all available agents
    const agents = await storage.getAvailableAgents();
    
    // Score each agent
    const suggestions: RoutingSuggestion[] = [];
    
    for (const agent of agents) {
      const suggestion = await findBestAgent(ticket, aiAnalysis, agent.agent_id);
      if (suggestion && suggestion.confidence > 0.3) {
        suggestions.push(suggestion);
      }
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    // Return top 5 suggestions
    return suggestions.slice(0, 5);
  } catch (error) {
    console.error('Error suggesting routings:', error);
    return [];
  }
}

/**
 * Records the outcome of a ticket routing for accuracy tracking
 */
export async function recordRoutingOutcome(
  ticketId: string,
  wasCorrect: boolean,
  actualTeam?: string,
  notes?: string
): Promise<void> {
  try {
    const routing = await storage.getTicketRouting(ticketId);
    if (!routing || routing.length === 0) {
      console.error(`No routing found for ticket ${ticketId}`);
      return;
    }
    
    const latestRouting = routing[0];
    const metadata = latestRouting.metadata as any || {};
    
    // Update routing with outcome
    await storage.updateTicketRouting(latestRouting.id, {
      metadata: {
        ...metadata,
        outcome_recorded: true,
        was_correct: wasCorrect,
        actual_team: actualTeam,
        outcome_notes: notes,
        outcome_timestamp: new Date().toISOString()
      }
    });
    
    // If incorrect, log for improvement
    if (!wasCorrect) {
      console.log(`Routing mismatch for ticket ${ticketId}: routed to ${latestRouting.routed_to}, should have been ${actualTeam}`);
    }
  } catch (error) {
    console.error('Error recording routing outcome:', error);
  }
}

/**
 * Calculates routing accuracy metrics
 */
export async function calculateRoutingAccuracy(
  startDate?: Date,
  endDate?: Date
): Promise<{
  overall_accuracy: number;
  technical_accuracy: number;
  billing_accuracy: number;
  by_method: Record<string, number>;
  total_routings: number;
  correct_routings: number;
}> {
  try {
    // Get all routings with outcomes in the date range
    const routings = await storage.getAllRoutingsWithOutcomes(startDate, endDate);
    
    if (routings.length === 0) {
      return {
        overall_accuracy: 0,
        technical_accuracy: 0,
        billing_accuracy: 0,
        by_method: {},
        total_routings: 0,
        correct_routings: 0
      };
    }
    
    let totalCorrect = 0;
    let technicalCorrect = 0;
    let technicalTotal = 0;
    let billingCorrect = 0;
    let billingTotal = 0;
    const byMethod: Record<string, { correct: number; total: number }> = {};
    
    for (const routing of routings) {
      const metadata = routing.metadata as any;
      const analysis = routing.ai_analysis as any;
      
      if (metadata?.outcome_recorded) {
        const wasCorrect = metadata.was_correct;
        const method = routing.routing_method;
        
        if (wasCorrect) {
          totalCorrect++;
        }
        
        // Track by method
        if (!byMethod[method]) {
          byMethod[method] = { correct: 0, total: 0 };
        }
        byMethod[method].total++;
        if (wasCorrect) {
          byMethod[method].correct++;
        }
        
        // Track technical routing accuracy
        if (analysis?.detected_category === 'technical' || 
            routing.routed_to?.includes('backend') || 
            routing.routed_to?.includes('engineering')) {
          technicalTotal++;
          if (wasCorrect) {
            technicalCorrect++;
          }
        }
        
        // Track billing routing accuracy
        if (analysis?.detected_category === 'billing' || 
            routing.routed_to?.includes('finance') || 
            routing.routed_to?.includes('billing')) {
          billingTotal++;
          if (wasCorrect) {
            billingCorrect++;
          }
        }
      }
    }
    
    // Calculate accuracies
    const overall = routings.length > 0 ? totalCorrect / routings.length : 0;
    const technical = technicalTotal > 0 ? technicalCorrect / technicalTotal : 0;
    const billing = billingTotal > 0 ? billingCorrect / billingTotal : 0;
    
    const methodAccuracy: Record<string, number> = {};
    for (const [method, stats] of Object.entries(byMethod)) {
      methodAccuracy[method] = stats.total > 0 ? stats.correct / stats.total : 0;
    }
    
    return {
      overall_accuracy: overall,
      technical_accuracy: technical,
      billing_accuracy: billing,
      by_method: methodAccuracy,
      total_routings: routings.length,
      correct_routings: totalCorrect
    };
  } catch (error) {
    console.error('Error calculating routing accuracy:', error);
    return {
      overall_accuracy: 0,
      technical_accuracy: 0,
      billing_accuracy: 0,
      by_method: {},
      total_routings: 0,
      correct_routings: 0
    };
  }
}

/**
 * Escalates a ticket to a higher tier
 */
export async function escalateTicket(
  ticketId: string,
  reason: string,
  targetLevel?: string
): Promise<boolean> {
  try {
    const ticket = await storage.getTicket(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }
    
    // Get current routing
    const routingHistory = await storage.getTicketRouting(ticketId);
    const currentRouting = routingHistory[0];
    
    // Determine escalation target
    let escalationTarget = targetLevel || 'escalation-team';
    
    if (currentRouting) {
      // Try to find an escalation path from routing rules
      const rules = await storage.getRoutingRules(true);
      const currentRule = rules.find(r => r.assigned_to === currentRouting.routed_to);
      
      if (currentRule) {
        const metadata = currentRule.metadata as any;
        if (metadata?.escalation_path && metadata.escalation_path.length > 0) {
          escalationTarget = metadata.escalation_path[0];
        }
      }
    }
    
    // Create escalation routing
    await storage.createTicketRouting({
      ticket_id: ticketId,
      routed_to: escalationTarget,
      routed_from: currentRouting?.routed_to,
      routing_method: 'manual',
      confidence_score: 1.0,
      routing_reason: `Escalated: ${reason}`,
      is_escalation: true,
      metadata: {
      }
    });
    
    // Update ticket
    await storage.updateTicket(ticketId, {
      assignedTo: escalationTarget,
      priority: 'high',
      status: 'assigned'
    });
    
    // Update workload
    if (currentRouting?.routed_to) {
      await storage.updateAgentWorkload(currentRouting.routed_to, -1);
    }
    
    return true;
  } catch (error) {
    console.error('Error escalating ticket:', error);
    return false;
  }
}
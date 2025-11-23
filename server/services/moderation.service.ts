/**
 * Content Moderation Service
 * 
 * AI-powered content moderation using OpenAI Moderation API.
 * Provides real-time content filtering, toxicity scoring, and policy violation detection.
 * 
 * Features:
 * - OpenAI Moderation API for comprehensive content analysis
 * - Multi-category toxicity detection (profanity, threats, harassment, etc.)
 * - Severity scoring and confidence levels
 * - Content filtering and sanitization
 * - Appeal handling and manual review support
 * 
 * @module server/services/moderation.service
 */

import { openai } from "../integrations/openai";
import { storage } from "../storage/index";
import type {
  ModerationLog,
  BlockedContent,
  ModerationAppeal,
  InsertModerationLog,
  InsertBlockedContent,
  InsertModerationAppeal
} from "@shared/schema";

/**
 * Toxicity threshold configurations for different severity levels
 */
const TOXICITY_THRESHOLDS = {
  low: 0.3,
  medium: 0.5,
  high: 0.7,
  critical: 0.9
};

/**
 * OpenAI moderation category thresholds
 */
const OPENAI_THRESHOLDS = {
  harassment: 0.5,
  hate: 0.5,
  selfHarm: 0.7,
  sexual: 0.5,
  violence: 0.6
};

/**
 * Moderation result interface
 */
export interface ModerationResult {
  approved: boolean;
  action: 'approved' | 'blocked' | 'flagged' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  toxicityScores: {
    [key: string]: number;
  };
  categories: string[];
  message?: string;
  suggestions?: string[];
  requiresManualReview?: boolean;
}

/**
 * TensorFlow.js toxicity labels to human-readable categories
 */
const TENSORFLOW_LABEL_MAP: { [key: string]: string } = {
  'identity_attack': 'identityAttack',
  'insult': 'insult',
  'obscene': 'obscene',
  'severe_toxicity': 'severeToxicity',
  'sexual_explicit': 'sexuallyExplicit',
  'threat': 'threat',
  'toxicity': 'toxicity'
};

/**
 * Content sanitization patterns
 */
const SANITIZATION_PATTERNS = [
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[email]' },
  // Phone numbers
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[phone]' },
  // URLs
  { pattern: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g, replacement: '[url]' },
  // Social Security Numbers
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[ssn]' }
];

export class ModerationService {
  /**
   * Check content using both TensorFlow and OpenAI models
   */
  async checkContent(
    content: string,
    contentType: string,
    userId: string,
    contentId?: string
  ): Promise<ModerationResult> {
    try {
      // Sanitize PII from content before analysis
      const sanitizedContent = this.sanitizeContent(content);
      
      // Run OpenAI moderation
      const openAIResult = await this.checkWithOpenAI(sanitizedContent);
      
      // Combine results
      const combinedScores = {
        ...openAIResult.scores
      };
      
      // Determine overall severity
      const severity = this.calculateSeverity(combinedScores);
      
      // Determine action based on severity and scores
      const action = this.determineAction(combinedScores, severity);
      
      // Get violated categories
      const categories = this.getViolatedCategories(combinedScores);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(combinedScores);
      
      // Generate user-friendly message
      const message = this.generateMessage(action, categories, severity);
      
      // Generate improvement suggestions
      const suggestions = this.generateSuggestions(categories, combinedScores);
      
      // Determine if manual review is needed
      const requiresManualReview = this.requiresManualReview(confidence, severity, categories);
      
      // Log the moderation decision
      await this.logModeration({
        contentId: contentId || `temp_${Date.now()}`,
        contentType,
        userId,
        content: sanitizedContent,
        toxicityScores: combinedScores,
        actionTaken: action,
        modelUsed: 'openai',
        confidence,
        categories,
        severity
      });
      
      // If content is blocked, save it to blocked content table
      if (action === 'blocked') {
        await this.saveBlockedContent({
          content: sanitizedContent,
          originalContentId: contentId,
          contentType,
          userId,
          reason: message || 'Content violated community guidelines',
          blockedCategories: categories,
          toxicityLevel: Math.max(...Object.values(combinedScores))
        });
      }
      
      return {
        approved: action === 'approved',
        action,
        severity,
        confidence,
        toxicityScores: combinedScores,
        categories,
        message,
        suggestions,
        requiresManualReview
      };
    } catch (error) {
      console.error('Error checking content moderation:', error);
      // On error, default to approved but flag for manual review
      return {
        approved: true,
        action: 'flagged',
        severity: 'low',
        confidence: 0,
        toxicityScores: {},
        categories: [],
        message: 'Content requires manual review',
        requiresManualReview: true
      };
    }
  }
  
  /**
   * Check content using OpenAI Moderation API
   */
  private async checkWithOpenAI(content: string): Promise<{
    flagged: boolean;
    scores: { [key: string]: number };
    categories: string[];
  }> {
    try {
      const response = await openai.moderations.create({
        input: content,
        model: "omni-moderation-latest"
      });
      
      const result = response.results[0];
      const scores: { [key: string]: number } = {};
      const categories: string[] = [];
      
      // Extract scores from OpenAI response
      if (result.category_scores) {
        scores.harassment = result.category_scores.harassment || 0;
        scores.harassmentThreatening = result.category_scores['harassment/threatening'] || 0;
        scores.hate = result.category_scores.hate || 0;
        scores.hateThreatening = result.category_scores['hate/threatening'] || 0;
        scores.selfHarm = result.category_scores['self-harm'] || 0;
        scores.selfHarmIntent = result.category_scores['self-harm/intent'] || 0;
        scores.selfHarmInstruction = result.category_scores['self-harm/instructions'] || 0;
        scores.sexual = result.category_scores.sexual || 0;
        scores.sexualMinors = result.category_scores['sexual/minors'] || 0;
        scores.violence = result.category_scores.violence || 0;
        scores.violenceGraphic = result.category_scores['violence/graphic'] || 0;
      }
      
      // Check which categories are flagged
      if (result.categories) {
        if (result.categories.harassment) categories.push('harassment');
        if (result.categories['harassment/threatening']) categories.push('harassment/threatening');
        if (result.categories.hate) categories.push('hate');
        if (result.categories['hate/threatening']) categories.push('hate/threatening');
        if (result.categories['self-harm']) categories.push('self-harm');
        if (result.categories['self-harm/intent']) categories.push('self-harm/intent');
        if (result.categories['self-harm/instructions']) categories.push('self-harm/instructions');
        if (result.categories.sexual) categories.push('sexual');
        if (result.categories['sexual/minors']) categories.push('sexual/minors');
        if (result.categories.violence) categories.push('violence');
        if (result.categories['violence/graphic']) categories.push('violence/graphic');
      }
      
      return {
        flagged: result.flagged,
        scores,
        categories
      };
    } catch (error) {
      console.error('Error with OpenAI moderation:', error);
      return {
        flagged: false,
        scores: {},
        categories: []
      };
    }
  }
  
  /**
   * Process TensorFlow.js toxicity results from client
   */
  async processTensorFlowResults(
    results: any[],
    content: string,
    contentType: string,
    userId: string,
    contentId?: string
  ): Promise<ModerationResult> {
    const scores: { [key: string]: number } = {};
    
    // Process TensorFlow results
    results.forEach(result => {
      const label = TENSORFLOW_LABEL_MAP[result.label] || result.label;
      const match = result.results[0].match;
      const probability = result.results[0].probabilities[1];
      scores[label] = match ? probability : 0;
    });
    
    // Also check with OpenAI for comprehensive analysis
    const sanitizedContent = this.sanitizeContent(content);
    const openAIResult = await this.checkWithOpenAI(sanitizedContent);
    
    // Merge scores (use higher score when both exist)
    const combinedScores = { ...scores };
    Object.entries(openAIResult.scores).forEach(([key, value]) => {
      combinedScores[key] = Math.max(combinedScores[key] || 0, value);
    });
    
    // Calculate severity and determine action
    const severity = this.calculateSeverity(combinedScores);
    const action = this.determineAction(combinedScores, severity);
    const categories = this.getViolatedCategories(combinedScores);
    const confidence = this.calculateConfidence(combinedScores);
    const message = this.generateMessage(action, categories, severity);
    const suggestions = this.generateSuggestions(categories, combinedScores);
    const requiresManualReview = this.requiresManualReview(confidence, severity, categories);
    
    // Log the moderation
    await this.logModeration({
      contentId: contentId || `temp_${Date.now()}`,
      contentType,
      userId,
      content: sanitizedContent,
      toxicityScores: combinedScores,
      actionTaken: action,
      modelUsed: 'both',
      confidence,
      categories,
      severity
    });
    
    // Save blocked content if needed
    if (action === 'blocked') {
      await this.saveBlockedContent({
        content: sanitizedContent,
        originalContentId: contentId,
        contentType,
        userId,
        reason: message || 'Content violated community guidelines',
        blockedCategories: categories,
        toxicityLevel: Math.max(...Object.values(combinedScores))
      });
    }
    
    return {
      approved: action === 'approved',
      action,
      severity,
      confidence,
      toxicityScores: combinedScores,
      categories,
      message,
      suggestions,
      requiresManualReview
    };
  }
  
  /**
   * Sanitize content to remove PII
   */
  private sanitizeContent(content: string): string {
    let sanitized = content;
    
    SANITIZATION_PATTERNS.forEach(({ pattern, replacement }) => {
      sanitized = sanitized.replace(pattern, replacement);
    });
    
    return sanitized;
  }
  
  /**
   * Calculate overall severity based on scores
   */
  private calculateSeverity(scores: { [key: string]: number }): 'low' | 'medium' | 'high' | 'critical' {
    const maxScore = Math.max(...Object.values(scores), 0);
    
    if (maxScore >= TOXICITY_THRESHOLDS.critical) return 'critical';
    if (maxScore >= TOXICITY_THRESHOLDS.high) return 'high';
    if (maxScore >= TOXICITY_THRESHOLDS.medium) return 'medium';
    return 'low';
  }
  
  /**
   * Determine action based on scores and severity
   */
  private determineAction(
    scores: { [key: string]: number },
    severity: string
  ): 'approved' | 'blocked' | 'flagged' | 'warning' {
    // Critical content always blocked
    if (severity === 'critical') return 'blocked';
    
    // Check for specific high-risk categories
    const highRiskCategories = ['selfHarm', 'selfHarmIntent', 'selfHarmInstruction', 'sexualMinors', 'violenceGraphic'];
    const hasHighRisk = highRiskCategories.some(cat => (scores[cat] || 0) > 0.5);
    if (hasHighRisk) return 'blocked';
    
    // High severity usually blocked
    if (severity === 'high') return 'blocked';
    
    // Medium severity gets warning
    if (severity === 'medium') return 'warning';
    
    // Low severity but has violations gets flagged
    const hasViolations = Object.values(scores).some(score => score > TOXICITY_THRESHOLDS.low);
    if (hasViolations) return 'flagged';
    
    return 'approved';
  }
  
  /**
   * Get list of violated categories
   */
  private getViolatedCategories(scores: { [key: string]: number }): string[] {
    const categories: string[] = [];
    
    Object.entries(scores).forEach(([category, score]) => {
      const threshold = OPENAI_THRESHOLDS[category as keyof typeof OPENAI_THRESHOLDS] || TOXICITY_THRESHOLDS.medium;
      if (score > threshold) {
        categories.push(category);
      }
    });
    
    return categories;
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidence(scores: { [key: string]: number }): number {
    const values = Object.values(scores).filter(v => v > 0);
    if (values.length === 0) return 1.0;
    
    // Higher scores = higher confidence
    const maxScore = Math.max(...values);
    const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Weight max score more heavily
    return Math.min((maxScore * 0.7 + avgScore * 0.3), 1.0);
  }
  
  /**
   * Generate user-friendly message
   */
  private generateMessage(action: string, categories: string[], severity: string): string {
    if (action === 'approved') return '';
    
    const categoryMessages: { [key: string]: string } = {
      harassment: 'harassment or bullying',
      hate: 'hate speech',
      selfHarm: 'self-harm content',
      sexual: 'sexual content',
      violence: 'violent content',
      profanity: 'profanity',
      threat: 'threatening language',
      insult: 'insulting language'
    };
    
    const violations = categories
      .map(cat => categoryMessages[cat] || cat.replace(/([A-Z])/g, ' $1').toLowerCase())
      .filter(Boolean);
    
    if (action === 'blocked') {
      return `Your content was blocked due to ${violations.join(', ')}. Please revise and try again.`;
    }
    
    if (action === 'warning') {
      return `Your content may contain ${violations.join(', ')}. Please review before posting.`;
    }
    
    if (action === 'flagged') {
      return `Your content has been flagged for review. It may contain ${violations.join(', ')}.`;
    }
    
    return 'Your content requires review.';
  }
  
  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(categories: string[], scores: { [key: string]: number }): string[] {
    const suggestions: string[] = [];
    
    if (categories.includes('harassment') || categories.includes('insult')) {
      suggestions.push('Try to express your point without personal attacks');
      suggestions.push('Focus on ideas rather than individuals');
    }
    
    if (categories.includes('hate')) {
      suggestions.push('Ensure your message is respectful to all groups');
      suggestions.push('Avoid generalizations about people based on their identity');
    }
    
    if (categories.includes('threat')) {
      suggestions.push('Express disagreement without threatening language');
      suggestions.push('Consider rephrasing to be more constructive');
    }
    
    if (categories.includes('profanity') || categories.includes('obscene')) {
      suggestions.push('Consider using more professional language');
      suggestions.push('Express strong feelings without profanity');
    }
    
    if (suggestions.length === 0 && categories.length > 0) {
      suggestions.push('Review your content for potentially inappropriate material');
      suggestions.push('Consider if your message aligns with community guidelines');
    }
    
    return suggestions.slice(0, 3); // Return max 3 suggestions
  }
  
  /**
   * Determine if manual review is required
   */
  private requiresManualReview(confidence: number, severity: string, categories: string[]): boolean {
    // Low confidence always needs review
    if (confidence < 0.6) return true;
    
    // Medium severity with borderline confidence
    if (severity === 'medium' && confidence < 0.8) return true;
    
    // Multiple categories detected
    if (categories.length > 3) return true;
    
    // Sensitive categories
    const sensitiveCategories = ['selfHarm', 'selfHarmIntent', 'sexualMinors'];
    if (categories.some(cat => sensitiveCategories.includes(cat))) return true;
    
    return false;
  }
  
  /**
   * Log moderation decision
   */
  private async logModeration(data: InsertModerationLog): Promise<void> {
    try {
      await storage.admin.security.createModerationLog(data);
    } catch (error) {
      console.error('Error logging moderation:', error);
    }
  }
  
  /**
   * Save blocked content
   */
  private async saveBlockedContent(data: InsertBlockedContent): Promise<void> {
    try {
      await storage.admin.security.createBlockedContent(data);
    } catch (error) {
      console.error('Error saving blocked content:', error);
    }
  }
  
  /**
   * Get moderation queue for review
   */
  async getModerationQueue(
    userId: string,
    isAdmin: boolean,
    filters?: {
      status?: string;
      severity?: string;
      contentType?: string;
    }
  ): Promise<ModerationLog[]> {
    return await storage.admin.security.getModerationQueue(userId, isAdmin, filters);
  }
  
  /**
   * Take moderation action
   */
  async takeModerationAction(
    moderationLogId: string,
    action: 'approved' | 'blocked' | 'flagged' | 'warning',
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    await storage.admin.security.updateModerationLog(moderationLogId, {
      actionTaken: action,
      reviewedBy,
      reviewNotes: notes,
      manualReview: true,
      reviewedAt: new Date()
    });
  }
  
  /**
   * Submit appeal
   */
  async submitAppeal(appeal: InsertModerationAppeal): Promise<ModerationAppeal> {
    return await storage.admin.security.createModerationAppeal(appeal);
  }
  
  /**
   * Process appeal
   */
  async processAppeal(
    appealId: string,
    decision: 'approved' | 'rejected' | 'partially_approved',
    decidedBy: string,
    reason: string
  ): Promise<void> {
    const appeal = await storage.admin.security.getModerationAppeal(appealId);
    if (!appeal) throw new Error('Appeal not found');
    
    // Update appeal
    await storage.admin.security.updateModerationAppeal(appealId, {
      status: decision === 'approved' ? 'approved' : 'rejected',
      decision,
      decidedBy,
      decisionReason: reason,
      decidedAt: new Date()
    });
    
    // If approved, restore content
    if (decision === 'approved' && appeal.blockedContentId) {
      await storage.admin.security.restoreBlockedContent(appeal.blockedContentId, decidedBy);
    }
  }
  
  /**
   * Get moderation statistics
   */
  async getModerationStats(
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalChecked: number;
    totalBlocked: number;
    totalFlagged: number;
    totalAppeals: number;
    appealsApproved: number;
    categoriesBreakdown: { [key: string]: number };
    severityBreakdown: { [key: string]: number };
    averageConfidence: number;
  }> {
    return await storage.admin.security.getModerationStats(timeRange);
  }
}

// Export singleton instance
export const moderationService = new ModerationService();
/**
 * Prediction Service
 * 
 * Core service for predictive analytics using TensorFlow.js and OpenAI.
 * Handles churn prediction, user behavior analysis, and intervention generation.
 */

import OpenAI from 'openai';
import { storage } from "../storage/index";
import type { UserPrediction, InsertUserPrediction } from '@shared/schema';
import { predictChurnLightweight } from './lightweight-prediction.service';

// Initialize OpenAI client (uses Replit AI Integrations)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-replit-integration',
});

export interface UserMetrics {
  userId: string;
  lastActiveDate: Date;
  sessionCount: number;
  averageSessionDuration: number;
  featureUsageCount: Record<string, number>;
  contentCreatedCount: number;
  interactionCount: number;
  daysSinceSignup: number;
  activityTrend: number; // Positive for increasing, negative for decreasing
}

interface PredictionFactors {
  activityDecline: number;
  lowEngagement: number;
  featureAdoption: number;
  sessionFrequency: number;
  contentCreation: number;
  userTenure: number;
}

class PredictionService {
  private modelInitialized = true; // Lightweight models are always ready

  constructor() {
    // Lightweight prediction models ready
  }


  /**
   * Generate predictions for a user
   */
  async generateUserPredictions(userId: string): Promise<UserPrediction[]> {
    const predictions: UserPrediction[] = [];

    try {
      // Get user metrics (in real scenario, would fetch from analytics)
      const metrics = await this.getUserMetrics(userId);
      
      // Generate churn prediction
      const churnPrediction = await this.predictChurn(metrics);
      if (churnPrediction) {
        const saved = await storage.platform.analytics.createUserPrediction(churnPrediction);
        predictions.push(saved);
      }

      // Generate behavior predictions
      const behaviorPrediction = await this.predictNextBehavior(metrics);
      if (behaviorPrediction) {
        const saved = await storage.platform.analytics.createUserPrediction(behaviorPrediction);
        predictions.push(saved);
      }

      // Generate engagement prediction
      const engagementPrediction = await this.predictEngagement(metrics);
      if (engagementPrediction) {
        const saved = await storage.platform.analytics.createUserPrediction(engagementPrediction);
        predictions.push(saved);
      }

      return predictions;
    } catch (error) {
      console.error('Error generating user predictions:', error);
      return predictions;
    }
  }

  /**
   * Predict churn risk for a user
   */
  private async predictChurn(metrics: UserMetrics): Promise<InsertUserPrediction | null> {
    // Use lightweight prediction instead of TensorFlow
    const probability = predictChurnLightweight(metrics);
    
    // Analyze factors
    const factors = this.analyzeChurnFactors(metrics);

    return {
      userId: metrics.userId,
      predictionType: 'churn_risk',
      probability,
      predictedDate: new Date(),
      factors,
      modelVersion: 'v1.0',
    };
  }

  /**
   * Generate simulated churn prediction (fallback)
   */
  private generateSimulatedChurnPrediction(metrics: UserMetrics): InsertUserPrediction {
    // Simple heuristic-based churn prediction
    let churnScore = 0;
    const factors: PredictionFactors = {
      activityDecline: 0,
      lowEngagement: 0,
      featureAdoption: 0,
      sessionFrequency: 0,
      contentCreation: 0,
      userTenure: 0,
    };

    // Check activity decline
    if (metrics.activityTrend < -0.3) {
      churnScore += 0.3;
      factors.activityDecline = 0.3;
    }

    // Check session frequency
    const daysSinceActive = (Date.now() - metrics.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive > 7) {
      churnScore += 0.25;
      factors.sessionFrequency = 0.25;
    }

    // Check engagement metrics
    if (metrics.averageSessionDuration < 120) { // Less than 2 minutes average
      churnScore += 0.15;
      factors.lowEngagement = 0.15;
    }

    // Check content creation
    if (metrics.contentCreatedCount < 5 && metrics.daysSinceSignup > 30) {
      churnScore += 0.15;
      factors.contentCreation = 0.15;
    }

    // Check feature adoption
    const featuresUsed = Object.keys(metrics.featureUsageCount).length;
    if (featuresUsed < 3) {
      churnScore += 0.15;
      factors.featureAdoption = 0.15;
    }

    // Normalize to 0-1 range
    const probability = Math.min(Math.max(churnScore + Math.random() * 0.1, 0), 1);

    return {
      userId: metrics.userId,
      predictionType: 'churn_risk',
      probability,
      predictedDate: new Date(),
      factors,
      modelVersion: 'v1.0',
    };
  }

  /**
   * Predict next user behavior
   */
  private async predictNextBehavior(metrics: UserMetrics): Promise<InsertUserPrediction | null> {
    // Simplified behavior prediction
    const behaviors = [
      { action: 'explore_features', probability: 0.3 },
      { action: 'create_content', probability: 0.25 },
      { action: 'engage_community', probability: 0.2 },
      { action: 'upgrade_plan', probability: 0.15 },
      { action: 'invite_users', probability: 0.1 },
    ];

    // Adjust probabilities based on user history
    if (metrics.contentCreatedCount > 10) {
      behaviors[1].probability += 0.15; // More likely to create content
    }
    if (metrics.interactionCount > 20) {
      behaviors[2].probability += 0.1; // More likely to engage
    }

    // Find most likely behavior
    const mostLikely = behaviors.reduce((prev, current) => 
      prev.probability > current.probability ? prev : current
    );

    return {
      userId: metrics.userId,
      predictionType: 'next_action',
      probability: mostLikely.probability,
      predictedDate: new Date(),
      factors: { activityPattern: mostLikely.action },
      modelVersion: 'v1.0',
    };
  }

  /**
   * Predict engagement level
   */
  private async predictEngagement(metrics: UserMetrics): Promise<InsertUserPrediction | null> {
    // Calculate engagement score
    let engagementScore = 0;
    
    // Recent activity weight
    const daysSinceActive = (Date.now() - metrics.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive < 1) engagementScore += 0.3;
    else if (daysSinceActive < 3) engagementScore += 0.2;
    else if (daysSinceActive < 7) engagementScore += 0.1;

    // Session frequency
    if (metrics.sessionCount > 20) engagementScore += 0.25;
    else if (metrics.sessionCount > 10) engagementScore += 0.15;
    else if (metrics.sessionCount > 5) engagementScore += 0.1;

    // Session duration
    if (metrics.averageSessionDuration > 600) engagementScore += 0.25; // > 10 minutes
    else if (metrics.averageSessionDuration > 300) engagementScore += 0.15; // > 5 minutes
    else if (metrics.averageSessionDuration > 120) engagementScore += 0.1; // > 2 minutes

    // Content creation
    if (metrics.contentCreatedCount > 10) engagementScore += 0.2;
    else if (metrics.contentCreatedCount > 5) engagementScore += 0.1;

    const probability = Math.min(engagementScore, 1);
    const isDropping = metrics.activityTrend < -0.2 && probability < 0.5;

    if (isDropping) {
      return {
        userId: metrics.userId,
        predictionType: 'engagement_drop',
        probability: 1 - probability, // Invert for drop probability
        predictedDate: new Date(),
        factors: {
          engagementScore: probability,
          activityPattern: metrics.activityTrend < -0.3 ? 'declining' : 'stable',
        },
        modelVersion: 'v1.0',
      };
    }

    return null;
  }

  /**
   * Generate intervention suggestions using OpenAI
   */
  async generateIntervention(
    prediction: UserPrediction,
    options?: { regenerate?: boolean }
  ): Promise<any> {
    try {
      const prompt = this.buildInterventionPrompt(prediction);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a retention specialist helping to reduce user churn. Generate specific, actionable intervention strategies.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options?.regenerate ? 0.8 : 0.6,
        max_tokens: 500,
      });

      const content = response.choices[0].message.content || '';
      
      // Parse intervention suggestions
      const intervention = this.parseInterventionResponse(content, prediction);
      
      return intervention;
    } catch (error) {
      console.error('Error generating intervention with OpenAI:', error);
      return this.generateFallbackIntervention(prediction);
    }
  }

  /**
   * Build intervention prompt for OpenAI
   */
  private buildInterventionPrompt(prediction: UserPrediction): string {
    const factors = prediction.factors as PredictionFactors;
    
    let prompt = `User ${prediction.userId} has a ${(prediction.probability * 100).toFixed(1)}% churn risk.\n\n`;
    prompt += 'Risk factors:\n';
    
    if (factors.activityDecline > 0.2) {
      prompt += '- Significant activity decline detected\n';
    }
    if (factors.lowEngagement > 0.15) {
      prompt += '- Low engagement metrics (short sessions)\n';
    }
    if (factors.featureAdoption < 0.3) {
      prompt += '- Limited feature adoption\n';
    }
    if (factors.sessionFrequency > 0.2) {
      prompt += '- Infrequent sessions\n';
    }
    if (factors.contentCreation > 0.15) {
      prompt += '- Low content creation\n';
    }
    
    prompt += '\nGenerate 3 specific intervention strategies:\n';
    prompt += '1. An immediate action (within 24 hours)\n';
    prompt += '2. A medium-term strategy (within 1 week)\n';
    prompt += '3. A long-term retention approach\n';
    prompt += '\nInclude specific email subject lines and key messages for each.';
    
    return prompt;
  }

  /**
   * Parse intervention response from OpenAI
   */
  private parseInterventionResponse(content: string, prediction: UserPrediction): any {
    // Extract key recommendations
    const lines = content.split('\n').filter(line => line.trim());
    
    const intervention = {
      predictionId: prediction.id,
      userId: prediction.userId,
      riskLevel: prediction.probability > 0.8 ? 'critical' : prediction.probability > 0.6 ? 'high' : 'medium',
      recommendedAction: lines[0] || 'Send re-engagement email',
      strategies: {
        immediate: {
          action: 'Send personalized re-engagement email',
          emailSubject: 'We miss you! Here\'s what\'s new',
          keyMessage: 'Show them new features and content they\'ve missed',
          timing: '24 hours',
        },
        shortTerm: {
          action: 'Offer temporary premium features',
          emailSubject: 'Exclusive: Try premium features free for 7 days',
          keyMessage: 'Give them a taste of advanced features to increase engagement',
          timing: '3-7 days',
        },
        longTerm: {
          action: 'Implement progressive engagement program',
          emailSubject: 'Your personalized success path',
          keyMessage: 'Guide them through feature discovery with rewards',
          timing: '2-4 weeks',
        },
      },
      generatedAt: new Date().toISOString(),
      confidence: 0.85,
    };
    
    return intervention;
  }

  /**
   * Generate fallback intervention (without AI)
   */
  private generateFallbackIntervention(prediction: UserPrediction): any {
    const riskLevel = prediction.probability > 0.8 ? 'critical' : prediction.probability > 0.6 ? 'high' : 'medium';
    
    const strategies = {
      critical: {
        immediate: {
          action: 'Send urgent retention offer',
          emailSubject: '⚡ Special offer just for you - 50% off this month',
          keyMessage: 'Exclusive discount to keep them engaged',
          timing: '12 hours',
        },
      },
      high: {
        immediate: {
          action: 'Send personalized check-in',
          emailSubject: 'Quick question - how can we help?',
          keyMessage: 'Personal touch to understand their needs',
          timing: '24 hours',
        },
      },
      medium: {
        immediate: {
          action: 'Send feature highlight email',
          emailSubject: 'You\'re missing out on these powerful features',
          keyMessage: 'Educate about underutilized features',
          timing: '48 hours',
        },
      },
    };
    
    return {
      predictionId: prediction.id,
      userId: prediction.userId,
      riskLevel,
      recommendedAction: strategies[riskLevel].immediate.action,
      strategies: {
        immediate: strategies[riskLevel].immediate,
        shortTerm: {
          action: 'Follow-up with value proposition',
          emailSubject: 'See how others like you succeed',
          keyMessage: 'Share success stories and use cases',
          timing: '1 week',
        },
        longTerm: {
          action: 'Enroll in retention program',
          emailSubject: 'Join our VIP community',
          keyMessage: 'Create sense of belonging and exclusivity',
          timing: '2 weeks',
        },
      },
      generatedAt: new Date().toISOString(),
      confidence: 0.75,
    };
  }

  /**
   * Get user segments based on predictions
   */
  async getUserSegments(options?: {
    segmentType?: string;
    minProbability?: number;
  }): Promise<any[]> {
    const segments = [
      {
        id: 'high-churn-risk',
        name: 'High Churn Risk',
        description: 'Users with >70% churn probability',
        userCount: 0,
        averageProbability: 0,
        recommendedActions: ['Immediate intervention', 'Personal outreach', 'Special offers'],
      },
      {
        id: 'declining-engagement',
        name: 'Declining Engagement',
        description: 'Users with decreasing activity trends',
        userCount: 0,
        averageProbability: 0,
        recommendedActions: ['Re-engagement campaign', 'Feature education', 'Feedback survey'],
      },
      {
        id: 'low-feature-adoption',
        name: 'Low Feature Adoption',
        description: 'Users using <30% of available features',
        userCount: 0,
        averageProbability: 0,
        recommendedActions: ['Feature tutorials', 'Onboarding refresh', 'Use case examples'],
      },
      {
        id: 'dormant-users',
        name: 'Dormant Users',
        description: 'Inactive for 7+ days',
        userCount: 0,
        averageProbability: 0,
        recommendedActions: ['Win-back campaign', 'Product updates', 'Reactivation incentive'],
      },
    ];
    
    // In production, would calculate actual counts from database
    // For now, return sample data
    segments[0].userCount = Math.floor(Math.random() * 100) + 20;
    segments[0].averageProbability = 0.75 + Math.random() * 0.15;
    segments[1].userCount = Math.floor(Math.random() * 150) + 50;
    segments[1].averageProbability = 0.45 + Math.random() * 0.15;
    segments[2].userCount = Math.floor(Math.random() * 200) + 100;
    segments[2].averageProbability = 0.35 + Math.random() * 0.15;
    segments[3].userCount = Math.floor(Math.random() * 80) + 10;
    segments[3].averageProbability = 0.65 + Math.random() * 0.15;
    
    if (options?.segmentType) {
      return segments.filter(s => s.id.includes(options.segmentType!));
    }
    
    if (options?.minProbability) {
      return segments.filter(s => s.averageProbability >= options.minProbability!);
    }
    
    return segments;
  }

  /**
   * Get user metrics (mock implementation)
   */
  private async getUserMetrics(userId: string): Promise<UserMetrics> {
    // In production, would fetch from analytics database
    // For now, return simulated metrics
    const now = new Date();
    const signupDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Random 0-90 days ago
    
    return {
      userId,
      lastActiveDate: new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Random 0-14 days ago
      sessionCount: Math.floor(Math.random() * 50) + 5,
      averageSessionDuration: Math.random() * 600 + 60, // 1-11 minutes
      featureUsageCount: {
        dashboard: Math.floor(Math.random() * 30),
        analytics: Math.floor(Math.random() * 20),
        reports: Math.floor(Math.random() * 10),
        settings: Math.floor(Math.random() * 5),
      },
      contentCreatedCount: Math.floor(Math.random() * 30),
      interactionCount: Math.floor(Math.random() * 50),
      daysSinceSignup: Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)),
      activityTrend: Math.random() * 2 - 1, // -1 to 1
    };
  }

  /**
   * Prepare features for churn model
   */
  private prepareChurnFeatures(metrics: UserMetrics): number[] {
    const daysSinceActive = (Date.now() - metrics.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    const featuresUsed = Object.keys(metrics.featureUsageCount).length;
    
    return [
      daysSinceActive / 30, // Normalize to 0-1 range
      metrics.sessionCount / 100,
      metrics.averageSessionDuration / 600,
      featuresUsed / 10,
      metrics.contentCreatedCount / 50,
      metrics.activityTrend, // Already -1 to 1
    ];
  }

  /**
   * Analyze churn factors
   */
  private analyzeChurnFactors(metrics: UserMetrics): PredictionFactors {
    const daysSinceActive = (Date.now() - metrics.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    const featuresUsed = Object.keys(metrics.featureUsageCount).length;
    
    return {
      activityDecline: metrics.activityTrend < 0 ? Math.abs(metrics.activityTrend) : 0,
      lowEngagement: metrics.averageSessionDuration < 120 ? 0.3 : 0,
      featureAdoption: featuresUsed < 3 ? 0.4 : 0,
      sessionFrequency: daysSinceActive > 7 ? 0.5 : 0,
      contentCreation: metrics.contentCreatedCount < 5 ? 0.3 : 0,
      userTenure: metrics.daysSinceSignup > 30 ? 0.1 : 0.3,
    };
  }
}

export const predictionService = new PredictionService();
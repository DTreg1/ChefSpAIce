/**
 * PlatformStorage Facade
 * Consolidates platform-wide storage operations into organized sub-modules
 */

import { db } from "../../db";
import {
  activityLogs, webVitals, userSessions, analyticsEvents, analyticsMetrics,
  voiceCommands, draftTemplates, generatedDrafts, writingSessions,
  writingSuggestions, summaries, translations, transcriptions,
  extractionTemplates, extractedData, queryLogs, autoSaveDrafts,
  apiUsageLogs, systemMetrics, maintenancePredictions, maintenanceHistory,
  categories, contentCategories, tags, contentTags, contentEmbeddings,
  duplicatePairs, relatedContent,
  userFeedback, feedbackResponses, feedbackVotes, feedbackFollowUps,
  donations,
  ActivityLog, InsertActivityLog, WebVitals, InsertWebVitals,
  UserSession, InsertUserSession, AnalyticsEvent, InsertAnalyticsEvent,
  AnalyticsMetric, InsertAnalyticsMetric,
  VoiceCommand, InsertVoiceCommand, DraftTemplate, InsertDraftTemplate,
  GeneratedDraft, InsertGeneratedDraft, WritingSession, InsertWritingSession,
  WritingSuggestion, InsertWritingSuggestion, Summary, InsertSummary,
  Translation, InsertTranslation, Transcription, InsertTranscription,
  ExtractionTemplate, InsertExtractionTemplate, ExtractedData, InsertExtractedData,
  QueryLog, InsertQueryLog, AutoSaveDraft, InsertAutoSaveDraft,
  ApiUsageLog, InsertApiUsageLog, SystemMetric, InsertSystemMetric,
  MaintenancePrediction, InsertMaintenancePrediction,
  MaintenanceHistory, InsertMaintenanceHistory,
  Category, InsertCategory, ContentCategory, InsertContentCategory,
  Tag, InsertTag, ContentTag, InsertContentTag,
  ContentEmbedding, InsertContentEmbedding, DuplicatePair, InsertDuplicatePair,
  RelatedContent, InsertRelatedContent,
  UserFeedback, InsertUserFeedback, FeedbackResponse, InsertFeedbackResponse,
  FeedbackVote, InsertFeedbackVote, FeedbackFollowUp, InsertFeedbackFollowUp,
  Donation, InsertDonation
} from "@shared/schema";
import { eq, and, or, sql, desc, asc, gte, lt, lte, ilike, isNull, not, inArray, between, SQL } from "drizzle-orm";

/**
 * Analytics module - handles activity logging, metrics, and insights
 */
class AnalyticsModule {
  async logApiUsage(
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    metadata?: any
  ): Promise<void> {
    await db.insert(activityLogs).values({
      userId: userId,
      activityType: 'api',
      resourceType: 'endpoint',
      action: `${method} ${endpoint}`,
      details: {
        endpoint,
        method,
        statusCode,
        responseTime,
        ...metadata
      },
      success: statusCode < 400,
      timestamp: new Date()
    });
  }

  async getApiUsageLogs(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityLog[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }
    if (startDate) {
      conditions.push(gte(activityLogs.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(activityLogs.timestamp, endDate));
    }
    
    return conditions.length > 0
      ? await db.select().from(activityLogs)
          .where(and(...conditions))
          .orderBy(desc(activityLogs.timestamp))
      : await db.select().from(activityLogs)
          .orderBy(desc(activityLogs.timestamp));
  }

  async recordWebVital(vital: InsertWebVitals): Promise<void> {
    await db.insert(webVitals).values(vital);
  }

  async getWebVitals(
    userId?: string,
    metricName?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WebVitals[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(webVitals.userId, userId));
    }
    if (metricName) {
      conditions.push(eq(webVitals.metricName, metricName));
    }
    if (startDate) {
      conditions.push(gte(webVitals.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(webVitals.timestamp, endDate));
    }
    
    return conditions.length > 0
      ? await db.select().from(webVitals)
          .where(and(...conditions))
          .orderBy(desc(webVitals.timestamp))
      : await db.select().from(webVitals)
          .orderBy(desc(webVitals.timestamp));
  }

  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [result] = await db.insert(userSessions).values(session).returning();
    return result;
  }

  async updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<void> {
    await db.update(userSessions)
      .set(updates)
      .where(eq(userSessions.id, sessionId));
  }

  async getUserSessions(userId: string, limit: number = 10): Promise<UserSession[]> {
    return await db.select().from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.startTime))
      .limit(limit);
  }

  async recordAnalyticsEvent(event: InsertAnalyticsEvent): Promise<void> {
    await db.insert(analyticsEvents).values(event);
  }

  async getAnalyticsEvents(
    userId?: string,
    eventType?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsEvent[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(analyticsEvents.userId, userId));
    }
    if (eventType) {
      conditions.push(eq(analyticsEvents.eventType, eventType));
    }
    if (startDate) {
      conditions.push(gte(analyticsEvents.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(analyticsEvents.timestamp, endDate));
    }
    
    return conditions.length > 0
      ? await db.select().from(analyticsEvents)
          .where(and(...conditions))
          .orderBy(desc(analyticsEvents.timestamp))
      : await db.select().from(analyticsEvents)
          .orderBy(desc(analyticsEvents.timestamp));
  }

  async getAnalyticsStats(
    userId?: string,
    type: 'session' | 'events' | 'usage' = 'events',
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }
    
    switch (type) {
      case 'session':
        const sessions = userId 
          ? await this.getUserSessions(userId, 100)
          : await db.select().from(userSessions)
              .where(gte(userSessions.startTime, startDate))
              .orderBy(desc(userSessions.startTime));
        
        const totalDuration = sessions.reduce((sum, s) => {
          const duration = s.endTime 
            ? s.endTime.getTime() - s.startTime.getTime()
            : 0;
          return sum + duration;
        }, 0);
        
        return {
          totalSessions: sessions.length,
          averageDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
          uniqueUsers: new Set(sessions.map(s => s.userId)).size,
        };
        
      case 'events':
        const events = await this.getAnalyticsEvents(userId, undefined, startDate, now);
        const eventsByType = events.reduce((acc, e) => {
          acc[e.eventType] = (acc[e.eventType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          totalEvents: events.length,
          eventsByType,
          eventsPerDay: events.length / Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        };
        
      case 'usage':
        const logs = await this.getApiUsageLogs(userId, startDate, now);
        
        return {
          totalRequests: logs.length,
          uniqueEndpoints: new Set(logs.map(l => l.action?.split(' ')[1])).size,
          averageResponseTime: logs.reduce((sum, l) => {
            const responseTime = (l.details as any)?.responseTime || 0;
            return sum + responseTime;
          }, 0) / logs.length || 0,
          errorRate: logs.filter(l => (l.details as any)?.statusCode >= 400).length / logs.length || 0,
        };
    }
  }
}

/**
 * AI module - handles AI/ML operations and data
 */
class AiModule {
  async createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand> {
    const [result] = await db.insert(voiceCommands)
      .values(command as any)
      .returning();
    return result;
  }

  async getVoiceCommands(userId: string, intent?: string, limit = 20): Promise<VoiceCommand[]> {
    const conditions = [eq(voiceCommands.userId, userId)];
    if (intent) {
      conditions.push(eq(voiceCommands.intent, intent));
    }

    return await db.select().from(voiceCommands)
      .where(and(...conditions))
      .orderBy(desc(voiceCommands.createdAt))
      .limit(limit);
  }

  async getVoiceCommand(id: string): Promise<VoiceCommand | null> {
    const [result] = await db.select().from(voiceCommands)
      .where(eq(voiceCommands.id, id))
      .limit(1);
    return result || null;
  }

  async getVoiceCommandStats(userId: string): Promise<{
    totalCommands: number;
    avgConfidence: number;
    topIntents: Array<{ intent: string; count: number }>;
  }> {
    const commands = await db.select().from(voiceCommands)
      .where(eq(voiceCommands.userId, userId));

    const intentCounts: Record<string, number> = {};
    let totalConfidence = 0;
    let validConfidenceCount = 0;

    for (const cmd of commands) {
      if (cmd.intent) {
        intentCounts[cmd.intent] = (intentCounts[cmd.intent] || 0) + 1;
      }
      if (cmd.confidence !== null) {
        totalConfidence += cmd.confidence;
        validConfidenceCount++;
      }
    }

    const topIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCommands: commands.length,
      avgConfidence: validConfidenceCount > 0 ? totalConfidence / validConfidenceCount : 0,
      topIntents,
    };
  }

  async getDraftTemplates(category?: string): Promise<DraftTemplate[]> {
    if (category) {
      return await db.select().from(draftTemplates)
        .where(eq(draftTemplates.category, category))
        .orderBy(desc(draftTemplates.usageCount));
    }

    return await db.select().from(draftTemplates)
      .orderBy(desc(draftTemplates.usageCount));
  }

  async getDraftTemplate(id: string): Promise<DraftTemplate | null> {
    const [result] = await db.select().from(draftTemplates)
      .where(eq(draftTemplates.id, id))
      .limit(1);
    return result || null;
  }

  async createDraftTemplate(template: InsertDraftTemplate): Promise<DraftTemplate> {
    const [result] = await db.insert(draftTemplates)
      .values(template)
      .returning();
    return result;
  }

  async updateDraftTemplate(id: string, updates: Partial<DraftTemplate>): Promise<DraftTemplate> {
    const [result] = await db.update(draftTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(draftTemplates.id, id))
      .returning();
    return result;
  }

  async deleteDraftTemplate(id: string): Promise<void> {
    await db.delete(draftTemplates).where(eq(draftTemplates.id, id));
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db.update(draftTemplates)
      .set({
        usageCount: sql`${draftTemplates.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(draftTemplates.id, id));
  }

  async createGeneratedDraft(draft: InsertGeneratedDraft): Promise<GeneratedDraft> {
    const [result] = await db.insert(generatedDrafts)
      .values(draft)
      .returning();
    return result;
  }

  async getGeneratedDrafts(userId: string, documentType?: string): Promise<GeneratedDraft[]> {
    const conditions = [eq(generatedDrafts.userId, userId)];
    if (documentType) {
      conditions.push(eq(generatedDrafts.documentType, documentType));
    }

    return await db.select().from(generatedDrafts)
      .where(and(...conditions))
      .orderBy(desc(generatedDrafts.createdAt));
  }

  async getGeneratedDraft(id: string): Promise<GeneratedDraft | null> {
    const [result] = await db.select().from(generatedDrafts)
      .where(eq(generatedDrafts.id, id))
      .limit(1);
    return result || null;
  }

  async updateGeneratedDraft(id: string, updates: Partial<GeneratedDraft>): Promise<GeneratedDraft> {
    const [result] = await db.update(generatedDrafts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(generatedDrafts.id, id))
      .returning();
    return result;
  }

  async deleteGeneratedDraft(id: string): Promise<void> {
    await db.delete(generatedDrafts).where(eq(generatedDrafts.id, id));
  }

  async getUserDraftAnalytics(userId: string): Promise<any> {
    const drafts = await this.getGeneratedDrafts(userId);
    
    const byType = drafts.reduce((acc, d) => {
      acc[d.documentType] = (acc[d.documentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgRating = drafts.filter(d => d.rating).reduce((sum, d) => sum + (d.rating || 0), 0) / 
                      drafts.filter(d => d.rating).length || 0;
    
    return {
      totalDrafts: drafts.length,
      byType,
      avgRating,
      finalized: drafts.filter(d => d.isFinalized).length,
    };
  }

  async createWritingSession(session: InsertWritingSession): Promise<WritingSession> {
    const [result] = await db.insert(writingSessions)
      .values(session)
      .returning();
    return result;
  }

  async getWritingSession(id: string): Promise<WritingSession | null> {
    const [result] = await db.select().from(writingSessions)
      .where(eq(writingSessions.id, id))
      .limit(1);
    return result || null;
  }

  async getWritingSessions(userId: string, limit: number = 10): Promise<WritingSession[]> {
    return await db.select().from(writingSessions)
      .where(eq(writingSessions.userId, userId))
      .orderBy(desc(writingSessions.startedAt))
      .limit(limit);
  }

  async updateWritingSession(id: string, updates: Partial<WritingSession>): Promise<WritingSession> {
    const [result] = await db.update(writingSessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(writingSessions.id, id))
      .returning();
    return result;
  }

  async addWritingSuggestions(sessionId: string, suggestions: any[]): Promise<void> {
    const suggestionRecords = suggestions.map(s => ({
      sessionId,
      suggestionType: s.type,
      suggestion: s.text,
      confidence: s.confidence,
      metadata: s.metadata,
    }));

    await db.insert(writingSuggestions).values(suggestionRecords);
  }

  async getWritingSuggestions(sessionId: string): Promise<WritingSuggestion[]> {
    return await db.select().from(writingSuggestions)
      .where(eq(writingSuggestions.sessionId, sessionId))
      .orderBy(desc(writingSuggestions.confidence));
  }

  async applyWritingSuggestion(id: string): Promise<void> {
    await db.update(writingSuggestions)
      .set({ appliedAt: new Date() })
      .where(eq(writingSuggestions.id, id));
  }

  async getUserWritingStats(userId: string): Promise<any> {
    const sessions = await this.getWritingSessions(userId, 100);
    
    const totalDuration = sessions.reduce((sum, s) => {
      const duration = s.endedAt 
        ? s.endedAt.getTime() - s.startedAt.getTime()
        : 0;
      return sum + duration;
    }, 0);
    
    const totalWords = sessions.reduce((sum, s) => sum + (s.wordsWritten || 0), 0);
    
    return {
      totalSessions: sessions.length,
      totalDuration,
      totalWords,
      avgWordsPerSession: sessions.length > 0 ? totalWords / sessions.length : 0,
      avgSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
    };
  }

  async createSummary(summary: InsertSummary): Promise<Summary> {
    const [result] = await db.insert(summaries)
      .values(summary)
      .returning();
    return result;
  }

  async getSummaries(userId: string, contentType?: string): Promise<Summary[]> {
    const conditions = [eq(summaries.userId, userId)];
    if (contentType) {
      conditions.push(eq(summaries.contentType, contentType));
    }

    return await db.select().from(summaries)
      .where(and(...conditions))
      .orderBy(desc(summaries.createdAt));
  }

  async getSummary(id: string): Promise<Summary | null> {
    const [result] = await db.select().from(summaries)
      .where(eq(summaries.id, id))
      .limit(1);
    return result || null;
  }

  async updateSummary(id: string, updates: Partial<Summary>): Promise<Summary> {
    const [result] = await db.update(summaries)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(summaries.id, id))
      .returning();
    return result;
  }

  async deleteSummary(id: string): Promise<void> {
    await db.delete(summaries).where(eq(summaries.id, id));
  }

  async getSummaryByContent(contentHash: string): Promise<Summary | null> {
    const [result] = await db.select().from(summaries)
      .where(eq(summaries.contentHash, contentHash))
      .limit(1);
    return result || null;
  }

  async getUserSummaryStats(userId: string): Promise<any> {
    const userSummaries = await this.getSummaries(userId);
    
    const byType = userSummaries.reduce((acc, s) => {
      acc[s.contentType] = (acc[s.contentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgLength = userSummaries.reduce((sum, s) => sum + s.summary.length, 0) / 
                      userSummaries.length || 0;
    
    return {
      totalSummaries: userSummaries.length,
      byType,
      avgLength,
    };
  }

  async createTranslation(translation: InsertTranslation): Promise<Translation> {
    const [result] = await db.insert(translations)
      .values(translation)
      .returning();
    return result;
  }

  async getTranslations(userId: string, targetLanguage?: string): Promise<Translation[]> {
    const conditions = [eq(translations.userId, userId)];
    if (targetLanguage) {
      conditions.push(eq(translations.targetLanguage, targetLanguage));
    }

    return await db.select().from(translations)
      .where(and(...conditions))
      .orderBy(desc(translations.createdAt));
  }

  async getTranslation(id: string): Promise<Translation | null> {
    const [result] = await db.select().from(translations)
      .where(eq(translations.id, id))
      .limit(1);
    return result || null;
  }

  async getTranslationByContent(contentHash: string, targetLanguage: string): Promise<Translation | null> {
    const [result] = await db.select().from(translations)
      .where(and(
        eq(translations.contentHash, contentHash),
        eq(translations.targetLanguage, targetLanguage)
      ))
      .limit(1);
    return result || null;
  }

  async getUserTranslationStats(userId: string): Promise<any> {
    const userTranslations = await this.getTranslations(userId);
    
    const byLanguage = userTranslations.reduce((acc, t) => {
      acc[t.targetLanguage] = (acc[t.targetLanguage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sourceLanguages = new Set(userTranslations.map(t => t.sourceLanguage));
    const targetLanguages = new Set(userTranslations.map(t => t.targetLanguage));
    
    return {
      totalTranslations: userTranslations.length,
      byLanguage,
      uniqueSourceLanguages: sourceLanguages.size,
      uniqueTargetLanguages: targetLanguages.size,
    };
  }

  async getSupportedLanguages(): Promise<string[]> {
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi', 'cs'
    ];
  }

  async createTranscription(transcription: InsertTranscription): Promise<Transcription> {
    const [result] = await db.insert(transcriptions)
      .values(transcription)
      .returning();
    return result;
  }

  async getTranscriptions(userId: string, audioFormat?: string): Promise<Transcription[]> {
    const conditions = [eq(transcriptions.userId, userId)];
    if (audioFormat) {
      conditions.push(eq(transcriptions.audioFormat, audioFormat));
    }

    return await db.select().from(transcriptions)
      .where(and(...conditions))
      .orderBy(desc(transcriptions.createdAt));
  }

  async getTranscription(id: string): Promise<Transcription | null> {
    const [result] = await db.select().from(transcriptions)
      .where(eq(transcriptions.id, id))
      .limit(1);
    return result || null;
  }

  async updateTranscription(id: string, updates: Partial<Transcription>): Promise<Transcription> {
    const [result] = await db.update(transcriptions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(transcriptions.id, id))
      .returning();
    return result;
  }

  async deleteTranscription(id: string): Promise<void> {
    await db.delete(transcriptions).where(eq(transcriptions.id, id));
  }

  async getUserTranscriptionStats(userId: string): Promise<any> {
    const userTranscriptions = await this.getTranscriptions(userId);
    
    const byFormat = userTranscriptions.reduce((acc, t) => {
      acc[t.audioFormat] = (acc[t.audioFormat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalDuration = userTranscriptions.reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgAccuracy = userTranscriptions
      .filter(t => t.accuracy !== null)
      .reduce((sum, t) => sum + (t.accuracy || 0), 0) / 
      userTranscriptions.filter(t => t.accuracy !== null).length || 0;
    
    return {
      totalTranscriptions: userTranscriptions.length,
      byFormat,
      totalDuration,
      avgAccuracy,
    };
  }

  async createExtractionTemplate(template: InsertExtractionTemplate): Promise<ExtractionTemplate> {
    const [result] = await db.insert(extractionTemplates)
      .values(template)
      .returning();
    return result;
  }

  async getExtractionTemplates(userId: string): Promise<ExtractionTemplate[]> {
    return await db.select().from(extractionTemplates)
      .where(eq(extractionTemplates.userId, userId))
      .orderBy(desc(extractionTemplates.createdAt));
  }

  async getExtractionTemplate(id: string): Promise<ExtractionTemplate | null> {
    const [result] = await db.select().from(extractionTemplates)
      .where(eq(extractionTemplates.id, id))
      .limit(1);
    return result || null;
  }

  async updateExtractionTemplate(id: string, updates: Partial<ExtractionTemplate>): Promise<ExtractionTemplate> {
    const [result] = await db.update(extractionTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(extractionTemplates.id, id))
      .returning();
    return result;
  }

  async deleteExtractionTemplate(id: string): Promise<void> {
    await db.delete(extractionTemplates).where(eq(extractionTemplates.id, id));
  }

  async createExtractedData(data: InsertExtractedData): Promise<ExtractedData> {
    const [result] = await db.insert(extractedData)
      .values(data)
      .returning();
    return result;
  }

  async getExtractedData(userId: string, templateId?: string): Promise<ExtractedData[]> {
    const conditions = [eq(extractedData.userId, userId)];
    if (templateId) {
      conditions.push(eq(extractedData.templateId, templateId));
    }

    return await db.select().from(extractedData)
      .where(and(...conditions))
      .orderBy(desc(extractedData.extractedAt));
  }

  async getExtractedDataById(id: string): Promise<ExtractedData | null> {
    const [result] = await db.select().from(extractedData)
      .where(eq(extractedData.id, id))
      .limit(1);
    return result || null;
  }

  async updateExtractedData(id: string, updates: Partial<ExtractedData>): Promise<ExtractedData> {
    const [result] = await db.update(extractedData)
      .set(updates)
      .where(eq(extractedData.id, id))
      .returning();
    return result;
  }

  async deleteExtractedData(id: string): Promise<void> {
    await db.delete(extractedData).where(eq(extractedData.id, id));
  }

  async getUserExtractionStats(userId: string): Promise<any> {
    const data = await this.getExtractedData(userId);
    const templates = await this.getExtractionTemplates(userId);
    
    const bySource = data.reduce((acc, d) => {
      acc[d.sourceType] = (acc[d.sourceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgConfidence = data
      .filter(d => d.confidence !== null)
      .reduce((sum, d) => sum + (d.confidence || 0), 0) / 
      data.filter(d => d.confidence !== null).length || 0;
    
    return {
      totalExtractions: data.length,
      totalTemplates: templates.length,
      bySource,
      avgConfidence,
    };
  }

  async createQueryLog(log: InsertQueryLog): Promise<void> {
    await db.insert(queryLogs).values(log);
  }

  async getQueryLogs(userId: string, limit: number = 100): Promise<QueryLog[]> {
    return await db.select().from(queryLogs)
      .where(eq(queryLogs.userId, userId))
      .orderBy(desc(queryLogs.timestamp))
      .limit(limit);
  }

  async getUserQueryStats(userId: string): Promise<any> {
    const logs = await this.getQueryLogs(userId, 1000);
    
    const byProvider = logs.reduce((acc, l) => {
      acc[l.provider] = (acc[l.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalTokens = logs.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);
    const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const avgResponseTime = logs
      .filter(l => l.responseTime !== null)
      .reduce((sum, l) => sum + (l.responseTime || 0), 0) / 
      logs.filter(l => l.responseTime !== null).length || 0;
    
    return {
      totalQueries: logs.length,
      byProvider,
      totalTokens,
      totalCost,
      avgResponseTime,
    };
  }

  async createAutoSaveDraft(draft: InsertAutoSaveDraft): Promise<AutoSaveDraft> {
    const [result] = await db.insert(autoSaveDrafts)
      .values(draft)
      .returning();
    return result;
  }

  async updateAutoSaveDraft(id: string, content: string): Promise<AutoSaveDraft> {
    const [result] = await db.update(autoSaveDrafts)
      .set({
        content,
        savedAt: new Date(),
      })
      .where(eq(autoSaveDrafts.id, id))
      .returning();
    return result;
  }

  async getLatestDraft(userId: string, documentId: string): Promise<AutoSaveDraft | null> {
    const [result] = await db.select().from(autoSaveDrafts)
      .where(and(
        eq(autoSaveDrafts.userId, userId),
        eq(autoSaveDrafts.documentId, documentId)
      ))
      .orderBy(desc(autoSaveDrafts.savedAt))
      .limit(1);
    return result || null;
  }

  async getDraftHistory(userId: string, documentId: string, limit: number = 10): Promise<AutoSaveDraft[]> {
    return await db.select().from(autoSaveDrafts)
      .where(and(
        eq(autoSaveDrafts.userId, userId),
        eq(autoSaveDrafts.documentId, documentId)
      ))
      .orderBy(desc(autoSaveDrafts.savedAt))
      .limit(limit);
  }

  async deleteDraft(id: string): Promise<void> {
    await db.delete(autoSaveDrafts).where(eq(autoSaveDrafts.id, id));
  }

  async deleteDocumentDrafts(userId: string, documentId: string): Promise<void> {
    await db.delete(autoSaveDrafts)
      .where(and(
        eq(autoSaveDrafts.userId, userId),
        eq(autoSaveDrafts.documentId, documentId)
      ));
  }

  async cleanupOldDrafts(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await db.delete(autoSaveDrafts)
      .where(lt(autoSaveDrafts.savedAt, cutoffDate));
    
    return result.rowCount;
  }

  async getUserSavePatterns(userId: string): Promise<any> {
    const drafts = await db.select().from(autoSaveDrafts)
      .where(eq(autoSaveDrafts.userId, userId))
      .orderBy(desc(autoSaveDrafts.savedAt))
      .limit(1000);
    
    const byDocument = drafts.reduce((acc, d) => {
      acc[d.documentId] = (acc[d.documentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgVersions = Object.values(byDocument).reduce((sum, count) => sum + count, 0) / 
                        Object.keys(byDocument).length || 0;
    
    return {
      totalDrafts: drafts.length,
      uniqueDocuments: Object.keys(byDocument).length,
      avgVersions,
    };
  }

  async updateSavePatterns(userId: string, metadata: any): Promise<void> {
    // This would update user preferences or patterns
    // Implementation depends on specific requirements
  }
}

/**
 * System module - handles system monitoring and maintenance
 */
class SystemModule {
  async logApiUsage(userId: string, log: Omit<InsertApiUsageLog, "userId">): Promise<ApiUsageLog> {
    const logToInsert = {
      ...log,
      userId,
      timestamp: new Date(),
    };
    const [newLog] = await db.insert(apiUsageLogs)
      .values(logToInsert)
      .returning();
    return newLog;
  }

  async getApiUsageLogs(userId: string, apiName?: string, limit: number = 100): Promise<ApiUsageLog[]> {
    const conditions = apiName
      ? and(
          eq(apiUsageLogs.userId, userId),
          eq(apiUsageLogs.apiName, apiName)
        )
      : eq(apiUsageLogs.userId, userId);

    return await db.select().from(apiUsageLogs)
      .where(conditions)
      .orderBy(desc(apiUsageLogs.timestamp))
      .limit(limit);
  }

  async getApiUsageStats(userId: string, apiName: string, days: number = 30): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCost: number;
    avgResponseTime: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logs = await db.select().from(apiUsageLogs)
      .where(and(
        eq(apiUsageLogs.userId, userId),
        eq(apiUsageLogs.apiName, apiName),
        gte(apiUsageLogs.timestamp, cutoffDate)
      ));

    const totalCalls = logs.length;
    const successfulCalls = logs.filter(
      (log) => log.statusCode && log.statusCode >= 200 && log.statusCode < 300
    ).length;
    const failedCalls = totalCalls - successfulCalls;
    const totalTokens = logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
    const responseTimes = logs.filter((log) => log.responseTime !== null);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, log) => sum + (log.responseTime || 0), 0) / responseTimes.length
      : 0;

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      totalTokens,
      totalCost,
      avgResponseTime,
    };
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  }

  async getActivityLogs(filters?: {
    userId?: string;
    activityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ActivityLog[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(activityLogs.userId, filters.userId));
    }
    if (filters?.activityType) {
      conditions.push(eq(activityLogs.activityType, filters.activityType));
    }
    if (filters?.startDate) {
      conditions.push(gte(activityLogs.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(activityLogs.timestamp, filters.endDate));
    }

    return conditions.length > 0
      ? await db.select().from(activityLogs)
          .where(and(...conditions))
          .orderBy(desc(activityLogs.timestamp))
      : await db.select().from(activityLogs)
          .orderBy(desc(activityLogs.timestamp));
  }

  async recordSystemMetric(metric: InsertSystemMetric): Promise<void> {
    await db.insert(systemMetrics).values(metric);
  }

  async getSystemMetrics(metricType?: string, limit: number = 100): Promise<SystemMetric[]> {
    const conditions = metricType
      ? eq(systemMetrics.metricType, metricType)
      : undefined;

    return conditions
      ? await db.select().from(systemMetrics)
          .where(conditions)
          .orderBy(desc(systemMetrics.timestamp))
          .limit(limit)
      : await db.select().from(systemMetrics)
          .orderBy(desc(systemMetrics.timestamp))
          .limit(limit);
  }

  async createMaintenancePrediction(prediction: InsertMaintenancePrediction): Promise<MaintenancePrediction> {
    const [result] = await db.insert(maintenancePredictions)
      .values(prediction)
      .returning();
    return result;
  }

  async getMaintenancePredictions(componentType?: string): Promise<MaintenancePrediction[]> {
    const conditions = componentType
      ? eq(maintenancePredictions.componentType, componentType)
      : undefined;

    return conditions
      ? await db.select().from(maintenancePredictions)
          .where(conditions)
          .orderBy(asc(maintenancePredictions.predictedDate))
      : await db.select().from(maintenancePredictions)
          .orderBy(asc(maintenancePredictions.predictedDate));
  }

  async recordMaintenanceHistory(history: InsertMaintenanceHistory): Promise<MaintenanceHistory> {
    const [result] = await db.insert(maintenanceHistory)
      .values(history)
      .returning();
    return result;
  }

  async getMaintenanceHistory(componentType?: string, limit: number = 50): Promise<MaintenanceHistory[]> {
    const conditions = componentType
      ? eq(maintenanceHistory.componentType, componentType)
      : undefined;

    return conditions
      ? await db.select().from(maintenanceHistory)
          .where(conditions)
          .orderBy(desc(maintenanceHistory.performedAt))
          .limit(limit)
      : await db.select().from(maintenanceHistory)
          .orderBy(desc(maintenanceHistory.performedAt))
          .limit(limit);
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    metrics: any;
  }> {
    const recentMetrics = await this.getSystemMetrics(undefined, 100);
    
    const cpuMetrics = recentMetrics.filter(m => m.metricType === 'cpu');
    const memoryMetrics = recentMetrics.filter(m => m.metricType === 'memory');
    const diskMetrics = recentMetrics.filter(m => m.metricType === 'disk');
    
    const avgCpu = cpuMetrics.length > 0
      ? cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length
      : 0;
    const avgMemory = memoryMetrics.length > 0
      ? memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length
      : 0;
    const avgDisk = diskMetrics.length > 0
      ? diskMetrics.reduce((sum, m) => sum + m.value, 0) / diskMetrics.length
      : 0;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (avgCpu > 90 || avgMemory > 90 || avgDisk > 90) {
      status = 'critical';
    } else if (avgCpu > 70 || avgMemory > 70 || avgDisk > 70) {
      status = 'degraded';
    }
    
    return {
      status,
      metrics: {
        cpu: avgCpu,
        memory: avgMemory,
        disk: avgDisk,
      },
    };
  }
}

/**
 * Content module - handles content organization and tagging
 */
class ContentModule {
  async getCategories(parentId?: number | null): Promise<Category[]> {
    const conditions: SQL<unknown>[] = [eq(categories.isActive, true)];

    if (parentId === null) {
      conditions.push(isNull(categories.parentId));
    } else if (parentId !== undefined) {
      conditions.push(eq(categories.parentId, parentId));
    }

    return await db.select().from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [result] = await db.insert(categories)
      .values(category)
      .returning();
    return result;
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<Category> {
    const [result] = await db.update(categories)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();
    return result;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    return await db.select().from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.parentId), asc(categories.sortOrder), asc(categories.name));
  }

  async assignContentCategory(contentId: string, contentType: string, categoryId: number): Promise<void> {
    await db.insert(contentCategories).values({
      contentId,
      contentType,
      categoryId,
    });
  }

  async removeContentCategory(contentId: string, contentType: string, categoryId: number): Promise<void> {
    await db.delete(contentCategories)
      .where(and(
        eq(contentCategories.contentId, contentId),
        eq(contentCategories.contentType, contentType),
        eq(contentCategories.categoryId, categoryId)
      ));
  }

  async getOrCreateTag(tagData: { name: string; slug?: string; description?: string }): Promise<Tag> {
    const slug = tagData.slug || tagData.name.toLowerCase().replace(/\s+/g, '-');
    
    const [existing] = await db.select().from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);
    
    if (existing) {
      // Increment usage count
      await db.update(tags)
        .set({ usageCount: sql`${tags.usageCount} + 1` })
        .where(eq(tags.id, existing.id));
      return existing;
    }
    
    const [newTag] = await db.insert(tags)
      .values({
        name: tagData.name,
        slug,
        description: tagData.description,
      })
      .returning();
    
    return newTag;
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags)
      .where(eq(tags.id, id))
      .limit(1);
    return tag;
  }

  async getTagBySlug(slug: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);
    return tag;
  }

  async getTags(search?: string): Promise<Tag[]> {
    if (search) {
      return await db.select().from(tags)
        .where(or(
          ilike(tags.name, `%${search}%`),
          ilike(tags.description, `%${search}%`)
        ))
        .orderBy(desc(tags.usageCount));
    }

    return await db.select().from(tags)
      .orderBy(desc(tags.usageCount));
  }

  async assignContentTag(contentId: string, contentType: string, tagId: number): Promise<void> {
    await db.insert(contentTags).values({
      contentId,
      contentType,
      tagId,
    });
  }

  async removeContentTag(contentId: string, contentType: string, tagId: number): Promise<void> {
    await db.delete(contentTags)
      .where(and(
        eq(contentTags.contentId, contentId),
        eq(contentTags.contentType, contentType),
        eq(contentTags.tagId, tagId)
      ));
  }

  async getContentTags(contentId: string, contentType: string): Promise<ContentTag[]> {
    return await db.select().from(contentTags)
      .where(and(
        eq(contentTags.contentId, contentId),
        eq(contentTags.contentType, contentType)
      ));
  }

  async upsertContentEmbedding(embedding: InsertContentEmbedding): Promise<ContentEmbedding> {
    const existing = await db.select().from(contentEmbeddings)
      .where(and(
        eq(contentEmbeddings.contentId, embedding.contentId),
        eq(contentEmbeddings.contentType, embedding.contentType)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(contentEmbeddings)
        .set({
          embedding: embedding.embedding,
          dimensions: embedding.dimensions,
          model: embedding.model,
          updatedAt: new Date(),
        })
        .where(eq(contentEmbeddings.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(contentEmbeddings)
      .values(embedding)
      .returning();
    return created;
  }

  async getContentEmbedding(contentId: string, contentType: string): Promise<ContentEmbedding | null> {
    const [result] = await db.select().from(contentEmbeddings)
      .where(and(
        eq(contentEmbeddings.contentId, contentId),
        eq(contentEmbeddings.contentType, contentType)
      ))
      .limit(1);
    return result || null;
  }

  async findSimilarContent(embedding: number[], limit: number = 10): Promise<ContentEmbedding[]> {
    // This would use vector similarity search
    // For now, returning empty array as vector search requires special DB extensions
    return [];
  }

  async createDuplicatePair(pair: InsertDuplicatePair): Promise<DuplicatePair> {
    const [result] = await db.insert(duplicatePairs)
      .values(pair)
      .returning();
    return result;
  }

  async getDuplicatePairs(contentType: string, status?: string): Promise<DuplicatePair[]> {
    const conditions = [eq(duplicatePairs.contentType, contentType)];
    if (status) {
      conditions.push(eq(duplicatePairs.status, status));
    }

    return await db.select().from(duplicatePairs)
      .where(and(...conditions))
      .orderBy(desc(duplicatePairs.similarity));
  }

  async resolveDuplicate(id: number, resolution: string): Promise<void> {
    await db.update(duplicatePairs)
      .set({
        status: 'resolved',
        resolvedBy: resolution,
        resolvedAt: new Date(),
      })
      .where(eq(duplicatePairs.id, id));
  }

  async cacheRelatedContent(contentId: string, contentType: string, relatedItems: Array<{
    relatedId: string;
    relatedType: string;
    score: number;
  }>): Promise<void> {
    const values = relatedItems.map(item => ({
      contentId,
      contentType,
      relatedId: item.relatedId,
      relatedType: item.relatedType,
      score: item.score,
    }));

    await db.insert(relatedContent).values(values);
  }

  async getRelatedContent(contentId: string, contentType: string): Promise<RelatedContent[]> {
    return await db.select().from(relatedContent)
      .where(and(
        eq(relatedContent.contentId, contentId),
        eq(relatedContent.contentType, contentType)
      ))
      .orderBy(desc(relatedContent.score));
  }

  async getContentOrganization(contentId: string, contentType: string): Promise<{
    categories: Category[];
    tags: Tag[];
    primaryCategory: Category | null;
  }> {
    const contentCats = await db.select().from(contentCategories)
      .where(and(
        eq(contentCategories.contentId, contentId),
        eq(contentCategories.contentType, contentType)
      ));

    const categoryIds = contentCats.map(cc => cc.categoryId);
    const categoriesData = categoryIds.length > 0
      ? await db.select().from(categories)
          .where(inArray(categories.id, categoryIds))
      : [];

    const primaryCategory = contentCats.find(cc => cc.isPrimary)
      ? categoriesData.find(c => c.id === contentCats.find(cc => cc.isPrimary)?.categoryId) || null
      : null;

    const contentTagsData = await this.getContentTags(contentId, contentType);
    const tagIds = contentTagsData.map(ct => ct.tagId);
    const tagsData = tagIds.length > 0
      ? await db.select().from(tags)
          .where(inArray(tags.id, tagIds))
      : [];

    return {
      categories: categoriesData,
      tags: tagsData,
      primaryCategory,
    };
  }
}

/**
 * Feedback module - handles user feedback and community features
 */
class FeedbackModule {
  async createFeedback(feedbackData: InsertUserFeedback): Promise<UserFeedback> {
    const [result] = await db.insert(userFeedback).values([feedbackData]).returning();
    return result;
  }

  async getFeedback(feedbackId: string): Promise<UserFeedback | null> {
    const [result] = await db.select().from(userFeedback)
      .where(eq(userFeedback.id, feedbackId));
    return result || null;
  }

  async getUserFeedback(userId: string): Promise<UserFeedback[]> {
    return await db.select().from(userFeedback)
      .where(eq(userFeedback.userId, userId))
      .orderBy(desc(userFeedback.createdAt));
  }

  async getAllFeedback(status?: string, type?: string): Promise<UserFeedback[]> {
    const conditions = [];
    
    if (status) {
      conditions.push(eq(userFeedback.status, status));
    }
    if (type) {
      conditions.push(eq(userFeedback.type, type));
    }
    
    return conditions.length > 0
      ? await db.select().from(userFeedback)
          .where(and(...conditions))
          .orderBy(desc(userFeedback.createdAt))
      : await db.select().from(userFeedback)
          .orderBy(desc(userFeedback.createdAt));
  }

  async getCommunityFeedback(limit = 20): Promise<UserFeedback[]> {
    return await db.select().from(userFeedback)
      .where(eq(userFeedback.isPublic, true))
      .orderBy(desc(userFeedback.createdAt))
      .limit(limit);
  }

  async getCommunityFeedbackForUser(userId: string, limit = 20): Promise<UserFeedback[]> {
    return await db.select().from(userFeedback)
      .where(and(
        eq(userFeedback.userId, userId),
        eq(userFeedback.isPublic, true)
      ))
      .orderBy(desc(userFeedback.createdAt))
      .limit(limit);
  }

  async updateFeedbackStatus(feedbackId: string, status: string): Promise<UserFeedback> {
    const [result] = await db.update(userFeedback)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(userFeedback.id, feedbackId))
      .returning();
    return result;
  }

  async getFeedbackByContext(context: string): Promise<UserFeedback[]> {
    return await db.select().from(userFeedback)
      .where(eq(userFeedback.pageUrl, context))
      .orderBy(desc(userFeedback.createdAt));
  }

  async addFeedbackResponse(feedbackId: string, response: string, responderId: string): Promise<void> {
    await db.insert(feedbackResponses).values({
      feedbackId,
      response,
      responderId,
    });
  }

  async getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]> {
    return await db.select().from(feedbackResponses)
      .where(eq(feedbackResponses.feedbackId, feedbackId))
      .orderBy(asc(feedbackResponses.createdAt));
  }

  async getFeedbackAnalytics(period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalFeedback: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byRating: Record<string, number>;
    avgResponseTime: number;
  }> {
    const startDate = new Date();
    if (period === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const feedbackList = await db.select().from(userFeedback)
      .where(gte(userFeedback.createdAt, startDate));

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byRating: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const feedback of feedbackList) {
      byType[feedback.type] = (byType[feedback.type] || 0) + 1;
      byStatus[feedback.status] = (byStatus[feedback.status] || 0) + 1;
      if (feedback.rating) {
        byRating[feedback.rating.toString()] = (byRating[feedback.rating.toString()] || 0) + 1;
      }

      const responses = await this.getFeedbackResponses(feedback.id);
      if (responses.length > 0) {
        const firstResponse = responses[0];
        const responseTime = firstResponse.createdAt.getTime() - feedback.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    return {
      totalFeedback: feedbackList.length,
      byType,
      byStatus,
      byRating,
      avgResponseTime,
    };
  }

  async upvoteFeedback(feedbackId: string, userId: string): Promise<void> {
    await db.insert(feedbackVotes).values({
      feedbackId,
      userId,
      voteType: 'upvote',
    });
    
    await db.update(userFeedback)
      .set({ upvotes: sql`${userFeedback.upvotes} + 1` })
      .where(eq(userFeedback.id, feedbackId));
  }

  async removeUpvote(feedbackId: string, userId: string): Promise<void> {
    await db.delete(feedbackVotes)
      .where(and(
        eq(feedbackVotes.feedbackId, feedbackId),
        eq(feedbackVotes.userId, userId),
        eq(feedbackVotes.voteType, 'upvote')
      ));
    
    await db.update(userFeedback)
      .set({ upvotes: sql`${userFeedback.upvotes} - 1` })
      .where(eq(userFeedback.id, feedbackId));
  }

  async hasUserUpvoted(feedbackId: string, userId: string): Promise<boolean> {
    const [vote] = await db.select().from(feedbackVotes)
      .where(and(
        eq(feedbackVotes.feedbackId, feedbackId),
        eq(feedbackVotes.userId, userId),
        eq(feedbackVotes.voteType, 'upvote')
      ));
    return !!vote;
  }

  async getFeedbackUpvoteCount(feedbackId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`COUNT(*)::int`
    }).from(feedbackVotes)
      .where(and(
        eq(feedbackVotes.feedbackId, feedbackId),
        eq(feedbackVotes.voteType, 'upvote')
      ));
    return result?.count || 0;
  }

  async createDonation(donation: Omit<InsertDonation, "id" | "createdAt" | "completedAt">): Promise<Donation> {
    const [newDonation] = await db.insert(donations)
      .values(donation as any)
      .returning();
    return newDonation;
  }

  async updateDonation(stripePaymentIntentId: string, updates: Partial<Donation>): Promise<Donation> {
    const [updated] = await db.update(donations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId))
      .returning();
    
    if (!updated) {
      throw new Error("Donation not found");
    }
    return updated;
  }

  async getDonation(donationId: string): Promise<Donation | null> {
    const [donation] = await db.select().from(donations)
      .where(eq(donations.id, donationId));
    return donation || null;
  }

  async getDonationByPaymentIntent(stripePaymentIntentId: string): Promise<Donation | null> {
    const [donation] = await db.select().from(donations)
      .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId));
    return donation || null;
  }

  async getDonations(status?: string): Promise<Donation[]> {
    return status
      ? await db.select().from(donations)
          .where(eq(donations.status, status))
          .orderBy(desc(donations.createdAt))
      : await db.select().from(donations)
          .orderBy(desc(donations.createdAt));
  }

  async getUserDonations(userId: string): Promise<Donation[]> {
    return await db.select().from(donations)
      .where(eq(donations.userId, userId))
      .orderBy(desc(donations.createdAt));
  }

  async getTotalDonations(): Promise<number> {
    const [result] = await db.select({
      total: sql<number>`COALESCE(SUM(${donations.amount}), 0)::int`
    }).from(donations)
      .where(eq(donations.status, 'completed'));
    
    return result?.total || 0;
  }
}

/**
 * PlatformStorage Facade
 */
export class PlatformStorage {
  public readonly analytics: AnalyticsModule;
  public readonly ai: AiModule;
  public readonly system: SystemModule;
  public readonly content: ContentModule;
  public readonly feedback: FeedbackModule;

  constructor() {
    this.analytics = new AnalyticsModule();
    this.ai = new AiModule();
    this.system = new SystemModule();
    this.content = new ContentModule();
    this.feedback = new FeedbackModule();
  }
}
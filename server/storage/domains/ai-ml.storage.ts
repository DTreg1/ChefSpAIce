/**
 * @file server/storage/domains/ai-ml.storage.ts
 * @description AI & ML features storage operations
 * 
 * Covers:
 * - Voice commands & transcriptions
 * - Draft generation & templates
 * - Auto-save drafts
 * - Writing assistance (sessions & suggestions)
 * - Content summarization & excerpts
 * - Translations & language preferences
 * - Data extraction templates & results
 * - Natural language query logs
 */

import { db } from "../../db";
import { eq, and, desc, sql, lte } from "drizzle-orm";
import {
  type VoiceCommand,
  type InsertVoiceCommand,
  voiceCommands,
  type DraftTemplate,
  type InsertDraftTemplate,
  draftTemplates,
  type GeneratedDraft,
  type InsertGeneratedDraft,
  generatedDrafts,
  type WritingSession,
  type InsertWritingSession,
  writingSessions,
  type WritingSuggestion,
  type InsertWritingSuggestion,
  writingSuggestions,
  type Summary,
  type InsertSummary,
  summaries,
  type Excerpt,
  excerpts,
  type ExcerptPerformance,
  excerptPerformance,
  type Translation,
  type InsertTranslation,
  translations,
  type LanguagePreference,
  languagePreferences,
  type Transcription,
  type InsertTranscription,
  transcriptions,
  type TranscriptEdit,
  type InsertTranscriptEdit,
  transcriptEdits,
} from "@shared/schema";
import {
  type ExtractionTemplate,
  type InsertExtractionTemplate,
  extractionTemplates,
  type ExtractedData,
  type InsertExtractedData,
  extractedData,
} from "@shared/schema/extraction";
import {
  type QueryLog,
  type InsertQueryLog,
  queryLogs,
} from "@shared/schema/analytics";
import {
  type AutoSaveDraft,
  type InsertAutoSaveDraft,
  autoSaveDrafts,
  type SavePattern,
  savePatterns,
} from "@shared/schema/forms";

// Local type aliases for Insert types (not exported from schema)
type InsertExcerpt = Omit<Excerpt, "id" | "createdAt">;
type InsertExcerptPerformance = Omit<ExcerptPerformance, "id" | "createdAt">;
type InsertLanguagePreference = Omit<LanguagePreference, "id" | "createdAt" | "updatedAt">;

export class AiMlStorage {
  // ==================== Voice Commands ====================

  async createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand> {
    const [result] = await db
      .insert(voiceCommands)
      .values(command)
      .returning();
    return result;
  }

  async getVoiceCommands(
    userId: string,
    intent?: string,
    limit = 20
  ): Promise<VoiceCommand[]> {
    const conditions = [eq(voiceCommands.userId, userId)];
    if (intent) {
      conditions.push(eq(voiceCommands.intent, intent));
    }

    return await db
      .select()
      .from(voiceCommands)
      .where(and(...conditions))
      .orderBy(desc(voiceCommands.createdAt))
      .limit(limit);
  }

  async getVoiceCommand(id: string): Promise<VoiceCommand | null> {
    const [result] = await db
      .select()
      .from(voiceCommands)
      .where(eq(voiceCommands.id, id))
      .limit(1);
    return result || null;
  }

  async getVoiceCommandStats(userId: string): Promise<{
    totalCommands: number;
    avgConfidence: number;
    topIntents: Array<{ intent: string; count: number }>;
  }> {
    const commands = await db
      .select()
      .from(voiceCommands)
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

  // ==================== Draft Templates ====================

  async getDraftTemplates(category?: string): Promise<DraftTemplate[]> {
    if (category) {
      return await db
        .select()
        .from(draftTemplates)
        .where(eq(draftTemplates.category, category))
        .orderBy(desc(draftTemplates.usageCount));
    }

    return await db
      .select()
      .from(draftTemplates)
      .orderBy(desc(draftTemplates.usageCount));
  }

  async getDraftTemplate(id: string): Promise<DraftTemplate | null> {
    const [result] = await db
      .select()
      .from(draftTemplates)
      .where(eq(draftTemplates.id, id))
      .limit(1);
    return result || null;
  }

  async createDraftTemplate(
    template: InsertDraftTemplate
  ): Promise<DraftTemplate> {
    const [result] = await db
      .insert(draftTemplates)
      .values(template)
      .returning();
    return result;
  }

  async updateDraftTemplate(
    id: string,
    updates: Partial<Omit<InsertDraftTemplate, "id">>
  ): Promise<DraftTemplate> {
    const [result] = await db
      .update(draftTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(draftTemplates.id, id))
      .returning();

    if (!result) {
      throw new Error("Draft template not found");
    }

    return result;
  }

  async deleteDraftTemplate(id: string): Promise<void> {
    await db.delete(draftTemplates).where(eq(draftTemplates.id, id));
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    await db
      .update(draftTemplates)
      .set({
        usageCount: sql`${draftTemplates.usageCount} + 1`,
      })
      .where(eq(draftTemplates.id, templateId));
  }

  // ==================== Generated Drafts ====================

  async createGeneratedDraft(
    userId: string,
    draft: Omit<InsertGeneratedDraft, "userId">
  ): Promise<GeneratedDraft> {
    const [result] = await db
      .insert(generatedDrafts)
      .values({ ...draft, userId })
      .returning();
    return result;
  }

  async getGeneratedDrafts(
    userId: string,
    templateId?: string
  ): Promise<GeneratedDraft[]> {
    const conditions = [eq(generatedDrafts.userId, userId)];
    if (templateId) {
      conditions.push(eq(generatedDrafts.templateId, templateId));
    }

    return await db
      .select()
      .from(generatedDrafts)
      .where(and(...conditions))
      .orderBy(desc(generatedDrafts.createdAt));
  }

  async getGeneratedDraft(
    userId: string,
    draftId: string
  ): Promise<GeneratedDraft | null> {
    const [result] = await db
      .select()
      .from(generatedDrafts)
      .where(
        and(
          eq(generatedDrafts.userId, userId),
          eq(generatedDrafts.id, draftId)
        )
      )
      .limit(1);
    return result || null;
  }

  async updateGeneratedDraft(
    userId: string,
    draftId: string,
    updates: Partial<Omit<InsertGeneratedDraft, "userId" | "id">>
  ): Promise<GeneratedDraft> {
    const [result] = await db
      .update(generatedDrafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(generatedDrafts.userId, userId),
          eq(generatedDrafts.id, draftId)
        )
      )
      .returning();

    if (!result) {
      throw new Error("Generated draft not found");
    }

    return result;
  }

  async deleteGeneratedDraft(userId: string, draftId: string): Promise<void> {
    await db
      .delete(generatedDrafts)
      .where(
        and(
          eq(generatedDrafts.userId, userId),
          eq(generatedDrafts.id, draftId)
        )
      );
  }

  async getUserDraftAnalytics(userId: string): Promise<{
    totalDrafts: number;
    avgRating: number;
    avgTokensUsed: number;
    totalTokensUsed: number;
  }> {
    const drafts = await db
      .select()
      .from(generatedDrafts)
      .where(eq(generatedDrafts.userId, userId));

    let totalRating = 0;
    let ratedCount = 0;
    let totalTokens = 0;

    for (const draft of drafts) {
      if (draft.rating !== null) {
        totalRating += draft.rating;
        ratedCount++;
      }
      if (draft.tokensUsed !== null) {
        totalTokens += draft.tokensUsed;
      }
    }

    return {
      totalDrafts: drafts.length,
      avgRating: ratedCount > 0 ? totalRating / ratedCount : 0,
      avgTokensUsed: drafts.length > 0 ? totalTokens / drafts.length : 0,
      totalTokensUsed: totalTokens,
    };
  }

  // ==================== Writing Sessions ====================

  async createWritingSession(
    userId: string,
    session: Omit<InsertWritingSession, "userId">
  ): Promise<WritingSession> {
    const [result] = await db
      .insert(writingSessions)
      .values({ ...session, userId })
      .returning();
    return result;
  }

  async getWritingSession(
    userId: string,
    sessionId: string
  ): Promise<WritingSession | null> {
    const [result] = await db
      .select()
      .from(writingSessions)
      .where(
        and(
          eq(writingSessions.userId, userId),
          eq(writingSessions.id, sessionId)
        )
      )
      .limit(1);
    return result || null;
  }

  async getWritingSessions(
    userId: string,
    limit = 20
  ): Promise<WritingSession[]> {
    return await db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.userId, userId))
      .orderBy(desc(writingSessions.startedAt))
      .limit(limit);
  }

  async updateWritingSession(
    userId: string,
    sessionId: string,
    updates: Partial<Omit<InsertWritingSession, "userId" | "id">>
  ): Promise<WritingSession> {
    const [result] = await db
      .update(writingSessions)
      .set(updates)
      .where(
        and(
          eq(writingSessions.userId, userId),
          eq(writingSessions.id, sessionId)
        )
      )
      .returning();

    if (!result) {
      throw new Error("Writing session not found");
    }

    return result;
  }

  async addWritingSuggestions(
    sessionId: string,
    suggestions: Omit<InsertWritingSuggestion, "sessionId">[]
  ): Promise<WritingSuggestion[]> {
    const values = suggestions.map((s) => ({ ...s, sessionId }));
    return await db.insert(writingSuggestions).values(values).returning();
  }

  async getWritingSuggestions(sessionId: string): Promise<WritingSuggestion[]> {
    return await db
      .select()
      .from(writingSuggestions)
      .where(eq(writingSuggestions.sessionId, sessionId))
      .orderBy(writingSuggestions.createdAt);
  }

  async updateWritingSuggestion(
    suggestionId: string,
    updates: Partial<Omit<InsertWritingSuggestion, "id" | "sessionId">>
  ): Promise<WritingSuggestion> {
    const [result] = await db
      .update(writingSuggestions)
      .set(updates)
      .where(eq(writingSuggestions.id, suggestionId))
      .returning();

    if (!result) {
      throw new Error("Writing suggestion not found");
    }

    return result;
  }

  async getWritingStats(userId: string): Promise<{
    totalSessions: number;
    avgDuration: number;
    totalSuggestionsAccepted: number;
    totalSuggestionsRejected: number;
    acceptanceRate: number;
  }> {
    const sessions = await db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.userId, userId));

    let totalDuration = 0;
    let totalAccepted = 0;
    let totalRejected = 0;

    for (const session of sessions) {
      if (session.duration !== null) {
        totalDuration += session.duration;
      }
      totalAccepted += session.suggestionsAccepted || 0;
      totalRejected += session.suggestionsRejected || 0;
    }

    const totalSuggestions = totalAccepted + totalRejected;

    return {
      totalSessions: sessions.length,
      avgDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      totalSuggestionsAccepted: totalAccepted,
      totalSuggestionsRejected: totalRejected,
      acceptanceRate: totalSuggestions > 0 ? totalAccepted / totalSuggestions : 0,
    };
  }

  // ==================== Summaries ====================

  async getSummaries(userId: string, sourceType?: string): Promise<Summary[]> {
    const conditions = [eq(summaries.userId, userId)];
    if (sourceType) {
      conditions.push(eq(summaries.sourceType, sourceType));
    }

    return await db
      .select()
      .from(summaries)
      .where(and(...conditions))
      .orderBy(desc(summaries.createdAt));
  }

  async getSummary(userId: string, summaryId: string): Promise<Summary | null> {
    const [result] = await db
      .select()
      .from(summaries)
      .where(
        and(eq(summaries.userId, userId), eq(summaries.id, summaryId))
      )
      .limit(1);
    return result || null;
  }

  async createSummary(
    userId: string,
    summary: Omit<InsertSummary, "userId">
  ): Promise<Summary> {
    const [result] = await db
      .insert(summaries)
      .values({ ...summary, userId })
      .returning();
    return result;
  }

  async updateSummary(
    userId: string,
    summaryId: string,
    updates: Partial<Omit<InsertSummary, "userId" | "id">>
  ): Promise<Summary> {
    const [result] = await db
      .update(summaries)
      .set(updates)
      .where(and(eq(summaries.userId, userId), eq(summaries.id, summaryId)))
      .returning();

    if (!result) {
      throw new Error("Summary not found");
    }

    return result;
  }

  async deleteSummary(userId: string, summaryId: string): Promise<void> {
    await db
      .delete(summaries)
      .where(and(eq(summaries.userId, userId), eq(summaries.id, summaryId)));
  }

  async getSummariesByType(
    userId: string,
    summaryType: string
  ): Promise<Summary[]> {
    return await db
      .select()
      .from(summaries)
      .where(
        and(
          eq(summaries.userId, userId),
          eq(summaries.summaryType, summaryType)
        )
      )
      .orderBy(desc(summaries.createdAt));
  }

  // ==================== Excerpts ====================

  async getExcerpt(
    summaryId: string,
    category?: string
  ): Promise<Excerpt | null> {
    const conditions = [eq(excerpts.summaryId, summaryId)];
    if (category) {
      conditions.push(eq(excerpts.category, category));
    }

    const [result] = await db
      .select()
      .from(excerpts)
      .where(and(...conditions))
      .limit(1);
    return result || null;
  }

  async getExcerptsBySummary(summaryId: string): Promise<Excerpt[]> {
    return await db
      .select()
      .from(excerpts)
      .where(eq(excerpts.summaryId, summaryId))
      .orderBy(excerpts.position);
  }

  async createExcerpt(excerpt: Omit<InsertExcerpt, "id">): Promise<Excerpt> {
    const [result] = await db
      .insert(excerpts)
      .values(excerpt)
      .returning();
    return result;
  }

  async updateExcerpt(
    excerptId: string,
    updates: Partial<Omit<InsertExcerpt, "id">>
  ): Promise<Excerpt> {
    const [result] = await db
      .update(excerpts)
      .set(updates)
      .where(eq(excerpts.id, excerptId))
      .returning();

    if (!result) {
      throw new Error("Excerpt not found");
    }

    return result;
  }

  async deleteExcerpt(excerptId: string): Promise<void> {
    await db.delete(excerpts).where(eq(excerpts.id, excerptId));
  }

  async recordExcerptPerformance(
    performance: Omit<InsertExcerptPerformance, "id">
  ): Promise<ExcerptPerformance> {
    const [result] = await db
      .insert(excerptPerformance)
      .values(performance)
      .returning();
    return result;
  }

  async getExcerptPerformance(
    excerptId: string
  ): Promise<ExcerptPerformance[]> {
    return await db
      .select()
      .from(excerptPerformance)
      .where(eq(excerptPerformance.excerptId, excerptId))
      .orderBy(desc(excerptPerformance.createdAt));
  }

  // ==================== Translations ====================

  async translateContent(
    userId: string,
    translation: Omit<InsertTranslation, "userId">
  ): Promise<Translation> {
    const [result] = await db
      .insert(translations)
      .values({ ...translation, userId })
      .returning();
    return result;
  }

  async getTranslations(
    userId: string,
    sourceLanguage?: string,
    targetLanguage?: string
  ): Promise<Translation[]> {
    const conditions = [eq(translations.userId, userId)];
    if (sourceLanguage) {
      conditions.push(eq(translations.sourceLanguage, sourceLanguage));
    }
    if (targetLanguage) {
      conditions.push(eq(translations.targetLanguage, targetLanguage));
    }

    return await db
      .select()
      .from(translations)
      .where(and(...conditions))
      .orderBy(desc(translations.createdAt));
  }

  async getTranslation(
    userId: string,
    translationId: string
  ): Promise<Translation | null> {
    const [result] = await db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.userId, userId),
          eq(translations.id, translationId)
        )
      )
      .limit(1);
    return result || null;
  }

  async updateTranslation(
    userId: string,
    translationId: string,
    updates: Partial<Omit<InsertTranslation, "userId" | "id">>
  ): Promise<Translation> {
    const [result] = await db
      .update(translations)
      .set(updates)
      .where(
        and(
          eq(translations.userId, userId),
          eq(translations.id, translationId)
        )
      )
      .returning();

    if (!result) {
      throw new Error("Translation not found");
    }

    return result;
  }

  async deleteTranslation(userId: string, translationId: string): Promise<void> {
    await db
      .delete(translations)
      .where(
        and(
          eq(translations.userId, userId),
          eq(translations.id, translationId)
        )
      );
  }

  async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on common patterns
    // In production, this would use an ML model or external service
    const patterns = {
      es: /\b(el|la|los|las|un|una|es|está|son|que|de|en|y|por|para)\b/gi,
      fr: /\b(le|la|les|un|une|est|sont|que|de|et|pour|avec|dans)\b/gi,
      de: /\b(der|die|das|ein|eine|ist|sind|und|von|zu|mit|für|auf)\b/gi,
      it: /\b(il|lo|la|i|gli|le|un|uno|una|è|sono|che|di|e|per|con)\b/gi,
      pt: /\b(o|a|os|as|um|uma|é|são|que|de|e|para|com|em|por)\b/gi,
      ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
      ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,
      zh: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
      ar: /[\u0600-\u06FF\u0750-\u077F]/,
      ru: /[\u0400-\u04FF]/,
    };

    const scores: Record<string, number> = {};

    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        scores[lang] = matches.length;
      }
    }

    const detectedLang = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return detectedLang ? detectedLang[0] : "en";
  }

  async getSupportedLanguages(): Promise<
    Array<{ code: string; name: string; nativeName: string }>
  > {
    return [
      { code: "en", name: "English", nativeName: "English" },
      { code: "es", name: "Spanish", nativeName: "Español" },
      { code: "fr", name: "French", nativeName: "Français" },
      { code: "de", name: "German", nativeName: "Deutsch" },
      { code: "it", name: "Italian", nativeName: "Italiano" },
      { code: "pt", name: "Portuguese", nativeName: "Português" },
      { code: "ru", name: "Russian", nativeName: "Русский" },
      { code: "ja", name: "Japanese", nativeName: "日本語" },
      { code: "ko", name: "Korean", nativeName: "한국어" },
      { code: "zh", name: "Chinese", nativeName: "中文" },
      { code: "ar", name: "Arabic", nativeName: "العربية" },
      { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
      { code: "nl", name: "Dutch", nativeName: "Nederlands" },
      { code: "sv", name: "Swedish", nativeName: "Svenska" },
      { code: "pl", name: "Polish", nativeName: "Polski" },
    ];
  }

  async getLanguagePreferences(
    userId: string
  ): Promise<LanguagePreference | null> {
    const [result] = await db
      .select()
      .from(languagePreferences)
      .where(eq(languagePreferences.userId, userId))
      .limit(1);
    return result || null;
  }

  async upsertLanguagePreferences(
    userId: string,
    preferences: Omit<InsertLanguagePreference, "userId">
  ): Promise<LanguagePreference> {
    const [result] = await db
      .insert(languagePreferences)
      .values({ ...preferences, userId })
      .onConflictDoUpdate({
        target: languagePreferences.userId,
        set: { ...preferences, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  // ==================== Extraction Templates ====================

  async createExtractionTemplate(
    template: InsertExtractionTemplate
  ): Promise<ExtractionTemplate> {
    const [result] = await db
      .insert(extractionTemplates)
      .values(template)
      .returning();
    return result;
  }

  async getExtractionTemplate(id: string): Promise<ExtractionTemplate | null> {
    const [result] = await db
      .select()
      .from(extractionTemplates)
      .where(eq(extractionTemplates.id, id))
      .limit(1);
    return result || null;
  }

  async getExtractionTemplates(
    isActive?: boolean
  ): Promise<ExtractionTemplate[]> {
    if (isActive !== undefined) {
      return await db
        .select()
        .from(extractionTemplates)
        .where(eq(extractionTemplates.isActive, isActive))
        .orderBy(desc(extractionTemplates.usageCount));
    }

    return await db
      .select()
      .from(extractionTemplates)
      .orderBy(desc(extractionTemplates.usageCount));
  }

  async updateExtractionTemplate(
    id: string,
    updates: Partial<Omit<InsertExtractionTemplate, "id">>
  ): Promise<ExtractionTemplate> {
    const [result] = await db
      .update(extractionTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(extractionTemplates.id, id))
      .returning();

    if (!result) {
      throw new Error("Extraction template not found");
    }

    return result;
  }

  async deleteExtractionTemplate(id: string): Promise<void> {
    await db.delete(extractionTemplates).where(eq(extractionTemplates.id, id));
  }

  async incrementExtractionTemplateUsage(templateId: string): Promise<void> {
    await db
      .update(extractionTemplates)
      .set({
        usageCount: sql`${extractionTemplates.usageCount} + 1`,
      })
      .where(eq(extractionTemplates.id, templateId));
  }

  // ==================== Extracted Data ====================

  async createExtractedData(
    data: InsertExtractedData
  ): Promise<ExtractedData> {
    const [result] = await db
      .insert(extractedData)
      .values(data)
      .returning();
    return result;
  }

  async getExtractedData(id: string): Promise<ExtractedData | null> {
    const [result] = await db
      .select()
      .from(extractedData)
      .where(eq(extractedData.id, id))
      .limit(1);
    return result || null;
  }

  async getExtractedDataBySource(
    sourceId: string,
    sourceType?: string
  ): Promise<ExtractedData[]> {
    const conditions = [eq(extractedData.sourceId, sourceId)];
    if (sourceType) {
      conditions.push(eq(extractedData.sourceType, sourceType));
    }

    return await db
      .select()
      .from(extractedData)
      .where(and(...conditions))
      .orderBy(desc(extractedData.extractedAt));
  }

  async getExtractedDataByTemplate(
    templateId: string
  ): Promise<ExtractedData[]> {
    return await db
      .select()
      .from(extractedData)
      .where(eq(extractedData.templateId, templateId))
      .orderBy(desc(extractedData.extractedAt));
  }

  async updateExtractedData(
    id: string,
    updates: Partial<Omit<InsertExtractedData, "id">>
  ): Promise<ExtractedData> {
    const [result] = await db
      .update(extractedData)
      .set(updates)
      .where(eq(extractedData.id, id))
      .returning();

    if (!result) {
      throw new Error("Extracted data not found");
    }

    return result;
  }

  async validateExtractedData(
    id: string,
    validatedBy: string
  ): Promise<ExtractedData> {
    const [result] = await db
      .update(extractedData)
      .set({
        validationStatus: "validated",
        validatedBy,
        validatedAt: new Date(),
      })
      .where(eq(extractedData.id, id))
      .returning();

    if (!result) {
      throw new Error("Extracted data not found");
    }

    return result;
  }

  async deleteExtractedData(id: string): Promise<void> {
    await db.delete(extractedData).where(eq(extractedData.id, id));
  }

  // ==================== Transcriptions ====================

  async createTranscription(
    userId: string,
    transcription: Omit<InsertTranscription, "userId">
  ): Promise<Transcription> {
    const [result] = await db
      .insert(transcriptions)
      .values({ ...transcription, userId })
      .returning();
    return result;
  }

  async getTranscription(
    userId: string,
    transcriptionId: string
  ): Promise<Transcription | null> {
    const [result] = await db
      .select()
      .from(transcriptions)
      .where(
        and(
          eq(transcriptions.userId, userId),
          eq(transcriptions.id, transcriptionId)
        )
      )
      .limit(1);
    return result || null;
  }

  async getTranscriptions(
    userId: string,
    status?: "processing" | "completed" | "failed",
    limit = 20
  ): Promise<Transcription[]> {
    const conditions = [eq(transcriptions.userId, userId)];
    if (status) {
      conditions.push(eq(transcriptions.status, status));
    }

    return await db
      .select()
      .from(transcriptions)
      .where(and(...conditions))
      .orderBy(desc(transcriptions.createdAt))
      .limit(limit);
  }

  async updateTranscription(
    userId: string,
    transcriptionId: string,
    updates: Partial<Omit<InsertTranscription, "userId" | "id">>
  ): Promise<Transcription> {
    const [result] = await db
      .update(transcriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(transcriptions.userId, userId),
          eq(transcriptions.id, transcriptionId)
        )
      )
      .returning();

    if (!result) {
      throw new Error("Transcription not found");
    }

    return result;
  }

  async deleteTranscription(
    userId: string,
    transcriptionId: string
  ): Promise<void> {
    await db
      .delete(transcriptions)
      .where(
        and(
          eq(transcriptions.userId, userId),
          eq(transcriptions.id, transcriptionId)
        )
      );
  }

  // ==================== Transcript Edits ====================

  async createTranscriptEdit(
    edit: InsertTranscriptEdit
  ): Promise<TranscriptEdit> {
    const [result] = await db
      .insert(transcriptEdits)
      .values(edit)
      .returning();
    return result;
  }

  async getTranscriptEdits(
    transcriptionId: string
  ): Promise<TranscriptEdit[]> {
    return await db
      .select()
      .from(transcriptEdits)
      .where(eq(transcriptEdits.transcriptionId, transcriptionId))
      .orderBy(transcriptEdits.timestamp);
  }

  async updateTranscriptEdit(
    editId: string,
    updates: Partial<Omit<InsertTranscriptEdit, "id">>
  ): Promise<TranscriptEdit> {
    const [result] = await db
      .update(transcriptEdits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(transcriptEdits.id, editId))
      .returning();

    if (!result) {
      throw new Error("Transcript edit not found");
    }

    return result;
  }

  async deleteTranscriptEdit(editId: string): Promise<void> {
    await db.delete(transcriptEdits).where(eq(transcriptEdits.id, editId));
  }

  // ==================== Query Logs ====================

  async createQueryLog(
    userId: string,
    log: Omit<InsertQueryLog, "userId">
  ): Promise<QueryLog> {
    const [result] = await db
      .insert(queryLogs)
      .values({ ...log, userId })
      .returning();
    return result;
  }

  async getQueryLogs(userId: string, limit = 20): Promise<QueryLog[]> {
    return await db
      .select()
      .from(queryLogs)
      .where(eq(queryLogs.userId, userId))
      .orderBy(desc(queryLogs.timestamp))
      .limit(limit);
  }

  async getSavedQueries(userId: string): Promise<QueryLog[]> {
    // Note: queryLogs table doesn't have isSaved field
    // This returns all queries for the user
    return await db
      .select()
      .from(queryLogs)
      .where(eq(queryLogs.userId, userId))
      .orderBy(desc(queryLogs.timestamp));
  }

  async saveQuery(
    userId: string,
    queryId: string,
    savedName: string
  ): Promise<QueryLog> {
    // Note: queryLogs table doesn't have isSaved/savedName fields
    // This is a no-op that returns the existing query
    const [result] = await db
      .select()
      .from(queryLogs)
      .where(and(eq(queryLogs.id, queryId), eq(queryLogs.userId, userId)))
      .limit(1);

    if (!result) {
      throw new Error("Query not found");
    }

    return result;
  }

  async updateQueryLog(
    queryId: string,
    updates: Partial<QueryLog>
  ): Promise<QueryLog> {
    const [result] = await db
      .update(queryLogs)
      .set(updates)
      .where(eq(queryLogs.id, queryId))
      .returning();

    if (!result) {
      throw new Error("Query log not found");
    }

    return result;
  }

  async deleteQueryLog(userId: string, queryId: string): Promise<void> {
    await db
      .delete(queryLogs)
      .where(and(eq(queryLogs.id, queryId), eq(queryLogs.userId, userId)));
  }

  // ==================== Auto-Save Drafts ====================

  async saveDraft(draft: InsertAutoSaveDraft): Promise<AutoSaveDraft> {
    // Get the latest version for this document to increment
    const latestDraft = await this.getLatestDraft(
      draft.userId,
      draft.documentId
    );
    const nextVersion = latestDraft ? (latestDraft.version || 0) + 1 : 1;

    // Calculate content hash for duplicate detection
    const crypto = await import("crypto");
    const contentHash = crypto
      .createHash("sha256")
      .update(draft.content)
      .digest("hex");

    // Skip saving if content hasn't changed
    if (latestDraft && latestDraft.contentHash === contentHash) {
      return latestDraft;
    }

    // Save the draft with incremented version
    const [savedDraft] = await db
      .insert(autoSaveDrafts)
      .values({
        userId: draft.userId,
        documentId: draft.documentId,
        documentType: draft.documentType,
        content: draft.content,
        contentHash,
        version: nextVersion,
        metadata: draft.metadata,
        isAutoSave: draft.isAutoSave ?? true,
        conflictResolved: draft.conflictResolved ?? false,
      })
      .returning();

    // Clean up old versions (keep only last 10)
    const allVersions = await this.getDraftVersions(
      draft.userId,
      draft.documentId
    );
    if (allVersions.length > 10) {
      const versionsToDelete = allVersions.slice(10).map((v) => v.id);
      await db
        .delete(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.userId, draft.userId),
            sql`${autoSaveDrafts.id} = ANY(${versionsToDelete})`
          )
        );
    }

    return savedDraft;
  }

  async getLatestDraft(
    userId: string,
    documentId: string
  ): Promise<AutoSaveDraft | null> {
    const [draft] = await db
      .select()
      .from(autoSaveDrafts)
      .where(
        and(
          eq(autoSaveDrafts.userId, userId),
          eq(autoSaveDrafts.documentId, documentId)
        )
      )
      .orderBy(desc(autoSaveDrafts.version))
      .limit(1);
    return draft || null;
  }

  async getDraftVersions(
    userId: string,
    documentId: string,
    limit = 10
  ): Promise<AutoSaveDraft[]> {
    return await db
      .select()
      .from(autoSaveDrafts)
      .where(
        and(
          eq(autoSaveDrafts.userId, userId),
          eq(autoSaveDrafts.documentId, documentId)
        )
      )
      .orderBy(desc(autoSaveDrafts.version))
      .limit(limit);
  }

  async deleteDraft(userId: string, draftId: string): Promise<void> {
    await db
      .delete(autoSaveDrafts)
      .where(
        and(
          eq(autoSaveDrafts.id, draftId),
          eq(autoSaveDrafts.userId, userId)
        )
      );
  }

  async deleteDocumentDrafts(
    userId: string,
    documentId: string
  ): Promise<void> {
    await db
      .delete(autoSaveDrafts)
      .where(
        and(
          eq(autoSaveDrafts.userId, userId),
          eq(autoSaveDrafts.documentId, documentId)
        )
      );
  }

  async cleanupOldDrafts(userId?: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const conditions = [lte(autoSaveDrafts.savedAt, thirtyDaysAgo)];
    if (userId) {
      conditions.push(eq(autoSaveDrafts.userId, userId));
    }

    const draftsToDelete = await db
      .select({ id: autoSaveDrafts.id })
      .from(autoSaveDrafts)
      .where(and(...conditions));

    if (draftsToDelete.length > 0) {
      await db.delete(autoSaveDrafts).where(and(...conditions));
    }

    return draftsToDelete.length;
  }

  async getUserSavePatterns(userId: string): Promise<SavePattern | null> {
    const [pattern] = await db
      .select()
      .from(savePatterns)
      .where(eq(savePatterns.userId, userId))
      .limit(1);

    if (!pattern) {
      // Create default pattern for new user
      const [newPattern] = await db
        .insert(savePatterns)
        .values({
          avgPauseDuration: 2000,
          typingSpeed: 40,
          saveFrequency: 0.5,
          sentencePauseDuration: 2500,
          paragraphPauseDuration: 4000,
          preferredSaveInterval: 3000,
          totalSessions: 0,
        })
        .returning();
      return newPattern;
    }

    return pattern;
  }

  async updateSavePatterns(
    userId: string,
    patterns: Partial<Omit<SavePattern, "id" | "userId">>
  ): Promise<SavePattern> {
    const [result] = await db
      .update(savePatterns)
      .set(patterns)
      .where(eq(savePatterns.userId, userId))
      .returning();

    if (!result) {
      throw new Error("Save patterns not found");
    }

    return result;
  }
}

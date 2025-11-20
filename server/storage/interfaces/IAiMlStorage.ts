/**
 * @file server/storage/interfaces/IAiMlStorage.ts
 * @description Interface for AI & ML storage operations
 */

import type {
  VoiceCommand,
  InsertVoiceCommand,
  DraftTemplate,
  InsertDraftTemplate,
  GeneratedDraft,
  InsertGeneratedDraft,
  WritingSession,
  InsertWritingSession,
  WritingSuggestion,
  InsertWritingSuggestion,
  Summary,
  InsertSummary,
  Excerpt,
  ExcerptPerformance,
  Translation,
  InsertTranslation,
  LanguagePreference,
  Transcription,
  InsertTranscription,
  TranscriptEdit,
  InsertTranscriptEdit,
} from "@shared/schema";
import type {
  ExtractionTemplate,
  InsertExtractionTemplate,
  ExtractedData,
  InsertExtractedData,
} from "@shared/schema/extraction";
import type {
  QueryLog,
  InsertQueryLog,
} from "@shared/schema/analytics";
import type {
  AutoSaveDraft,
  InsertAutoSaveDraft,
  SavePattern,
} from "@shared/schema/forms";

// Local type aliases for Insert types (not exported from schema)
type InsertExcerpt = Omit<Excerpt, "id" | "createdAt">;
type InsertExcerptPerformance = Omit<ExcerptPerformance, "id" | "createdAt">;
type InsertLanguagePreference = Omit<LanguagePreference, "id" | "createdAt" | "updatedAt">;

export interface IAiMlStorage {
  // ==================== Voice Commands ====================
  createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand>;
  getVoiceCommands(
    userId: string,
    intent?: string,
    limit?: number
  ): Promise<VoiceCommand[]>;
  getVoiceCommand(id: string): Promise<VoiceCommand | null>;
  getVoiceCommandStats(userId: string): Promise<{
    totalCommands: number;
    avgConfidence: number;
    topIntents: Array<{ intent: string; count: number }>;
  }>;

  // ==================== Draft Templates ====================
  getDraftTemplates(category?: string): Promise<DraftTemplate[]>;
  getDraftTemplate(id: string): Promise<DraftTemplate | null>;
  createDraftTemplate(template: InsertDraftTemplate): Promise<DraftTemplate>;
  updateDraftTemplate(
    id: string,
    updates: Partial<Omit<InsertDraftTemplate, "id">>
  ): Promise<DraftTemplate>;
  deleteDraftTemplate(id: string): Promise<void>;
  incrementTemplateUsage(templateId: string): Promise<void>;

  // ==================== Generated Drafts ====================
  createGeneratedDraft(
    userId: string,
    draft: Omit<InsertGeneratedDraft, "userId">
  ): Promise<GeneratedDraft>;
  getGeneratedDrafts(
    userId: string,
    templateId?: string
  ): Promise<GeneratedDraft[]>;
  getGeneratedDraft(
    userId: string,
    draftId: string
  ): Promise<GeneratedDraft | null>;
  updateGeneratedDraft(
    userId: string,
    draftId: string,
    updates: Partial<Omit<InsertGeneratedDraft, "userId" | "id">>
  ): Promise<GeneratedDraft>;
  deleteGeneratedDraft(userId: string, draftId: string): Promise<void>;
  getUserDraftAnalytics(userId: string): Promise<{
    totalDrafts: number;
    avgRating: number;
    avgTokensUsed: number;
    totalTokensUsed: number;
  }>;

  // ==================== Writing Sessions ====================
  createWritingSession(
    userId: string,
    session: Omit<InsertWritingSession, "userId">
  ): Promise<WritingSession>;
  getWritingSession(
    userId: string,
    sessionId: string
  ): Promise<WritingSession | null>;
  getWritingSessions(userId: string, limit?: number): Promise<WritingSession[]>;
  updateWritingSession(
    userId: string,
    sessionId: string,
    updates: Partial<Omit<InsertWritingSession, "userId" | "id">>
  ): Promise<WritingSession>;
  addWritingSuggestions(
    sessionId: string,
    suggestions: Omit<InsertWritingSuggestion, "sessionId">[]
  ): Promise<WritingSuggestion[]>;
  getWritingSuggestions(sessionId: string): Promise<WritingSuggestion[]>;
  updateWritingSuggestion(
    suggestionId: string,
    updates: Partial<Omit<InsertWritingSuggestion, "id" | "sessionId">>
  ): Promise<WritingSuggestion>;
  getWritingStats(userId: string): Promise<{
    totalSessions: number;
    avgDuration: number;
    totalSuggestionsAccepted: number;
    totalSuggestionsRejected: number;
    acceptanceRate: number;
  }>;

  // ==================== Summaries ====================
  getSummaries(userId: string, sourceType?: string): Promise<Summary[]>;
  getSummary(userId: string, summaryId: string): Promise<Summary | null>;
  createSummary(
    userId: string,
    summary: Omit<InsertSummary, "userId">
  ): Promise<Summary>;
  updateSummary(
    userId: string,
    summaryId: string,
    updates: Partial<Omit<InsertSummary, "userId" | "id">>
  ): Promise<Summary>;
  deleteSummary(userId: string, summaryId: string): Promise<void>;
  getSummariesByType(userId: string, summaryType: string): Promise<Summary[]>;

  // ==================== Excerpts ====================
  getExcerpt(summaryId: string, category?: string): Promise<Excerpt | null>;
  getExcerptsBySummary(summaryId: string): Promise<Excerpt[]>;
  createExcerpt(excerpt: Omit<InsertExcerpt, "id">): Promise<Excerpt>;
  updateExcerpt(
    excerptId: string,
    updates: Partial<Omit<InsertExcerpt, "id">>
  ): Promise<Excerpt>;
  deleteExcerpt(excerptId: string): Promise<void>;
  recordExcerptPerformance(
    performance: Omit<InsertExcerptPerformance, "id">
  ): Promise<ExcerptPerformance>;
  getExcerptPerformance(excerptId: string): Promise<ExcerptPerformance[]>;

  // ==================== Translations ====================
  translateContent(
    userId: string,
    translation: Omit<InsertTranslation, "userId">
  ): Promise<Translation>;
  getTranslations(
    userId: string,
    sourceLanguage?: string,
    targetLanguage?: string
  ): Promise<Translation[]>;
  getTranslation(
    userId: string,
    translationId: string
  ): Promise<Translation | null>;
  updateTranslation(
    userId: string,
    translationId: string,
    updates: Partial<Omit<InsertTranslation, "userId" | "id">>
  ): Promise<Translation>;
  deleteTranslation(userId: string, translationId: string): Promise<void>;
  detectLanguage(text: string): Promise<string>;
  getSupportedLanguages(): Promise<
    Array<{ code: string; name: string; nativeName: string }>
  >;
  getLanguagePreferences(userId: string): Promise<LanguagePreference | null>;
  upsertLanguagePreferences(
    userId: string,
    preferences: Omit<InsertLanguagePreference, "userId">
  ): Promise<LanguagePreference>;

  // ==================== Extraction Templates ====================
  createExtractionTemplate(
    template: InsertExtractionTemplate
  ): Promise<ExtractionTemplate>;
  getExtractionTemplate(id: string): Promise<ExtractionTemplate | null>;
  getExtractionTemplates(isActive?: boolean): Promise<ExtractionTemplate[]>;
  updateExtractionTemplate(
    id: string,
    updates: Partial<Omit<InsertExtractionTemplate, "id">>
  ): Promise<ExtractionTemplate>;
  deleteExtractionTemplate(id: string): Promise<void>;
  incrementExtractionTemplateUsage(templateId: string): Promise<void>;

  // ==================== Extracted Data ====================
  createExtractedData(data: InsertExtractedData): Promise<ExtractedData>;
  getExtractedData(id: string): Promise<ExtractedData | null>;
  getExtractedDataBySource(
    sourceId: string,
    sourceType?: string
  ): Promise<ExtractedData[]>;
  getExtractedDataByTemplate(templateId: string): Promise<ExtractedData[]>;
  updateExtractedData(
    id: string,
    updates: Partial<Omit<InsertExtractedData, "id">>
  ): Promise<ExtractedData>;
  validateExtractedData(
    id: string,
    validatedBy: string
  ): Promise<ExtractedData>;
  deleteExtractedData(id: string): Promise<void>;

  // ==================== Transcriptions ====================
  createTranscription(
    userId: string,
    transcription: Omit<InsertTranscription, "userId">
  ): Promise<Transcription>;
  getTranscription(
    userId: string,
    transcriptionId: string
  ): Promise<Transcription | null>;
  getTranscriptions(
    userId: string,
    status?: "processing" | "completed" | "failed",
    limit?: number
  ): Promise<Transcription[]>;
  updateTranscription(
    userId: string,
    transcriptionId: string,
    updates: Partial<Omit<InsertTranscription, "userId" | "id">>
  ): Promise<Transcription>;
  deleteTranscription(userId: string, transcriptionId: string): Promise<void>;

  // ==================== Transcript Edits ====================
  createTranscriptEdit(edit: InsertTranscriptEdit): Promise<TranscriptEdit>;
  getTranscriptEdits(transcriptionId: string): Promise<TranscriptEdit[]>;
  updateTranscriptEdit(
    editId: string,
    updates: Partial<Omit<InsertTranscriptEdit, "id">>
  ): Promise<TranscriptEdit>;
  deleteTranscriptEdit(editId: string): Promise<void>;

  // ==================== Query Logs ====================
  createQueryLog(
    userId: string,
    log: Omit<InsertQueryLog, "userId">
  ): Promise<QueryLog>;
  getQueryLogs(userId: string, limit?: number): Promise<QueryLog[]>;
  getSavedQueries(userId: string): Promise<QueryLog[]>;
  saveQuery(
    userId: string,
    queryId: string,
    savedName: string
  ): Promise<QueryLog>;
  updateQueryLog(queryId: string, updates: Partial<QueryLog>): Promise<QueryLog>;
  deleteQueryLog(userId: string, queryId: string): Promise<void>;

  // ==================== Auto-Save Drafts ====================
  saveDraft(draft: InsertAutoSaveDraft): Promise<AutoSaveDraft>;
  getLatestDraft(
    userId: string,
    documentId: string
  ): Promise<AutoSaveDraft | null>;
  getDraftVersions(
    userId: string,
    documentId: string,
    limit?: number
  ): Promise<AutoSaveDraft[]>;
  deleteDraft(userId: string, draftId: string): Promise<void>;
  deleteDocumentDrafts(userId: string, documentId: string): Promise<void>;
  cleanupOldDrafts(userId?: string): Promise<number>;
  getUserSavePatterns(userId: string): Promise<SavePattern | null>;
  updateSavePatterns(
    userId: string,
    patterns: Partial<Omit<SavePattern, "id" | "userId">>
  ): Promise<SavePattern>;
}

/**
 * @file server/storage/facades/PlatformStorage.ts
 * @description PlatformStorage facade consolidating platform-wide storage operations
 * 
 * EXPORT PATTERN:
 * - Export CLASS (PlatformStorage) for dependency injection and testing
 * - Export singleton INSTANCE (platformStorageFacade) for convenience in production code
 * 
 * PATTERN: Facades instantiate their own instances of domain storage classes.
 * This enables dependency injection and isolated testing of each domain.
 * 
 * ERROR HANDLING PATTERN:
 * - Facades do NOT catch and swallow storage errors
 * - Facades add context to errors via proxy wrapper before propagating
 * - StorageErrors bubble up to callers with facade context enrichment
 * - All errors are logged at facade level for observability
 */

import { AnalyticsStorage } from "../domains/analytics.storage";
import { AiMlStorage } from "../domains/ai-ml.storage";
import { SystemStorage } from "../domains/system.storage";
import { ContentStorage } from "../domains/content.storage";
import { FeedbackStorage } from "../domains/feedback.storage";
import { createDomainStorageProxy } from "./FacadeErrorBoundary";

const FACADE_NAME = "platform" as const;

/**
 * PlatformStorage facade that consolidates all platform-related storage modules
 * 
 * All domain storage instances are wrapped with error boundary proxies that:
 * 1. Log errors at facade level for observability
 * 2. Enrich StorageErrors with facade context
 * 3. Propagate errors without transformation (StorageErrors remain StorageErrors)
 */
export class PlatformStorage {
  public readonly analytics: AnalyticsStorage;
  public readonly ai: AiMlStorage;
  public readonly system: SystemStorage;
  public readonly content: ContentStorage;
  public readonly feedback: FeedbackStorage;

  constructor() {
    this.analytics = createDomainStorageProxy(
      new AnalyticsStorage(),
      FACADE_NAME,
      "analytics"
    );
    this.ai = createDomainStorageProxy(
      new AiMlStorage(),
      FACADE_NAME,
      "ai"
    );
    this.system = createDomainStorageProxy(
      new SystemStorage(),
      FACADE_NAME,
      "system"
    );
    this.content = createDomainStorageProxy(
      new ContentStorage(),
      FACADE_NAME,
      "content"
    );
    this.feedback = createDomainStorageProxy(
      new FeedbackStorage(),
      FACADE_NAME,
      "feedback"
    );
  }
}

/**
 * Singleton instance for convenient usage in production code.
 * Import this when you don't need dependency injection.
 */
export const platformStorageFacade = new PlatformStorage();

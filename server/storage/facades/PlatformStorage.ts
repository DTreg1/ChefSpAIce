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
 */

import { AnalyticsStorage } from "../domains/analytics.storage";
import { AiMlStorage } from "../domains/ai-ml.storage";
import { SystemStorage } from "../domains/system.storage";
import { ContentStorage } from "../domains/content.storage";
import { FeedbackStorage } from "../domains/feedback.storage";

/**
 * PlatformStorage facade that consolidates all platform-related storage modules
 */
export class PlatformStorage {
  public readonly analytics: AnalyticsStorage;
  public readonly ai: AiMlStorage;
  public readonly system: SystemStorage;
  public readonly content: ContentStorage;
  public readonly feedback: FeedbackStorage;

  constructor() {
    this.analytics = new AnalyticsStorage();
    this.ai = new AiMlStorage();
    this.system = new SystemStorage();
    this.content = new ContentStorage();
    this.feedback = new FeedbackStorage();
  }
}

/**
 * Singleton instance for convenient usage in production code.
 * Import this when you don't need dependency injection.
 */
export const platformStorageFacade = new PlatformStorage();
/**
 * PlatformStorage Facade
 * Consolidates platform-wide storage operations into organized sub-modules
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
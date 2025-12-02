/**
 * Type declarations for sentiment module
 *
 * A AFINN-based sentiment analysis library for Node.js
 */

declare module "sentiment" {
  interface SentimentResult {
    score: number;
    comparative: number;
    calculation: Array<{ [word: string]: number }>;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  interface SentimentOptions {
    extras?: { [word: string]: number };
    language?: string;
  }

  class Sentiment {
    constructor();

    /**
     * Analyze the sentiment of a text string
     * @param text The text to analyze
     * @param options Optional configuration
     * @returns Sentiment analysis result
     */
    analyze(text: string, options?: SentimentOptions): SentimentResult;

    /**
     * Register a new language for sentiment analysis
     * @param languageCode The language code (e.g., 'en', 'es')
     * @param language The language module with word scores
     */
    registerLanguage(languageCode: string, language: any): void;
  }

  export = Sentiment;
}

/**
 * Type declarations for text-readability module
 *
 * This module provides various readability scoring methods for text analysis.
 * CommonJS module with default export.
 */

declare module "text-readability" {
  interface TextReadability {
    /**
     * Calculate the Flesch Reading Ease score
     * Score range: 0-100 (higher is easier to read)
     * @param text The text to analyze
     * @returns The readability score
     */
    fleschReadingEase(text: string): number;

    /**
     * Calculate the Flesch-Kincaid Grade Level
     * @param text The text to analyze
     * @returns The grade level
     */
    fleschKincaidGrade(text: string): number;

    /**
     * Calculate the Gunning Fog Index
     * @param text The text to analyze
     * @returns The fog index score
     */
    gunningFog(text: string): number;

    /**
     * Calculate the SMOG Index
     * @param text The text to analyze
     * @returns The SMOG score
     */
    smogIndex(text: string): number;

    /**
     * Calculate the Automated Readability Index
     * @param text The text to analyze
     * @returns The ARI score
     */
    automatedReadabilityIndex(text: string): number;

    /**
     * Calculate the Coleman-Liau Index
     * @param text The text to analyze
     * @returns The Coleman-Liau score
     */
    colemanLiauIndex(text: string): number;

    /**
     * Calculate the Linsear Write Formula
     * @param text The text to analyze
     * @returns The Linsear Write score
     */
    linsearWriteFormula(text: string): number;

    /**
     * Calculate the Dale-Chall Readability Score
     * @param text The text to analyze
     * @returns The Dale-Chall score
     */
    daleChallReadabilityScore(text: string): number;

    /**
     * Get text statistics
     * @param text The text to analyze
     * @returns Text statistics object
     */
    textStandard(text: string): string;

    /**
     * Count syllables in text
     * @param text The text to analyze
     * @returns Number of syllables
     */
    syllableCount(text: string): number;

    /**
     * Count lexicon (unique words)
     * @param text The text to analyze
     * @returns Number of unique words
     */
    lexiconCount(text: string, removePunctuation?: boolean): number;

    /**
     * Count sentences
     * @param text The text to analyze
     * @returns Number of sentences
     */
    sentenceCount(text: string): number;
  }

  const textReadability: TextReadability;
  export = textReadability;
}

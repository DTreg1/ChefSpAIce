import { db } from "../db";
import { cookingTerms, type CookingTerm } from "@shared/schema";
import { like, or } from "drizzle-orm";
import { foodStorage } from "../storage/index";

export interface DetectedTerm {
  term: string;
  category: string;
  shortDefinition: string;
  longDefinition?: string;
  difficulty?: string;
  tips?: string[];
  tools?: string[];
  relatedTerms?: string[];
  startIndex: number;
  endIndex: number;
}

/**
 * CookingTermsService
 * 
 * Provides intelligent detection and explanation of culinary terminology in recipes.
 * Helps users learn cooking techniques while following recipes.
 * 
 * Features:
 * - Term Detection: Scans recipe text for cooking terminology
 * - Educational Tooltips: Provides definitions, tips, and related terms
 * - Smart Caching: Reduces database queries with 1-hour in-memory cache
 * - Overlap Resolution: Handles compound terms intelligently
 * - Category Organization: Groups terms by technique type
 * 
 * Use Cases:
 * - Recipe Generation: Automatically detects and explains terms in AI-generated recipes
 * - User Education: Beginners can learn techniques as they cook
 * - Search: Users can browse cooking glossary by category
 */
export class CookingTermsService {
  // In-memory cache to avoid repeated database queries
  private static termsCache: CookingTerm[] | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  /**
   * Retrieve all cooking terms with in-memory caching
   * 
   * Caching Strategy:
   * - Cache duration: 1 hour (cooking terms rarely change)
   * - Cache invalidation: Manual via clearCache() method
   * - Reduces database load significantly for term detection
   * 
   * @returns Array of all cooking terms from database
   * @private Internal use only - use public methods for term access
   */
  private static async getTerms(): Promise<CookingTerm[]> {
    const now = Date.now();
    
    // Return cached terms if still fresh
    if (this.termsCache && this.cacheExpiry > now) {
      return this.termsCache;
    }

    try {
      const terms = await foodStorage.getCookingTerms();
      this.termsCache = terms;
      this.cacheExpiry = now + this.CACHE_DURATION;
      return terms;
    } catch (error) {
      console.error("Error fetching cooking terms:", error);
      return [];
    }
  }

  /**
   * Detect cooking terms in recipe text
   * 
   * Scans text for culinary terminology and returns matched terms with position data.
   * Used to add educational tooltips to recipe instructions.
   * 
   * Algorithm:
   * 1. Fetch all cooking terms (from cache if available)
   * 2. For each term, use regex to find whole-word matches in text
   * 3. Track match positions (startIndex, endIndex) for highlighting
   * 4. Sort matches by position in text (left to right)
   * 5. Remove overlapping matches (prefers longer/more specific terms)
   * 
   * Example: "Sauté the onions" detects "Sauté" at position 0-5
   * 
   * @param text - Recipe instruction text to scan
   * @returns Array of detected terms with position and definition data
   */
  static async detectTermsInText(text: string): Promise<DetectedTerm[]> {
    if (!text) return [];
    
    const terms = await this.getTerms();
    const detectedTerms: DetectedTerm[] = [];
    
    // Scan for each term using whole-word regex matching
    // \\b ensures we match "sauté" but not "sautéed" as "sauté"
    for (const term of terms) {
      // Case-insensitive whole word matching
      const regex = new RegExp(`\\b${term.term.toLowerCase()}\\b`, "gi");
      let match;
      
      // Find all occurrences of this term in the text
      while ((match = regex.exec(text)) !== null) {
        detectedTerms.push({
          term: term.term,
          category: term.category,
          shortDefinition: term.shortDefinition,
          longDefinition: term.longDefinition || undefined,
          difficulty: term.difficulty || undefined,
          tips: term.tips || undefined,
          tools: term.tools || undefined,
          relatedTerms: term.relatedTerms || undefined,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
    
    // Sort by position for sequential processing
    detectedTerms.sort((a, b) => a.startIndex - b.startIndex);
    
    // Handle overlaps: "sear" and "searing" at same position → keep longer
    const filteredTerms = this.removeOverlappingTerms(detectedTerms);
    
    return filteredTerms;
  }

  /**
   * Remove overlapping term matches, preferring longer/more specific terms
   * 
   * Handles cases where multiple terms match the same text position:
   * Example: "fold in" vs "fold" → keeps "fold in" (more specific)
   * 
   * Algorithm:
   * - Track the end position of the last kept term
   * - Skip terms that start before the last term ended (overlap)
   * - If overlapping term is longer, replace previous term
   * 
   * @param terms - Detected terms sorted by start position
   * @returns Filtered terms with no overlaps
   * @private Helper method for detectTermsInText
   */
  private static removeOverlappingTerms(terms: DetectedTerm[]): DetectedTerm[] {
    if (terms.length <= 1) return terms;
    
    const filtered: DetectedTerm[] = [];
    let lastEnd = -1;
    
    for (const term of terms) {
      if (term.startIndex >= lastEnd) {
        // No overlap - add this term
        filtered.push(term);
        lastEnd = term.endIndex;
      } else if (term.endIndex > lastEnd) {
        // Overlaps but extends further - check if longer
        const lastTerm = filtered[filtered.length - 1];
        if ((term.endIndex - term.startIndex) > (lastTerm.endIndex - lastTerm.startIndex)) {
          // Current term is longer - replace previous
          filtered[filtered.length - 1] = term;
          lastEnd = term.endIndex;
        }
      }
    }
    
    return filtered;
  }

  /**
   * Search for cooking terms by keyword
   */
  static async searchTerms(query: string): Promise<CookingTerm[]> {
    if (!query || query.trim().length < 2) return [];
    
    try {
      const searchPattern = `%${query}%`;
      const results = await db
        .select()
        .from(cookingTerms)
        .where(
          or(
            like(cookingTerms.term, searchPattern),
            like(cookingTerms.shortDefinition, searchPattern),
            like(cookingTerms.longDefinition, searchPattern)
          )
        )
        .limit(10);
      
      return results;
    } catch (error) {
      console.error("Error searching cooking terms:", error);
      return [];
    }
  }

  /**
   * Get cooking terms by category
   */
  static async getTermsByCategory(category: string): Promise<CookingTerm[]> {
    try {
      const terms = await foodStorage.getCookingTermsByCategory(category);
      return terms;
    } catch (error) {
      console.error("Error fetching terms by category:", error);
      return [];
    }
  }

  /**
   * Get a single cooking term by its name
   */
  static async getTerm(term: string): Promise<CookingTerm | null> {
    try {
      const result = await foodStorage.getCookingTerm(term.toLowerCase());
      return result || null;
    } catch (error) {
      console.error("Error fetching cooking term:", error);
      return null;
    }
  }

  /**
   * Get related terms for a given term
   */
  static async getRelatedTerms(term: string): Promise<CookingTerm[]> {
    try {
      const mainTerm = await this.getTerm(term);
      if (!mainTerm || !mainTerm.relatedTerms || mainTerm.relatedTerms.length === 0) {
        return [];
      }
      
      const relatedTerms: CookingTerm[] = [];
      for (const relatedTerm of mainTerm.relatedTerms) {
        const termData = await this.getTerm(relatedTerm);
        if (termData) {
          relatedTerms.push(termData);
        }
      }
      
      return relatedTerms;
    } catch (error) {
      console.error("Error fetching related terms:", error);
      return [];
    }
  }

  /**
   * Get term categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const terms = await this.getTerms();
      const categories = new Set(terms.map(t => t.category));
      return Array.from(categories).sort();
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }

  /**
   * Clear the terms cache
   */
  static clearCache(): void {
    this.termsCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Format recipe instructions with detected terms marked
   * Returns HTML string with terms wrapped in special tags
   */
  static async formatInstructionsWithTerms(instructions: string): Promise<string> {
    const detectedTerms = await this.detectTermsInText(instructions);
    
    if (detectedTerms.length === 0) {
      return instructions;
    }
    
    let formattedText = instructions;
    
    // Work backwards through the terms to maintain correct indices
    for (let i = detectedTerms.length - 1; i >= 0; i--) {
      const term = detectedTerms[i];
      
      const before = formattedText.substring(0, term.startIndex);
      const termText = formattedText.substring(term.startIndex, term.endIndex);
      const after = formattedText.substring(term.endIndex);
      
      // Wrap the term in a special tag with data attributes
      const wrappedTerm = `<cooking-term data-term="${term.term}" data-category="${term.category}" data-definition="${term.shortDefinition}">${termText}</cooking-term>`;
      
      formattedText = before + wrappedTerm + after;
    }
    
    return formattedText;
  }
}

export default CookingTermsService;
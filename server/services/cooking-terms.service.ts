import { db } from "../db";
import { cookingTerms, type CookingTerm } from "@shared/schema";
import { like, or, sql } from "drizzle-orm";
import { storage } from "../storage";

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

export class CookingTermsService {
  private static termsCache: CookingTerm[] | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  /**
   * Get all cooking terms (with caching)
   */
  private static async getTerms(): Promise<CookingTerm[]> {
    const now = Date.now();
    
    if (this.termsCache && this.cacheExpiry > now) {
      return this.termsCache;
    }

    try {
      const terms = await storage.getCookingTerms();
      this.termsCache = terms;
      this.cacheExpiry = now + this.CACHE_DURATION;
      return terms;
    } catch (error) {
      console.error("Error fetching cooking terms:", error);
      return [];
    }
  }

  /**
   * Detect cooking terms in text (recipe instructions, descriptions, etc.)
   */
  static async detectTermsInText(text: string): Promise<DetectedTerm[]> {
    if (!text) return [];
    
    const terms = await this.getTerms();
    const detectedTerms: DetectedTerm[] = [];
    const textLower = text.toLowerCase();
    
    for (const term of terms) {
      // Create regex for whole word matching
      const regex = new RegExp(`\\b${term.term.toLowerCase()}\\b`, "gi");
      let match;
      
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
    
    // Sort by position in text
    detectedTerms.sort((a, b) => a.startIndex - b.startIndex);
    
    // Remove overlapping terms (keep longer matches)
    const filteredTerms = this.removeOverlappingTerms(detectedTerms);
    
    return filteredTerms;
  }

  /**
   * Remove overlapping terms, keeping the longer matches
   */
  private static removeOverlappingTerms(terms: DetectedTerm[]): DetectedTerm[] {
    if (terms.length <= 1) return terms;
    
    const filtered: DetectedTerm[] = [];
    let lastEnd = -1;
    
    for (const term of terms) {
      if (term.startIndex >= lastEnd) {
        filtered.push(term);
        lastEnd = term.endIndex;
      } else if (term.endIndex > lastEnd) {
        // If this term is longer than the previous one, replace it
        const lastTerm = filtered[filtered.length - 1];
        if ((term.endIndex - term.startIndex) > (lastTerm.endIndex - lastTerm.startIndex)) {
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
      const terms = await storage.getCookingTermsByCategory(category);
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
      const result = await storage.getCookingTerm(term.toLowerCase());
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
    let offset = 0;
    
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
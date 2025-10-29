import { db } from "../db";
import { cookingTerms, type CookingTerm } from "@shared/schema";

interface TermMatch {
  term: string;
  termId: string;
  originalTerm: string;
  start: number;
  end: number;
  shortDefinition: string;
  category: string;
  difficulty?: string | null;
}

interface TermPattern {
  pattern: RegExp;
  term: CookingTerm;
  priority: number;
}

/**
 * Enhanced Cooking Term Detector
 * 
 * Provides intelligent detection of cooking terms with:
 * - Pattern matching with variations (plurals, verb forms)
 * - Context awareness to avoid false positives
 * - Prioritization of longer/compound terms
 * - Performance optimizations with caching
 * - Support for misspellings and regional variations
 */
export class TermDetector {
  private terms: Map<string, CookingTerm> = new Map();
  private patterns: TermPattern[] = [];
  private initialized: boolean = false;
  private lastInitialized: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour
  
  // Performance optimization: LRU cache for detection results
  private detectionCache: Map<string, { result: TermMatch[]; timestamp: number }> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 1000 * 60 * 10; // 10 minutes

  /**
   * Initialize the detector with all cooking terms from database
   */
  async initialize(force: boolean = false) {
    const now = Date.now();
    
    // Skip if recently initialized and not forcing
    if (!force && this.initialized && (now - this.lastInitialized) < this.CACHE_DURATION) {
      return;
    }

    try {
      // Load all cooking terms
      const allTerms = await db.select().from(cookingTerms);
      
      // Clear existing data
      this.terms.clear();
      this.patterns = [];

      // Build lookup map and patterns
      for (const term of allTerms) {
        // Store main term
        this.terms.set(term.term.toLowerCase(), term);
        
        // Store search term variations
        if (term.searchTerms && term.searchTerms.length > 0) {
          for (const searchTerm of term.searchTerms) {
            this.terms.set(searchTerm.toLowerCase(), term);
          }
        }

        // Create pattern for this term
        const pattern = this.createPattern(term);
        if (pattern) {
          this.patterns.push(pattern);
        }
      }

      // Sort patterns by priority (longer terms first, then by specificity)
      this.patterns.sort((a, b) => b.priority - a.priority);

      this.initialized = true;
      this.lastInitialized = now;
      
      // console.log(`✓ Term detector initialized with ${allTerms.length} terms and ${this.patterns.length} patterns`);
    } catch (error) {
      console.error("Error initializing term detector:", error);
      throw error;
    }
  }

  /**
   * Create regex pattern for a cooking term with variations
   */
  private createPattern(term: CookingTerm): TermPattern | null {
    try {
      const variations: string[] = [term.term];
      
      // Add search terms as variations
      if (term.searchTerms && term.searchTerms.length > 0) {
        variations.push(...term.searchTerms);
      }

      // Generate verb variations for cooking methods
      if (term.category === 'cooking_methods' || term.category === 'prep_techniques') {
        variations.forEach(v => {
          const baseVerb = v.toLowerCase();
          
          // Common verb endings
          if (!variations.some(var_ => var_.toLowerCase() === baseVerb + 'd')) {
            variations.push(baseVerb + 'd'); // past tense (sautéd)
          }
          if (!variations.some(var_ => var_.toLowerCase() === baseVerb + 'ed')) {
            variations.push(baseVerb + 'ed'); // past tense (diced)
          }
          if (!variations.some(var_ => var_.toLowerCase() === baseVerb + 'ing')) {
            variations.push(baseVerb + 'ing'); // present participle (sautéing)
          }
          
          // Handle special cases
          if (baseVerb.endsWith('y') && !baseVerb.endsWith('ay') && !baseVerb.endsWith('ey') && !baseVerb.endsWith('oy')) {
            variations.push(baseVerb.slice(0, -1) + 'ied'); // fry → fried
            variations.push(baseVerb.slice(0, -1) + 'ies'); // fry → fries
          }
          if (baseVerb.endsWith('e')) {
            variations.push(baseVerb.slice(0, -1) + 'ing'); // dice → dicing
          }
        });
      }

      // Generate plural variations for knife skills and tools
      if (term.category === 'knife_skills' || term.category === 'kitchen_tools') {
        variations.forEach(v => {
          const base = v.toLowerCase();
          if (!variations.some(var_ => var_.toLowerCase() === base + 's')) {
            variations.push(base + 's'); // plural
          }
        });
      }

      // Remove duplicates and empty strings
      const uniqueVariations = Array.from(new Set(variations.filter(v => v && v.trim())));

      // Escape special regex characters and create pattern
      const escapedVariations = uniqueVariations.map(v => 
        v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );

      // Create pattern with word boundaries to avoid partial matches
      // Use lookahead and lookbehind to ensure word boundaries
      const pattern = new RegExp(
        `\\b(${escapedVariations.join('|')})\\b`,
        'gi'
      );

      // Calculate priority (longer, more specific terms get higher priority)
      const priority = term.term.length * 10 + 
                      (term.category === 'cooking_methods' ? 5 : 0) +
                      (term.searchTerms ? term.searchTerms.length : 0);

      return {
        pattern,
        term,
        priority
      };
    } catch (error) {
      console.error(`Error creating pattern for term "${term.term}":`, error);
      return null;
    }
  }

  /**
   * Clear expired cache entries
   */
  private cleanCache() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    Array.from(this.detectionCache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.detectionCache.delete(key));
    
    // Implement LRU eviction if cache is too large
    if (this.detectionCache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.detectionCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, sortedEntries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.detectionCache.delete(key));
    }
  }

  /**
   * Generate cache key for detection request
   */
  private getCacheKey(text: string, options: any): string {
    const optionsKey = JSON.stringify(options);
    // Use first 100 chars of text + hash of full text for shorter keys
    const textKey = text.length > 100 
      ? text.substring(0, 100) + ':' + this.hashString(text)
      : text;
    return `${textKey}:${optionsKey}`;
  }

  /**
   * Simple string hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Detect cooking terms in text
   */
  async detectTerms(text: string, options: {
    excludeCategories?: string[];
    maxMatches?: number;
    contextAware?: boolean;
  } = {}): Promise<TermMatch[]> {
    const { 
      excludeCategories = [], 
      maxMatches = 100,
      contextAware = true 
    } = options;

    // Check cache first
    const cacheKey = this.getCacheKey(text, options);
    const cached = this.detectionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    
    // Clean cache periodically
    if (Math.random() < 0.1) { // 10% chance on each call
      this.cleanCache();
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    const matches: TermMatch[] = [];
    const usedRanges: Array<[number, number]> = [];

    // Track which terms we've already matched to avoid duplicates
    const matchedTermIds = new Set<string>();

    for (const { pattern, term } of this.patterns) {
      // Skip excluded categories
      if (excludeCategories.includes(term.category)) {
        continue;
      }

      // Skip if we've already matched this term
      if (matchedTermIds.has(term.id)) {
        continue;
      }

      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // Check for overlapping matches
        const overlaps = usedRanges.some(([s, e]) =>
          (start >= s && start < e) || (end > s && end <= e) ||
          (start < s && end > e)
        );

        if (!overlaps) {
          // Context-aware filtering
          if (contextAware) {
            // Skip if inside a URL or code block
            const beforeChar = start > 0 ? text[start - 1] : ' ';
            const afterChar = end < text.length ? text[end] : ' ';
            
            // Check for URL context
            if (beforeChar === '/' || afterChar === '/' || 
                beforeChar === '.' || afterChar === '.' ||
                beforeChar === '@' || afterChar === '@') {
              continue;
            }

            // Check for code context (inside backticks)
            const textBefore = text.substring(Math.max(0, start - 10), start);
            const textAfter = text.substring(end, Math.min(text.length, end + 10));
            if (textBefore.includes('`') || textAfter.includes('`')) {
              continue;
            }
          }

          matches.push({
            term: match[0],
            termId: term.id,
            originalTerm: term.term,
            start,
            end,
            shortDefinition: term.shortDefinition,
            category: term.category,
            difficulty: term.difficulty
          });

          usedRanges.push([start, end]);
          matchedTermIds.add(term.id);

          // Stop if we've reached max matches
          if (matches.length >= maxMatches) {
            break;
          }
        }
      }

      if (matches.length >= maxMatches) {
        break;
      }
    }

    // Sort by position in text
    const sortedMatches = matches.sort((a, b) => a.start - b.start);
    
    // Store in cache
    this.detectionCache.set(cacheKey, {
      result: sortedMatches,
      timestamp: Date.now()
    });
    
    return sortedMatches;
  }

  /**
   * Enrich text with HTML markup for detected terms
   */
  async enrichText(text: string, options: {
    excludeCategories?: string[];
    linkToGlossary?: boolean;
    includeTooltip?: boolean;
  } = {}): Promise<string> {
    const { 
      linkToGlossary = false,
      includeTooltip = true
    } = options;

    const matches = await this.detectTerms(text, options);
    
    if (matches.length === 0) {
      return text;
    }

    let result = '';
    let lastIndex = 0;

    for (const match of matches) {
      // Add text before match
      result += text.slice(lastIndex, match.start);

      // Build the enriched term markup
      const termClass = `cooking-term cooking-term--${match.category.replace(/_/g, '-')}`;
      const difficultyClass = match.difficulty ? ` cooking-term--${match.difficulty}` : '';
      
      let enrichedTerm = '';
      
      if (linkToGlossary) {
        enrichedTerm = `<a href="/glossary#${match.termId}" class="${termClass}${difficultyClass}" data-term-id="${match.termId}"`;
      } else {
        enrichedTerm = `<span class="${termClass}${difficultyClass}" data-term-id="${match.termId}"`;
      }

      if (includeTooltip) {
        // Escape HTML in definition for title attribute
        const escapedDefinition = match.shortDefinition
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        
        enrichedTerm += ` title="${escapedDefinition}" data-term="${match.originalTerm}"`;
      }

      enrichedTerm += `>${match.term}`;
      enrichedTerm += linkToGlossary ? '</a>' : '</span>';

      result += enrichedTerm;
      lastIndex = match.end;
    }

    // Add remaining text
    result += text.slice(lastIndex);

    return result;
  }

  /**
   * Get statistics about detected terms
   */
  async getDetectionStats(text: string): Promise<{
    totalTerms: number;
    uniqueTerms: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
  }> {
    const matches = await this.detectTerms(text);
    
    const uniqueTerms = new Set(matches.map(m => m.termId));
    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};

    for (const match of matches) {
      // Count by category
      byCategory[match.category] = (byCategory[match.category] || 0) + 1;
      
      // Count by difficulty
      if (match.difficulty) {
        byDifficulty[match.difficulty] = (byDifficulty[match.difficulty] || 0) + 1;
      }
    }

    return {
      totalTerms: matches.length,
      uniqueTerms: uniqueTerms.size,
      byCategory,
      byDifficulty
    };
  }

  /**
   * Clear cache and force re-initialization
   */
  async refresh() {
    this.initialized = false;
    await this.initialize(true);
  }

  /**
   * Check if detector is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const termDetector = new TermDetector();
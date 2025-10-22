// User preference tracking for unit selections
// This helps the system learn from user overrides and improve suggestions over time

interface UnitPreference {
  foodPattern: string; // Normalized food name or pattern
  preferredUnit: string;
  count: number; // How many times this preference was used
  lastUsed: number; // Timestamp
  foodCategory?: string; // Optional category for better matching
}

const PREFERENCES_KEY = "unit_preferences";
const MAX_PREFERENCES = 500; // Limit storage size
const PATTERN_MIN_LENGTH = 3; // Minimum pattern length to track
const CONFIDENCE_THRESHOLD = 3; // Times used before considered high confidence

// Load preferences from localStorage
export function loadPreferences(): UnitPreference[] {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const prefs = JSON.parse(stored);
      // Clean up old entries if needed (keep most recently used)
      if (prefs.length > MAX_PREFERENCES) {
        prefs.sort((a: UnitPreference, b: UnitPreference) => b.lastUsed - a.lastUsed);
        return prefs.slice(0, MAX_PREFERENCES);
      }
      return prefs;
    }
  } catch (error) {
    console.error("Error loading unit preferences:", error);
  }
  return [];
}

// Save preferences to localStorage
export function savePreferences(preferences: UnitPreference[]): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Error saving unit preferences:", error);
  }
}

// Extract key patterns from food name for matching
export function extractPatterns(foodName: string): string[] {
  const normalized = foodName.toLowerCase().trim();
  const patterns: string[] = [];
  
  // Full name
  patterns.push(normalized);
  
  // Key words (longer than PATTERN_MIN_LENGTH)
  const words = normalized.split(/\s+/);
  words.forEach(word => {
    if (word.length >= PATTERN_MIN_LENGTH) {
      patterns.push(word);
    }
  });
  
  // Common food types
  const commonPatterns = [
    'chicken', 'beef', 'pork', 'fish', 'milk', 'cheese', 'egg', 
    'bread', 'rice', 'pasta', 'fruit', 'vegetable', 'juice',
    'yogurt', 'butter', 'oil', 'sauce', 'soup', 'cereal'
  ];
  
  commonPatterns.forEach(pattern => {
    if (normalized.includes(pattern)) {
      patterns.push(pattern);
    }
  });
  
  return Array.from(new Set(patterns)); // Remove duplicates
}

// Record a user's unit selection
export function recordUnitPreference(
  foodName: string,
  selectedUnit: string,
  foodCategory?: string
): void {
  const patterns = extractPatterns(foodName);
  const preferences = loadPreferences();
  const now = Date.now();
  
  patterns.forEach(pattern => {
    // Check if we already have this pattern
    const existing = preferences.findIndex(p => 
      p.foodPattern === pattern && 
      (!foodCategory || p.foodCategory === foodCategory)
    );
    
    if (existing !== -1) {
      // Update existing preference
      preferences[existing].preferredUnit = selectedUnit;
      preferences[existing].count++;
      preferences[existing].lastUsed = now;
    } else {
      // Add new preference
      preferences.push({
        foodPattern: pattern,
        preferredUnit: selectedUnit,
        count: 1,
        lastUsed: now,
        foodCategory
      });
    }
  });
  
  // Sort by count and recency, keep top MAX_PREFERENCES
  preferences.sort((a, b) => {
    // First by count (more uses = higher priority)
    if (a.count !== b.count) return b.count - a.count;
    // Then by recency
    return b.lastUsed - a.lastUsed;
  });
  
  savePreferences(preferences.slice(0, MAX_PREFERENCES));
}

// Get unit preference for a food item
export function getUserUnitPreference(
  foodName: string,
  foodCategory?: string
): { unit: string; confidence: 'high' | 'medium' | 'low' } | null {
  const patterns = extractPatterns(foodName);
  const preferences = loadPreferences();
  
  // Look for exact matches first
  for (const pattern of patterns) {
    const exactMatch = preferences.find(p => 
      p.foodPattern === pattern && 
      (!foodCategory || p.foodCategory === foodCategory)
    );
    
    if (exactMatch) {
      const confidence = exactMatch.count >= CONFIDENCE_THRESHOLD ? 'high' : 
                        exactMatch.count >= 2 ? 'medium' : 'low';
      return {
        unit: exactMatch.preferredUnit,
        confidence
      };
    }
  }
  
  // Look for partial matches in longer patterns
  const normalized = foodName.toLowerCase();
  for (const pref of preferences) {
    if (pref.foodPattern.length > PATTERN_MIN_LENGTH && normalized.includes(pref.foodPattern)) {
      const confidence = pref.count >= CONFIDENCE_THRESHOLD ? 'medium' : 'low';
      return {
        unit: pref.preferredUnit,
        confidence
      };
    }
  }
  
  return null;
}

// Clear all preferences (for user settings/privacy)
export function clearPreferences(): void {
  try {
    localStorage.removeItem(PREFERENCES_KEY);
  } catch (error) {
    console.error("Error clearing unit preferences:", error);
  }
}

// Get statistics about learned preferences
export function getPreferenceStats(): {
  totalPreferences: number;
  highConfidenceCount: number;
  topPatterns: { pattern: string; unit: string; count: number }[];
} {
  const preferences = loadPreferences();
  
  const highConfidenceCount = preferences.filter(p => p.count >= CONFIDENCE_THRESHOLD).length;
  
  const topPatterns = preferences
    .slice(0, 10)
    .map(p => ({
      pattern: p.foodPattern,
      unit: p.preferredUnit,
      count: p.count
    }));
  
  return {
    totalPreferences: preferences.length,
    highConfidenceCount,
    topPatterns
  };
}
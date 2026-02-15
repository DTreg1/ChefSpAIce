import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/lib/logger";

const STORAGE_PREFS_KEY = "@chefspaice/user_storage_preferences";
const CURRENT_VERSION = 1;

interface StorageChoiceRecord {
  count: number;
  lastChosen: number;
  wasOverride: boolean;
}

interface CategoryPreferences {
  [location: string]: StorageChoiceRecord;
}

interface UserStoragePreferences {
  [category: string]: CategoryPreferences;
}

interface StoredPreferences {
  version: number;
  categories: UserStoragePreferences;
}

interface PreferenceResult {
  location: string;
  confidence: "learned" | "strong" | "weak";
  overrideCount: number;
}

const OVERRIDE_THRESHOLD = 3;
const DECAY_DAYS = 30;
const DECAY_FACTOR = 0.8;

let cachedPreferences: UserStoragePreferences | null = null;

function calculateWeight(record: StorageChoiceRecord): number {
  const now = Date.now();
  const daysSinceChosen = (now - record.lastChosen) / (1000 * 60 * 60 * 24);

  let weight = record.count;

  if (daysSinceChosen > DECAY_DAYS) {
    const decayPeriods = Math.floor(daysSinceChosen / DECAY_DAYS);
    weight *= Math.pow(DECAY_FACTOR, decayPeriods);
  }

  if (record.wasOverride) {
    weight *= 1.5;
  }

  return weight;
}

async function loadPreferences(): Promise<UserStoragePreferences> {
  if (cachedPreferences) {
    return cachedPreferences;
  }

  try {
    const prefsJson = await AsyncStorage.getItem(STORAGE_PREFS_KEY);

    if (!prefsJson) {
      cachedPreferences = {};
      return cachedPreferences;
    }

    const parsed = JSON.parse(prefsJson);

    if (parsed && typeof parsed.version === "number" && parsed.categories) {
      const stored = parsed as StoredPreferences;
      if (stored.version < CURRENT_VERSION) {
        await migratePreferences(stored.categories, stored.version);
      }
      cachedPreferences = stored.categories;
    } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      cachedPreferences = parsed as UserStoragePreferences;
      await savePreferences(cachedPreferences);
    } else {
      cachedPreferences = {};
    }

    return cachedPreferences;
  } catch (error) {
    logger.error("Error loading storage preferences:", error);
    cachedPreferences = {};
    return cachedPreferences;
  }
}

async function savePreferences(prefs: UserStoragePreferences): Promise<void> {
  try {
    cachedPreferences = prefs;
    const stored: StoredPreferences = { version: CURRENT_VERSION, categories: prefs };
    await AsyncStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(stored));
  } catch (error) {
    logger.error("Error saving storage preferences:", error);
  }
}

async function migratePreferences(
  prefs: UserStoragePreferences,
  fromVersion: number,
): Promise<void> {
  if (fromVersion < 1) {
    for (const category in prefs) {
      for (const location in prefs[category]) {
        const record = prefs[category][location];
        if (typeof record === "number") {
          prefs[category][location] = {
            count: record,
            lastChosen: Date.now(),
            wasOverride: true,
          };
        }
      }
    }
  }

  await savePreferences(prefs);
}

export async function recordStorageChoice(
  category: string,
  location: string,
  wasSuggested: boolean,
): Promise<void> {
  const prefs = await loadPreferences();

  if (!prefs[category]) {
    prefs[category] = {};
  }

  const categoryPrefs = prefs[category];
  const existing = categoryPrefs[location];

  if (existing) {
    categoryPrefs[location] = {
      count: existing.count + 1,
      lastChosen: Date.now(),
      wasOverride: !wasSuggested || existing.wasOverride,
    };
  } else {
    categoryPrefs[location] = {
      count: 1,
      lastChosen: Date.now(),
      wasOverride: !wasSuggested,
    };
  }

  await savePreferences(prefs);
}

export async function getUserPreference(
  category: string,
): Promise<PreferenceResult | null> {
  const prefs = await loadPreferences();
  const categoryPrefs = prefs[category];

  if (!categoryPrefs) {
    return null;
  }

  let bestLocation: string | null = null;
  let bestWeight = 0;
  let totalOverrideCount = 0;

  for (const location in categoryPrefs) {
    const record = categoryPrefs[location];

    if (record.wasOverride) {
      totalOverrideCount += record.count;
    }

    const weight = calculateWeight(record);

    if (weight > bestWeight) {
      bestWeight = weight;
      bestLocation = location;
    }
  }

  if (!bestLocation) {
    return null;
  }

  const bestRecord = categoryPrefs[bestLocation];

  if (!bestRecord.wasOverride) {
    return null;
  }

  if (bestRecord.count < OVERRIDE_THRESHOLD) {
    return null;
  }

  let confidence: "learned" | "strong" | "weak";
  if (bestRecord.count >= OVERRIDE_THRESHOLD * 2) {
    confidence = "strong";
  } else if (bestRecord.count >= OVERRIDE_THRESHOLD) {
    confidence = "learned";
  } else {
    confidence = "weak";
  }

  return {
    location: bestLocation,
    confidence,
    overrideCount: bestRecord.count,
  };
}

export async function clearPreferences(): Promise<void> {
  cachedPreferences = null;
  try {
    await AsyncStorage.removeItem(STORAGE_PREFS_KEY);
  } catch (error) {
    logger.error("Error clearing storage preferences:", error);
  }
}

export async function getLearnedPreferencesCount(): Promise<number> {
  const prefs = await loadPreferences();
  let count = 0;

  for (const category in prefs) {
    const result = await getUserPreference(category);
    if (result) {
      count++;
    }
  }

  return count;
}

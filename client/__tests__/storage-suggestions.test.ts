import {
  STORAGE_RECOMMENDATIONS,
  StorageLocation,
} from "../lib/shelf-life-data";
import {
  getStorageSuggestion,
  getBaseSuggestion,
  getStorageSuggestionWithPreference,
  StorageSuggestionResult,
} from "../hooks/useStorageSuggestion";
import {
  recordStorageChoice,
  getUserPreference,
  clearPreferences,
  getAllPreferences,
  getLearnedPreferencesCount,
  getCategoryStats,
  invalidateCache,
} from "../lib/user-storage-preferences";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFS_KEY = "@user_storage_preferences";
const PREFS_VERSION_KEY = "@user_storage_preferences_version";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("Storage Suggestions", () => {
  describe("STORAGE_RECOMMENDATIONS data integrity", () => {
    const validLocations: StorageLocation[] = [
      "refrigerator",
      "freezer",
      "pantry",
      "counter",
    ];

    it("has all categories with valid primary location", () => {
      for (const [category, rec] of Object.entries(STORAGE_RECOMMENDATIONS)) {
        expect(validLocations).toContain(rec.primary);
      }
    });

    it("alternatives do not include primary location", () => {
      for (const [category, rec] of Object.entries(STORAGE_RECOMMENDATIONS)) {
        expect(rec.alternatives).not.toContain(rec.primary);
      }
    });

    it("all alternatives are valid storage locations", () => {
      for (const [category, rec] of Object.entries(STORAGE_RECOMMENDATIONS)) {
        for (const alt of rec.alternatives) {
          expect(validLocations).toContain(alt);
        }
      }
    });

    it("notes are non-empty strings", () => {
      for (const [category, rec] of Object.entries(STORAGE_RECOMMENDATIONS)) {
        expect(typeof rec.notes).toBe("string");
        expect(rec.notes.length).toBeGreaterThan(0);
      }
    });

    it("has expected core categories", () => {
      const expectedCategories = [
        "dairy",
        "meat",
        "seafood",
        "produce",
        "bread",
        "eggs",
        "condiments",
        "canned",
        "frozen",
        "beverages",
        "grains",
        "spices",
      ];

      for (const category of expectedCategories) {
        expect(STORAGE_RECOMMENDATIONS[category]).toBeDefined();
      }
    });

    it("has no duplicate alternatives within a category", () => {
      for (const [category, rec] of Object.entries(STORAGE_RECOMMENDATIONS)) {
        const uniqueAlts = new Set(rec.alternatives);
        expect(uniqueAlts.size).toBe(rec.alternatives.length);
      }
    });
  });

  describe("getStorageSuggestion function", () => {
    describe("returns high confidence for exact category match", () => {
      it("returns high confidence for dairy", () => {
        const result = getStorageSuggestion("dairy");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
        expect(result?.primary).toBe("refrigerator");
      });

      it("returns high confidence for meat", () => {
        const result = getStorageSuggestion("meat");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
        expect(result?.primary).toBe("refrigerator");
      });

      it("returns high confidence for frozen", () => {
        const result = getStorageSuggestion("frozen");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
        expect(result?.primary).toBe("freezer");
      });

      it("returns high confidence for pantry items", () => {
        const result = getStorageSuggestion("bread");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
        expect(result?.primary).toBe("pantry");
      });
    });

    describe("returns high confidence for alias matches", () => {
      it("returns high confidence for milk (alias for dairy)", () => {
        const result = getStorageSuggestion("milk");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });

      it("returns high confidence for chicken (alias for meat)", () => {
        const result = getStorageSuggestion("chicken");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });

      it("returns high confidence for salmon (alias for seafood)", () => {
        const result = getStorageSuggestion("salmon");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });
    });

    describe("returns medium confidence for partial match", () => {
      it("returns medium confidence for partial food name matches", () => {
        const result = getStorageSuggestion("grilled chicken breast");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("medium");
      });

      it("returns medium confidence when category is substring", () => {
        const result = getStorageSuggestion("fresh dairy products");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("medium");
      });
    });

    describe("returns low confidence for unknown category", () => {
      it("returns low confidence for completely unknown food", () => {
        const result = getStorageSuggestion("xyzabc123");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("low");
      });

      it("returns medium for partial matches (unicorn meat contains meat)", () => {
        const result = getStorageSuggestion("unicorn meat");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("medium");
      });

      it("returns default suggestion for unknown items", () => {
        const result = getStorageSuggestion("mystery item");
        expect(result).not.toBeNull();
        expect(result?.primary).toBe("pantry");
        expect(result?.alternatives).toContain("refrigerator");
      });
    });

    describe("returns null for undefined/empty category", () => {
      it("returns null for undefined category", () => {
        const result = getStorageSuggestion(undefined);
        expect(result).toBeNull();
      });

      it("returns null for empty string category", () => {
        const result = getStorageSuggestion("");
        expect(result).toBeNull();
      });

      it("returns null for whitespace-only category", () => {
        const result = getStorageSuggestion("   ");
        expect(result).toBeNull();
      });
    });

    describe("handles case-insensitive matching", () => {
      it("matches DAIRY uppercase", () => {
        const result = getStorageSuggestion("DAIRY");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });

      it("matches Dairy mixed case", () => {
        const result = getStorageSuggestion("Dairy");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });

      it("matches dAiRy weird case", () => {
        const result = getStorageSuggestion("dAiRy");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });

      it("matches with leading/trailing whitespace", () => {
        const result = getStorageSuggestion("  dairy  ");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });

      it("matches MILK alias uppercase", () => {
        const result = getStorageSuggestion("MILK");
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe("high");
      });
    });

    describe("result structure", () => {
      it("returns all required fields", () => {
        const result = getStorageSuggestion("dairy");
        expect(result).not.toBeNull();
        expect(result?.primary).toBeDefined();
        expect(result?.alternatives).toBeDefined();
        expect(result?.notes).toBeDefined();
        expect(result?.confidence).toBeDefined();
      });

      it("alternatives is an array", () => {
        const result = getStorageSuggestion("dairy");
        expect(Array.isArray(result?.alternatives)).toBe(true);
      });

      it("notes is a string", () => {
        const result = getStorageSuggestion("dairy");
        expect(typeof result?.notes).toBe("string");
      });
    });
  });

  describe("getBaseSuggestion function", () => {
    it("returns suggestion for known category", () => {
      const result = getBaseSuggestion("dairy");
      expect(result).not.toBeNull();
      expect(result.primary).toBe("refrigerator");
    });

    it("returns default for unknown category", () => {
      const result = getBaseSuggestion("unknown");
      expect(result.confidence).toBe("low");
      expect(result.primary).toBe("pantry");
    });
  });
});

describe("User Preference Learning", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      return Promise.resolve(null);
    });
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe("recordStorageChoice", () => {
    it("records first choice correctly", async () => {
      await recordStorageChoice("dairy", "refrigerator", true);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = mockedAsyncStorage.setItem.mock.calls[0];
      expect(key).toBe("@user_storage_preferences");

      const saved = JSON.parse(value);
      expect(saved.dairy).toBeDefined();
      expect(saved.dairy.refrigerator.count).toBe(1);
    });

    it("increments count for repeated choices", async () => {
      const existingPrefs = {
        dairy: {
          refrigerator: {
            count: 2,
            lastChosen: Date.now() - 1000,
            wasOverride: false,
          },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(existingPrefs));
        }
        return Promise.resolve("1");
      });

      await recordStorageChoice("dairy", "refrigerator", true);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
      const prefsCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        ([key]) => key === "@user_storage_preferences",
      );
      const saved = JSON.parse(prefsCalls[0][1]);
      expect(saved.dairy.refrigerator.count).toBe(3);
    });

    it("marks choice as override when not suggested", async () => {
      await recordStorageChoice("dairy", "freezer", false);

      const [, value] = mockedAsyncStorage.setItem.mock.calls[0];
      const saved = JSON.parse(value);
      expect(saved.dairy.freezer.wasOverride).toBe(true);
    });

    it("marks choice as not override when suggested", async () => {
      await recordStorageChoice("dairy", "refrigerator", true);

      const [, value] = mockedAsyncStorage.setItem.mock.calls[0];
      const saved = JSON.parse(value);
      expect(saved.dairy.refrigerator.wasOverride).toBe(false);
    });

    it("handles multiple categories independently", async () => {
      const existingPrefs = {
        dairy: {
          refrigerator: {
            count: 1,
            lastChosen: Date.now(),
            wasOverride: false,
          },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(existingPrefs));
        }
        return Promise.resolve("1");
      });

      await recordStorageChoice("meat", "freezer", false);

      const prefsCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        ([key]) => key === "@user_storage_preferences",
      );
      const saved = JSON.parse(prefsCalls[0][1]);
      expect(saved.dairy).toBeDefined();
      expect(saved.meat).toBeDefined();
      expect(saved.meat.freezer.count).toBe(1);
    });
  });

  describe("getUserPreference", () => {
    it("returns null when no preferences exist", async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await getUserPreference("dairy");
      expect(result).toBeNull();
    });

    it("returns null when category has no preferences", async () => {
      const prefs = {
        meat: {
          refrigerator: { count: 5, lastChosen: Date.now(), wasOverride: true },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result).toBeNull();
    });

    it("returns null when override count is below threshold", async () => {
      const prefs = {
        dairy: {
          freezer: { count: 2, lastChosen: Date.now(), wasOverride: true },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result).toBeNull();
    });

    it("returns learned preference after threshold (3 overrides)", async () => {
      const prefs = {
        dairy: {
          freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result).not.toBeNull();
      expect(result?.location).toBe("freezer");
      expect(result?.confidence).toBe("learned");
    });

    it("returns strong confidence after double threshold (6+ overrides)", async () => {
      const prefs = {
        dairy: {
          freezer: { count: 6, lastChosen: Date.now(), wasOverride: true },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result).not.toBeNull();
      expect(result?.confidence).toBe("strong");
    });

    it("returns null when choices are not overrides", async () => {
      const prefs = {
        dairy: {
          refrigerator: {
            count: 10,
            lastChosen: Date.now(),
            wasOverride: false,
          },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result).toBeNull();
    });

    it("selects location with highest weight", async () => {
      const prefs = {
        dairy: {
          freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
          pantry: { count: 5, lastChosen: Date.now(), wasOverride: true },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result?.location).toBe("pantry");
    });
  });

  describe("clearPreferences", () => {
    it("clears all preferences from storage", async () => {
      await clearPreferences();

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(
        "@user_storage_preferences",
      );
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(
        "@user_storage_preferences_version",
      );
    });
  });

  describe("getAllPreferences", () => {
    it("returns empty object when no preferences", async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await getAllPreferences();
      expect(result).toEqual({});
    });

    it("returns all stored preferences", async () => {
      const prefs = {
        dairy: {
          refrigerator: {
            count: 1,
            lastChosen: Date.now(),
            wasOverride: false,
          },
        },
        meat: {
          freezer: { count: 2, lastChosen: Date.now(), wasOverride: true },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getAllPreferences();
      expect(result.dairy).toBeDefined();
      expect(result.meat).toBeDefined();
    });
  });

  describe("getLearnedPreferencesCount", () => {
    it("returns 0 when no learned preferences", async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const count = await getLearnedPreferencesCount();
      expect(count).toBe(0);
    });

    it("counts only learned preferences (above threshold)", async () => {
      const prefs = {
        dairy: {
          freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
        },
        meat: {
          pantry: { count: 1, lastChosen: Date.now(), wasOverride: true },
        },
        produce: {
          counter: { count: 5, lastChosen: Date.now(), wasOverride: true },
        },
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prefs));

      const count = await getLearnedPreferencesCount();
      expect(count).toBe(2);
    });
  });

  describe("weight calculation with time decay", () => {
    it("applies decay factor for old choices", async () => {
      const oldDate = Date.now() - 95 * 24 * 60 * 60 * 1000;
      const newDate = Date.now();

      const prefs = {
        dairy: {
          freezer: { count: 4, lastChosen: oldDate, wasOverride: true },
          pantry: { count: 3, lastChosen: newDate, wasOverride: true },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === "@user_storage_preferences") {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result?.location).toBe("pantry");
    });
  });

  describe("override weight bonus", () => {
    it("applies 1.5x bonus to override choices - freezer (count 3 * 1.5 = 4.5) beats pantry (count 4)", async () => {
      const prefs = {
        dairy: {
          freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
          pantry: { count: 4, lastChosen: Date.now(), wasOverride: false },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_PREFS_KEY) {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const result = await getUserPreference("dairy");
      expect(result).not.toBeNull();
      expect(result?.location).toBe("freezer");
    });

    it("verifies exact weight calculation via getCategoryStats", async () => {
      const prefs = {
        dairy: {
          freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
          pantry: { count: 4, lastChosen: Date.now(), wasOverride: false },
        },
      };
      invalidateCache();
      mockedAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_PREFS_KEY) {
          return Promise.resolve(JSON.stringify(prefs));
        }
        return Promise.resolve("1");
      });

      const stats = await getCategoryStats("dairy");
      const freezerStats = stats.find((s) => s.location === "freezer");
      const pantryStats = stats.find((s) => s.location === "pantry");

      expect(freezerStats?.weight).toBeCloseTo(4.5, 1);
      expect(pantryStats?.weight).toBeCloseTo(4.0, 1);
      expect(freezerStats!.weight).toBeGreaterThan(pantryStats!.weight);
    });
  });
});

describe("getStorageSuggestionWithPreference (async with user preferences)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      return Promise.resolve(null);
    });
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  it("returns base suggestion when no user preference exists", async () => {
    const result = await getStorageSuggestionWithPreference("dairy");

    expect(result).not.toBeNull();
    expect(result?.primary).toBe("refrigerator");
    expect(result?.confidence).toBe("high");
    expect(result?.isUserPreference).toBeFalsy();
  });

  it("returns user preference when learned preference exists", async () => {
    const prefs = {
      dairy: {
        freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
      },
    };
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_PREFS_KEY) {
        return Promise.resolve(JSON.stringify(prefs));
      }
      return Promise.resolve("1");
    });

    const result = await getStorageSuggestionWithPreference("dairy");

    expect(result).not.toBeNull();
    expect(result?.primary).toBe("freezer");
    expect(result?.isUserPreference).toBe(true);
    expect(result?.originalSuggestion).toBe("refrigerator");
  });

  it("returns learned confidence for threshold overrides", async () => {
    const prefs = {
      dairy: {
        freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
      },
    };
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_PREFS_KEY) {
        return Promise.resolve(JSON.stringify(prefs));
      }
      return Promise.resolve("1");
    });

    const result = await getStorageSuggestionWithPreference("dairy");

    expect(result?.confidence).toBe("learned");
  });

  it("returns strong confidence for double threshold overrides", async () => {
    const prefs = {
      dairy: {
        freezer: { count: 6, lastChosen: Date.now(), wasOverride: true },
      },
    };
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_PREFS_KEY) {
        return Promise.resolve(JSON.stringify(prefs));
      }
      return Promise.resolve("1");
    });

    const result = await getStorageSuggestionWithPreference("dairy");

    expect(result?.confidence).toBe("strong");
  });

  it("includes original base suggestion in alternatives", async () => {
    const prefs = {
      dairy: {
        freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
      },
    };
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_PREFS_KEY) {
        return Promise.resolve(JSON.stringify(prefs));
      }
      return Promise.resolve("1");
    });

    const result = await getStorageSuggestionWithPreference("dairy");

    expect(result?.alternatives).toContain("refrigerator");
    expect(result?.alternatives).not.toContain("freezer");
  });

  it("appends user preference note to base notes", async () => {
    const prefs = {
      dairy: {
        freezer: { count: 3, lastChosen: Date.now(), wasOverride: true },
      },
    };
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_PREFS_KEY) {
        return Promise.resolve(JSON.stringify(prefs));
      }
      return Promise.resolve("1");
    });

    const result = await getStorageSuggestionWithPreference("dairy");

    expect(result?.notes).toContain("Based on your preferences");
  });

  it("returns null for empty category", async () => {
    const result = await getStorageSuggestionWithPreference("");
    expect(result).toBeNull();
  });

  it("returns null for undefined category", async () => {
    const result = await getStorageSuggestionWithPreference(undefined);
    expect(result).toBeNull();
  });

  it("normalizes refrigerator to fridge in user preference", async () => {
    const prefs = {
      dairy: {
        refrigerator: { count: 3, lastChosen: Date.now(), wasOverride: true },
      },
    };
    invalidateCache();
    mockedAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_PREFS_KEY) {
        return Promise.resolve(JSON.stringify(prefs));
      }
      return Promise.resolve("1");
    });

    const result = await getStorageSuggestionWithPreference("dairy");

    expect(result?.primary).toBe("fridge");
  });
});

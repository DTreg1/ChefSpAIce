import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RecipeGenerationEvent,
  RecipeSaveEvent,
  WasteReductionStats,
  AnalyticsData,
  Badge,
  generateId,
} from "./storage";

const ANALYTICS_KEY = "@chefspaice/analytics";
const AVERAGE_ITEM_VALUE = 3.5;

const DEFAULT_STATS: WasteReductionStats = {
  totalItemsSavedFromWaste: 0,
  estimatedValueSaved: 0,
  recipesGeneratedWithExpiring: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: "",
  badges: [],
};

const BADGE_DEFINITIONS = {
  firstSave: {
    name: "First Save",
    description: "Used your first expiring item in a recipe",
    iconName: "award",
    tier: "bronze" as const,
    threshold: 1,
  },
  wasteBuster5: {
    name: "Waste Buster",
    description: "Saved 5 items from going to waste",
    iconName: "shield",
    tier: "bronze" as const,
    threshold: 5,
  },
  wasteBuster25: {
    name: "Waste Warrior",
    description: "Saved 25 items from going to waste",
    iconName: "shield",
    tier: "silver" as const,
    threshold: 25,
  },
  wasteBuster100: {
    name: "Waste Champion",
    description: "Saved 100 items from going to waste",
    iconName: "shield",
    tier: "gold" as const,
    threshold: 100,
  },
  streak3: {
    name: "Getting Started",
    description: "3-day streak of using expiring items",
    iconName: "zap",
    tier: "bronze" as const,
    threshold: 3,
  },
  streak7: {
    name: "Week Warrior",
    description: "7-day streak of using expiring items",
    iconName: "zap",
    tier: "silver" as const,
    threshold: 7,
  },
  streak30: {
    name: "Monthly Master",
    description: "30-day streak of using expiring items",
    iconName: "zap",
    tier: "gold" as const,
    threshold: 30,
  },
  moneySaver10: {
    name: "Smart Saver",
    description: "Saved $10 worth of food from waste",
    iconName: "dollar-sign",
    tier: "bronze" as const,
    threshold: 10,
  },
  moneySaver50: {
    name: "Thrifty Chef",
    description: "Saved $50 worth of food from waste",
    iconName: "dollar-sign",
    tier: "silver" as const,
    threshold: 50,
  },
  moneySaver100: {
    name: "Budget Master",
    description: "Saved $100 worth of food from waste",
    iconName: "dollar-sign",
    tier: "gold" as const,
    threshold: 100,
  },
};

async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    const value = await AsyncStorage.getItem(ANALYTICS_KEY);
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error("Error reading analytics:", error);
  }
  return {
    recipeGenerationEvents: [],
    recipeSaveEvents: [],
    wasteReductionStats: { ...DEFAULT_STATS },
  };
}

async function saveAnalyticsData(data: AnalyticsData): Promise<void> {
  try {
    await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving analytics:", error);
  }
}

function checkAndAwardBadges(stats: WasteReductionStats): Badge[] {
  const newBadges: Badge[] = [];
  const existingBadgeIds = new Set(stats.badges.map((b) => b.id));

  if (
    stats.totalItemsSavedFromWaste >= BADGE_DEFINITIONS.firstSave.threshold &&
    !existingBadgeIds.has("firstSave")
  ) {
    newBadges.push({
      id: "firstSave",
      ...BADGE_DEFINITIONS.firstSave,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.totalItemsSavedFromWaste >=
      BADGE_DEFINITIONS.wasteBuster5.threshold &&
    !existingBadgeIds.has("wasteBuster5")
  ) {
    newBadges.push({
      id: "wasteBuster5",
      ...BADGE_DEFINITIONS.wasteBuster5,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.totalItemsSavedFromWaste >=
      BADGE_DEFINITIONS.wasteBuster25.threshold &&
    !existingBadgeIds.has("wasteBuster25")
  ) {
    newBadges.push({
      id: "wasteBuster25",
      ...BADGE_DEFINITIONS.wasteBuster25,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.totalItemsSavedFromWaste >=
      BADGE_DEFINITIONS.wasteBuster100.threshold &&
    !existingBadgeIds.has("wasteBuster100")
  ) {
    newBadges.push({
      id: "wasteBuster100",
      ...BADGE_DEFINITIONS.wasteBuster100,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.currentStreak >= BADGE_DEFINITIONS.streak3.threshold &&
    !existingBadgeIds.has("streak3")
  ) {
    newBadges.push({
      id: "streak3",
      ...BADGE_DEFINITIONS.streak3,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.currentStreak >= BADGE_DEFINITIONS.streak7.threshold &&
    !existingBadgeIds.has("streak7")
  ) {
    newBadges.push({
      id: "streak7",
      ...BADGE_DEFINITIONS.streak7,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.currentStreak >= BADGE_DEFINITIONS.streak30.threshold &&
    !existingBadgeIds.has("streak30")
  ) {
    newBadges.push({
      id: "streak30",
      ...BADGE_DEFINITIONS.streak30,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.estimatedValueSaved >= BADGE_DEFINITIONS.moneySaver10.threshold &&
    !existingBadgeIds.has("moneySaver10")
  ) {
    newBadges.push({
      id: "moneySaver10",
      ...BADGE_DEFINITIONS.moneySaver10,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.estimatedValueSaved >= BADGE_DEFINITIONS.moneySaver50.threshold &&
    !existingBadgeIds.has("moneySaver50")
  ) {
    newBadges.push({
      id: "moneySaver50",
      ...BADGE_DEFINITIONS.moneySaver50,
      earnedAt: new Date().toISOString(),
    });
  }

  if (
    stats.estimatedValueSaved >= BADGE_DEFINITIONS.moneySaver100.threshold &&
    !existingBadgeIds.has("moneySaver100")
  ) {
    newBadges.push({
      id: "moneySaver100",
      ...BADGE_DEFINITIONS.moneySaver100,
      earnedAt: new Date().toISOString(),
    });
  }

  return newBadges;
}

function updateStreak(stats: WasteReductionStats): void {
  const today = new Date().toISOString().split("T")[0];
  const lastDate = stats.lastActivityDate
    ? stats.lastActivityDate.split("T")[0]
    : "";

  if (lastDate === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastDate === yesterdayStr) {
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
  } else if (lastDate !== today) {
    stats.currentStreak = 1;
  }

  stats.lastActivityDate = new Date().toISOString();
}

export const analytics = {
  async trackRecipeGenerated(
    event: Omit<RecipeGenerationEvent, "id" | "timestamp">,
  ): Promise<Badge[]> {
    const data = await getAnalyticsData();

    const newEvent: RecipeGenerationEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    data.recipeGenerationEvents.push(newEvent);

    if (event.expiringItemsUsed > 0) {
      data.wasteReductionStats.totalItemsSavedFromWaste +=
        event.expiringItemsUsed;
      data.wasteReductionStats.estimatedValueSaved +=
        event.expiringItemsUsed * AVERAGE_ITEM_VALUE;
      data.wasteReductionStats.recipesGeneratedWithExpiring += 1;

      updateStreak(data.wasteReductionStats);
      const newBadges = checkAndAwardBadges(data.wasteReductionStats);
      data.wasteReductionStats.badges.push(...newBadges);

      await saveAnalyticsData(data);
      return newBadges;
    }

    await saveAnalyticsData(data);
    return [];
  },

  async trackRecipeSaved(
    event: Omit<RecipeSaveEvent, "id" | "timestamp">,
  ): Promise<void> {
    const data = await getAnalyticsData();

    const newEvent: RecipeSaveEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    data.recipeSaveEvents.push(newEvent);
    await saveAnalyticsData(data);
  },

  async getStats(): Promise<WasteReductionStats> {
    const data = await getAnalyticsData();
    return data.wasteReductionStats;
  },

  async getMonthlyStats(): Promise<{
    itemsSaved: number;
    valueSaved: number;
    recipesGenerated: number;
  }> {
    const data = await getAnalyticsData();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyEvents = data.recipeGenerationEvents.filter((e) => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= monthStart;
    });

    const itemsSaved = monthlyEvents.reduce(
      (sum, e) => sum + e.expiringItemsUsed,
      0,
    );
    const valueSaved = itemsSaved * AVERAGE_ITEM_VALUE;
    const recipesGenerated = monthlyEvents.filter(
      (e) => e.expiringItemsUsed > 0,
    ).length;

    return { itemsSaved, valueSaved, recipesGenerated };
  },

  async getWeeklyStats(): Promise<{
    itemsSaved: number;
    valueSaved: number;
    recipesGenerated: number;
  }> {
    const data = await getAnalyticsData();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const weeklyEvents = data.recipeGenerationEvents.filter((e) => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= weekStart;
    });

    const itemsSaved = weeklyEvents.reduce(
      (sum, e) => sum + e.expiringItemsUsed,
      0,
    );
    const valueSaved = itemsSaved * AVERAGE_ITEM_VALUE;
    const recipesGenerated = weeklyEvents.filter(
      (e) => e.expiringItemsUsed > 0,
    ).length;

    return { itemsSaved, valueSaved, recipesGenerated };
  },

  async getAllEvents(): Promise<AnalyticsData> {
    return getAnalyticsData();
  },

  async clearAnalytics(): Promise<void> {
    await AsyncStorage.removeItem(ANALYTICS_KEY);
  },
};

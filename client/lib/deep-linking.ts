import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEEP_LINK_PREFIX = 'chefspaice://';
const PENDING_DEEP_LINK_KEY = '@chefspaice/pending_deep_link';
const PENDING_LINK_EXPIRY_MS = 10 * 60 * 1000;

export interface PendingDeepLink {
  path: string;
  timestamp: number;
}

export const linkingConfig = {
  prefixes: [Linking.createURL('/'), DEEP_LINK_PREFIX],
  config: {
    screens: {
      Main: {
        path: '',
        screens: {
          Tabs: {
            path: '',
            screens: {
              RecipesTab: {
                path: '',
                screens: {
                  Recipes: '',
                  RecipeDetail: 'recipe/:recipeId',
                },
              },
              KitchenTab: {
                path: '',
                screens: {
                  Inventory: 'inventory',
                },
              },
            },
          },
        },
      },
      ScanHub: 'scan',
    },
  },
};

export function parseDeepLinkUrl(url: string): string | null {
  if (!url) return null;

  if (url.startsWith(DEEP_LINK_PREFIX)) {
    return url.slice(DEEP_LINK_PREFIX.length) || null;
  }

  try {
    const parsed = Linking.parse(url);
    return parsed.path || null;
  } catch {
    return null;
  }
}

export async function savePendingDeepLink(url: string): Promise<void> {
  const path = parseDeepLinkUrl(url);
  if (!path) return;

  const pendingLink: PendingDeepLink = {
    path,
    timestamp: Date.now(),
  };

  await AsyncStorage.setItem(PENDING_DEEP_LINK_KEY, JSON.stringify(pendingLink));
}

export async function consumePendingDeepLink(): Promise<PendingDeepLink | null> {
  try {
    const value = await AsyncStorage.getItem(PENDING_DEEP_LINK_KEY);
    await AsyncStorage.removeItem(PENDING_DEEP_LINK_KEY);

    if (!value) return null;

    const pendingLink: PendingDeepLink = JSON.parse(value);

    if (Date.now() - pendingLink.timestamp > PENDING_LINK_EXPIRY_MS) {
      return null;
    }

    return pendingLink;
  } catch {
    return null;
  }
}

export async function clearPendingDeepLink(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_DEEP_LINK_KEY);
}

export function getRecipeDeepLink(recipeId: string): string {
  return `${DEEP_LINK_PREFIX}recipe/${recipeId}`;
}

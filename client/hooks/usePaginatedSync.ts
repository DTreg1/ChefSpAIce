import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

async function fetchPaginated<T>(
  endpoint: string,
  limit: number,
  cursor?: string,
): Promise<PaginatedResponse<T>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set("cursor", cursor);
  }

  const data = await apiClient.get<{ items: T[]; nextCursor?: string }>(`${endpoint}?${params}`);
  return {
    items: data.items ?? [],
    nextCursor: data.nextCursor,
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  unit: string;
  storageLocation: string;
  purchaseDate?: string | null;
  expirationDate?: string | null;
  category: string;
  usdaCategory?: string | null;
  nutrition?: Record<string, number> | null;
  notes?: string | null;
  imageUri?: string | null;
  fdcId?: number | null;
  updatedAt?: string;
}

export interface RecipeItem {
  id: string;
  title: string;
  description?: string | null;
  ingredients?: unknown;
  instructions?: unknown;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  imageUri?: string | null;
  cloudImageUri?: string | null;
  nutrition?: Record<string, number> | null;
  isFavorite?: boolean | null;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  category?: string | null;
  recipeId?: string | null;
  updatedAt?: string;
  [key: string]: unknown;
}

export function useInventorySync(limit = 50, enabled = true) {
  return useInfiniteQuery<PaginatedResponse<InventoryItem>>({
    queryKey: ["sync", "inventory"],
    queryFn: ({ pageParam }) =>
      fetchPaginated<InventoryItem>(
        "/api/sync/inventory",
        limit,
        pageParam as string | undefined,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useRecipesSync(limit = 50, enabled = true) {
  return useInfiniteQuery<PaginatedResponse<RecipeItem>>({
    queryKey: ["sync", "recipes"],
    queryFn: ({ pageParam }) =>
      fetchPaginated<RecipeItem>(
        "/api/sync/recipes",
        limit,
        pageParam as string | undefined,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useShoppingSync(limit = 50, enabled = true) {
  return useInfiniteQuery<PaginatedResponse<ShoppingItem>>({
    queryKey: ["sync", "shoppingList"],
    queryFn: ({ pageParam }) =>
      fetchPaginated<ShoppingItem>(
        "/api/sync/shoppingList",
        limit,
        pageParam as string | undefined,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

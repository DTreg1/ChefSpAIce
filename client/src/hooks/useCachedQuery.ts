import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { CacheStorage } from "@/lib/cacheStorage";
import { useEffect } from "react";

type CachedQueryOptions<TData> = {
  cacheKey: string;
  expiryMs?: number;
} & UseQueryOptions<TData>;

export function useCachedQuery<TData>({
  cacheKey,
  expiryMs,
  ...queryOptions
}: CachedQueryOptions<TData>): UseQueryResult<TData> {
  const cachedData = CacheStorage.get<TData>(cacheKey, expiryMs);
  
  const query = useQuery<TData>({
    ...queryOptions,
    initialData: cachedData || undefined,
  });

  useEffect(() => {
    if (query.data && query.isSuccess) {
      CacheStorage.set(cacheKey, query.data, expiryMs);
    } else if (query.isError) {
      CacheStorage.remove(cacheKey);
    }
  }, [query.data, query.isSuccess, query.isError, cacheKey, expiryMs]);

  return query;
}

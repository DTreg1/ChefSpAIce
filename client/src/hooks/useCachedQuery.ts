import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { getCacheConfigForQuery } from "@/lib/queryClient";

/**
 * A hook that wraps useQuery with intelligent cache configuration based on data type.
 * Uses the cache configs defined in queryClient.ts to determine staleTime and refetch behavior.
 */
export function useCachedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends ReadonlyArray<unknown> = readonly unknown[]
>(
  queryOptions: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  // Get cache config based on the query key
  const cacheConfig = queryOptions.queryKey 
    ? getCacheConfigForQuery([...queryOptions.queryKey] as unknown[])
    : {};
  
  // Merge the intelligent cache config with any provided options
  const mergedOptions: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> = {
    ...queryOptions,
    // Apply cache config defaults, but allow explicit overrides to take precedence
    staleTime: queryOptions.staleTime !== undefined 
      ? queryOptions.staleTime 
      : cacheConfig.staleTime,
    refetchOnWindowFocus: queryOptions.refetchOnWindowFocus !== undefined
      ? queryOptions.refetchOnWindowFocus
      : cacheConfig.refetchOnWindowFocus,
    refetchInterval: queryOptions.refetchInterval !== undefined
      ? queryOptions.refetchInterval
      : cacheConfig.refetchInterval,
  };
  
  return useQuery<TQueryFnData, TError, TData, TQueryKey>(mergedOptions);
}
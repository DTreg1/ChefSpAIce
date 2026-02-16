import { CacheService } from "./cache";
import type { Session } from "./auth-utils";

const SESSION_CACHE_TTL_MS = 60_000; // 60 seconds
export const sessionCache = new CacheService<Session>({ defaultTtlMs: SESSION_CACHE_TTL_MS });

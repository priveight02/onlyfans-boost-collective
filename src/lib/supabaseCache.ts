/**
 * Local caching layer for Supabase data.
 * Stores results in localStorage keyed by account + table + query params.
 * Supports TTL, forced refresh, and real-time invalidation.
 */

const CACHE_PREFIX = "sb_cache_";
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes default
const MAX_CACHE_SIZE = 200; // max entries before pruning

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  accountId: string;
  key: string;
}

// In-memory mirror for instant access (no JSON.parse overhead)
const memoryCache = new Map<string, CacheEntry>();

// Initialize memory cache from localStorage on load
function initMemoryCache() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const entry: CacheEntry = JSON.parse(raw);
            memoryCache.set(key, entry);
          } catch { /* skip corrupted */ }
        }
      }
    }
  } catch { /* localStorage unavailable */ }
}

initMemoryCache();

function buildCacheKey(accountId: string, namespace: string, params?: Record<string, unknown>): string {
  const paramStr = params ? JSON.stringify(params, Object.keys(params).sort()) : "";
  return `${CACHE_PREFIX}${accountId}:${namespace}:${paramStr}`;
}

function pruneIfNeeded() {
  if (memoryCache.size <= MAX_CACHE_SIZE) return;
  // Remove oldest entries first
  const entries = Array.from(memoryCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  for (const [key] of toRemove) {
    memoryCache.delete(key);
    try { localStorage.removeItem(key); } catch {}
  }
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

/**
 * Get cached data. Returns null if not found or expired.
 */
export function getCached<T>(accountId: string, namespace: string, params?: Record<string, unknown>): T | null {
  const key = buildCacheKey(accountId, namespace, params);
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    memoryCache.delete(key);
    try { localStorage.removeItem(key); } catch {}
    return null;
  }
  return entry.data as T;
}

/**
 * Store data in cache (both memory + localStorage).
 */
export function setCache<T>(accountId: string, namespace: string, data: T, params?: Record<string, unknown>, ttlMs: number = DEFAULT_TTL_MS): void {
  const key = buildCacheKey(accountId, namespace, params);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
    accountId,
    key,
  };
  memoryCache.set(key, entry as CacheEntry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full — prune aggressively
    pruneIfNeeded();
    try { localStorage.setItem(key, JSON.stringify(entry)); } catch {}
  }
  pruneIfNeeded();
}

/**
 * Invalidate specific cache entry.
 */
export function invalidateCache(accountId: string, namespace: string, params?: Record<string, unknown>): void {
  const key = buildCacheKey(accountId, namespace, params);
  memoryCache.delete(key);
  try { localStorage.removeItem(key); } catch {}
}

/**
 * Invalidate all cache entries for a namespace (any params).
 */
export function invalidateNamespace(accountId: string, namespace: string): void {
  const prefix = `${CACHE_PREFIX}${accountId}:${namespace}:`;
  const toDelete: string[] = [];
  memoryCache.forEach((_, key) => {
    if (key.startsWith(prefix)) toDelete.push(key);
  });
  for (const key of toDelete) {
    memoryCache.delete(key);
    try { localStorage.removeItem(key); } catch {}
  }
}

/**
 * Invalidate ALL cache for a specific account.
 */
export function invalidateAccount(accountId: string): void {
  const prefix = `${CACHE_PREFIX}${accountId}:`;
  const toDelete: string[] = [];
  memoryCache.forEach((_, key) => {
    if (key.startsWith(prefix)) toDelete.push(key);
  });
  for (const key of toDelete) {
    memoryCache.delete(key);
    try { localStorage.removeItem(key); } catch {}
  }
}

/**
 * Clear entire cache.
 */
export function clearAllCache(): void {
  const toDelete: string[] = [];
  memoryCache.forEach((_, key) => toDelete.push(key));
  for (const key of toDelete) {
    memoryCache.delete(key);
    try { localStorage.removeItem(key); } catch {}
  }
}

/**
 * Wrapper: fetch with cache. If cached data exists and is fresh, returns it instantly.
 * Otherwise calls fetcher, caches result, and returns it.
 */
export async function cachedFetch<T>(
  accountId: string,
  namespace: string,
  fetcher: () => Promise<T>,
  params?: Record<string, unknown>,
  options?: { ttlMs?: number; forceRefresh?: boolean }
): Promise<T> {
  if (!options?.forceRefresh) {
    const cached = getCached<T>(accountId, namespace, params);
    if (cached !== null) return cached;
  }
  const data = await fetcher();
  setCache(accountId, namespace, data, params, options?.ttlMs);
  return data;
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): { totalEntries: number; byAccount: Record<string, number> } {
  const byAccount: Record<string, number> = {};
  memoryCache.forEach((entry) => {
    byAccount[entry.accountId] = (byAccount[entry.accountId] || 0) + 1;
  });
  return { totalEntries: memoryCache.size, byAccount };
}

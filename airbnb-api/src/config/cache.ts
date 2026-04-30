interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry>();

export const getCache = (key: string): unknown | null => {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data;
};

export const setCache = (key: string, data: unknown, ttlSeconds: number): void => {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
};

export const invalidateCache = (pattern: string): void => {
  const keys = Array.from(cacheStore.keys());
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  });
};

export const clearCache = (): void => {
  cacheStore.clear();
};

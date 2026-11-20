type CacheEntry = {
  value: unknown;
};

const MAX_CACHE_ENTRIES = 100;
const cachedData = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const keyGenerations = new Map<string, number>();
let cacheGeneration = 0;

function trimCache() {
  while (cachedData.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cachedData.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    cachedData.delete(oldestKey);
  }
}

export function getCachedApiData<T>(key: string): T | undefined {
  return cachedData.get(key)?.value as T | undefined;
}

export function hasCachedApiData(key: string) {
  return cachedData.has(key);
}

export function setCachedApiData<T>(key: string, value: T) {
  keyGenerations.set(key, (keyGenerations.get(key) ?? 0) + 1);
  inFlightRequests.delete(key);
  cachedData.delete(key);
  cachedData.set(key, { value });
  trimCache();
}

export function fetchCachedApiData<T>(
  key: string,
  fetcher: (forceRefresh: boolean) => Promise<T>,
  forceRefresh = false,
): Promise<T> {
  if (!forceRefresh && cachedData.has(key)) {
    return Promise.resolve(cachedData.get(key)!.value as T);
  }

  const pendingRequest = inFlightRequests.get(key);
  if (pendingRequest) return pendingRequest as Promise<T>;

  const requestGeneration = cacheGeneration;
  const keyGeneration = keyGenerations.get(key) ?? 0;
  let request: Promise<T>;
  request = fetcher(forceRefresh)
    .then(value => {
      if (
        requestGeneration === cacheGeneration &&
        keyGeneration === (keyGenerations.get(key) ?? 0)
      ) {
        cachedData.delete(key);
        cachedData.set(key, { value });
        trimCache();
      }
      return value;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, request);
  return request;
}

export function invalidateCachedApiData(key: string) {
  keyGenerations.set(key, (keyGenerations.get(key) ?? 0) + 1);
  cachedData.delete(key);
  inFlightRequests.delete(key);
}

export function clearCachedApiData() {
  cacheGeneration += 1;
  cachedData.clear();
  inFlightRequests.clear();
  keyGenerations.clear();
}

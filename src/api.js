import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const API_BASE_URL = "https://furnitures.qtechx.com/api";
// export const API_BASE_URL = "http://192.168.1.7:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

const MAX_RETRIES = 1;
const API_CACHE_STALE_TIME_MS = 60 * 1000;
const API_CACHE_GC_TIME_MS = 5 * 60 * 1000;
const MAX_API_CACHE_ENTRIES = 100;
const cachedResponses = new Map();
const inFlightRequests = new Map();
const baseAdapter = axios.getAdapter(api.defaults.adapter);
let cachedToken = null;
let cacheGeneration = 0;

const serializeCacheValue = (value) => {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeCacheValue).join(",")}]`;
  }
  if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
    return value.toString();
  }

  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${serializeCacheValue(value[key])}`,
    )
    .join(",")}}`;
};

const readHeader = (headers, name) => {
  if (typeof headers?.get === "function") return headers.get(name) || "";
  const header = Object.keys(headers || {}).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return header ? headers[header] : "";
};

const createCacheKey = (config) => {
  const authorization = readHeader(config.headers, "authorization");
  return [
    authorization,
    config.baseURL || "",
    config.url || "",
    serializeCacheValue(config.params || {}),
    config.responseType || "",
  ].join("|");
};

const pruneCachedResponses = (now) => {
  for (const [key, entry] of cachedResponses) {
    if (now - entry.cachedAt > API_CACHE_GC_TIME_MS) {
      cachedResponses.delete(key);
    }
  }

  if (cachedResponses.size <= MAX_API_CACHE_ENTRIES) return;

  const leastRecentlyUsed = [...cachedResponses.entries()]
    .sort(([, left], [, right]) => left.lastUsedAt - right.lastUsedAt)
    .slice(0, cachedResponses.size - MAX_API_CACHE_ENTRIES);
  leastRecentlyUsed.forEach(([key]) => cachedResponses.delete(key));
};

export function invalidateApiResponseCache() {
  cacheGeneration += 1;
  cachedResponses.clear();
  inFlightRequests.clear();
}

api.defaults.adapter = async (config) => {
  const requestCacheControl = String(
    readHeader(config.headers, "cache-control") || "",
  ).toLowerCase();
  if (
    config.method?.toLowerCase() !== "get" ||
    config.signal ||
    config.cancelToken ||
    requestCacheControl.includes("no-store")
  ) {
    return baseAdapter(config);
  }

  const key = createCacheKey(config);
  const now = Date.now();
  pruneCachedResponses(now);

  const cached = cachedResponses.get(key);
  if (cached && now - cached.cachedAt < API_CACHE_STALE_TIME_MS) {
    cached.lastUsedAt = now;
    return { ...cached.response, config };
  }

  const pendingRequest = inFlightRequests.get(key);
  if (pendingRequest) {
    const response = await pendingRequest;
    return { ...response, config };
  }

  const requestGeneration = cacheGeneration;
  let request;
  request = baseAdapter(config)
    .then((response) => {
      const cacheControl = String(
        readHeader(response.headers, "cache-control") || "",
      ).toLowerCase();
      if (
        response.status >= 200 &&
        response.status < 300 &&
        !cacheControl.includes("no-store") &&
        requestGeneration === cacheGeneration
      ) {
        const cachedAt = Date.now();
        cachedResponses.set(key, {
          response: { ...response, config: undefined },
          cachedAt,
          lastUsedAt: cachedAt,
        });
        pruneCachedResponses(cachedAt);
      }

      return response;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, request);
  return request;
};

export function setTokenCache(token) {
  if (cachedToken !== token) {
    invalidateApiResponseCache();
  }
  cachedToken = token;
}

export function clearTokenCache() {
  cachedToken = null;
  invalidateApiResponseCache();
}

api.interceptors.request.use(async (config) => {
  let storageToken = null;
  try {
    storageToken = await AsyncStorage.getItem("userToken");
  } catch (error) {
    if (__DEV__) {
      console.warn("[API] Could not read the saved auth token:", error);
    }
  }

  const activeToken = storageToken || cachedToken;

  if (activeToken !== cachedToken) {
    cachedToken = activeToken;
    invalidateApiResponseCache();
  }

  if (activeToken) {
    config.headers.Authorization = `Bearer ${activeToken}`;
  } else {
    delete config.headers.Authorization;
  }

  if (__DEV__) {
    console.log("[API] Request", {
      method: config.method?.toUpperCase(),
      baseURL: config.baseURL,
      url: config.url,
    });
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log("[API] Response", {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
      });
    }

    if (response.config.method?.toLowerCase() !== "get") {
      invalidateApiResponseCache();
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const retryCount = originalRequest?._retryCount || 0;
    const isCanceled =
      error.code === "ERR_CANCELED" || error.name === "CanceledError";
    const isNetworkError =
      !error.response &&
      !isCanceled &&
      (error.code === "ERR_NETWORK" || error.message === "Network Error");

    if (isCanceled) return Promise.reject(error);

    if (isNetworkError && originalRequest && retryCount < MAX_RETRIES) {
      originalRequest._retryCount = retryCount + 1;
      if (__DEV__) {
        console.warn("[API] Retrying network request", {
          attempt: originalRequest._retryCount,
          url: originalRequest.url,
        });
      }
      return api(originalRequest);
    }

    if (__DEV__) {
      const method = originalRequest?.method?.toUpperCase() || "UNKNOWN";
      const baseURL = originalRequest?.baseURL || API_BASE_URL;
      const url = originalRequest?.url || "";
      console.warn(
        `[API] Request failed: ${method} ${baseURL}${url}; ` +
          `status=${error.response?.status ?? "none"}; ` +
          `code=${error.code || "none"}; message=${error.message || "Unknown error"}`,
      );
    }

    if (error.response) {
      return Promise.reject({
        status: error.response.status,
        message: error.response.data?.message || "Server error",
        data: error.response.data,
      });
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject({
        status: "timeout",
        message: "The server took too long to respond. Please try again.",
      });
    }

    return Promise.reject({
      status: "network_error",
      message: `Cannot connect to ${originalRequest?.baseURL || API_BASE_URL}${originalRequest?.url || ""}. Check your internet connection and try again.`,
    });
  },
);

export default api;

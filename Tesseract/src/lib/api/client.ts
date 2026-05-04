import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { clearStoredAuth, readAccessToken, writeAccessToken } from "@/lib/auth-storage";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T;
  error: { code?: string; message?: string } | null;
  meta?: Record<string, unknown> | null;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

type RetryConfig = AxiosRequestConfig & { __retryCount?: number };
const MAX_RETRIES = 2;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<ApiEnvelope<{ token: string }>>("/auth/refresh", undefined, {
        headers: { "x-skip-auth-refresh": "true" },
      })
      .then((res) => {
        const token = res.data.data.token;
        writeAccessToken(token);
        return token;
      })
      .catch(() => {
        clearStoredAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (!config) return Promise.reject(error);

    const isNetwork = !error.response;
    const is5xx =
      error.response && error.response.status >= 500 && error.response.status < 600;
    const method = (config.method ?? "get").toLowerCase();
    const safe = ["get", "head", "options"].includes(method);

    if ((isNetwork || is5xx) && safe) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      if (config.__retryCount <= MAX_RETRIES) {
        const delay = 300 * 2 ** (config.__retryCount - 1);
        await new Promise((r) => setTimeout(r, delay));
        return apiClient.request(config);
      }
    }

    if (error.response?.status === 401 && typeof window !== "undefined") {
      const skipRefresh = config.headers?.["x-skip-auth-refresh"];
      const alreadyRetried = Boolean(config.__retryCount && config.__retryCount > MAX_RETRIES);
      if (!skipRefresh && !alreadyRetried) {
        const token = await refreshAccessToken();
        if (token) {
          config.headers = config.headers ?? {};
          if ("set" in config.headers && typeof config.headers.set === "function") {
            config.headers.set("Authorization", `Bearer ${token}`);
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
          config.__retryCount = MAX_RETRIES + 1;
          return apiClient.request(config);
        }
      }
      clearStoredAuth();
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    // No response = network/CORS failure (backend down, wrong URL, blocked by browser)
    if (!err.response) {
      const target = err.config?.baseURL ?? BASE_URL;
      return {
        message: `Cannot reach the server at ${target}. Is the backend running?`,
        code: "network_error",
      };
    }
    const data = err.response.data as
      | ApiEnvelope<unknown>
      | { message?: string; code?: string }
      | undefined;
    const envelopeError =
      "error" in (data ?? {}) && data && typeof data === "object"
        ? (data as ApiEnvelope<unknown>).error
        : undefined;
    return {
      message: envelopeError?.message ?? (data as { message?: string } | undefined)?.message ?? err.message ?? "Request failed",
      code: envelopeError?.code ?? (data as { code?: string } | undefined)?.code,
      status: err.response.status,
    };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: "Unknown error" };
}

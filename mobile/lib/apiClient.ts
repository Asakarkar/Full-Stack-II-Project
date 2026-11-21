import { resolveApiBaseUrl } from "./apiConfig";
import { tokenStorage } from "./storage";

export interface ApiErrorPayload {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  validationErrors?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(status: number, message: string, payload: ApiErrorPayload = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined | null>;
    customToken?: string | null;
  } = {}
): Promise<T> {
  const { method = "GET", body, params, customToken } = options;
  const baseUrl = resolveApiBaseUrl();

  let url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (params) {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&");
    if (query) {
      url += (url.includes("?") ? "&" : "?") + query;
    }
  }

  const token = customToken !== undefined ? customToken : await tokenStorage.get();
  const tokenType = (await tokenStorage.getType()) || "Bearer";

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `${tokenType} ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }

  if (!response.ok) {
    const errorPayload = (json && typeof json === "object" ? json : {}) as ApiErrorPayload;
    const message = errorPayload.message || response.statusText || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorPayload);
  }

  return json as T;
}

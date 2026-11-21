import { Platform } from "react-native";

let apiBaseUrlOverride: string | null = null;

export function setApiBaseUrlOverride(url: string | null): void {
  apiBaseUrlOverride = url ? url.trim().replace(/\/+$/, "") : null;
}

export function getApiBaseUrlOverride(): string | null {
  return apiBaseUrlOverride;
}

/**
 * Dynamically resolves the API base URL suitable for:
 * 1. Explicit runtime override (useful for testing and network switcher).
 * 2. Explicit environment variable EXPO_PUBLIC_API_URL.
 * 3. Physical Android / iOS devices running Expo Go or dev builds:
 *    Automatically extracts the development machine's LAN IP from Constants.expoConfig.hostUri.
 * 4. Android Emulator: Resolves to 10.0.2.2 (which maps to host machine localhost).
 * 5. Web or fallback: Resolves to http://localhost:8080/api/v1.
 */
export function resolveApiBaseUrl(): string {
  if (apiBaseUrlOverride) {
    return apiBaseUrlOverride;
  }

  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  // Attempt to resolve development machine LAN IP when running in Expo
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants")?.default || require("expo-constants");
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri && typeof hostUri === "string") {
      const hostIp = hostUri.split(":")[0];
      if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
        return `http://${hostIp}:8080/api/v1`;
      }
    }
  } catch {
    // Ignore error in environments where Constants is unavailable (e.g. Node tests)
  }

  // Android emulator loopback alias to host machine
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080/api/v1";
  }

  // Web or default fallback
  return "http://localhost:8080/api/v1";
}

export const API_BASE_URL = resolveApiBaseUrl();

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const data = "data" in error ? (error as { data: unknown }).data : null;
    if (data && typeof data === "object") {
      const message = "message" in data && typeof (data as { message: unknown }).message === "string" ? (data as { message: string }).message : null;
      const validationErrors = "validationErrors" in data && (data as { validationErrors: unknown }).validationErrors && typeof (data as { validationErrors: unknown }).validationErrors === "object"
        ? Object.entries((data as { validationErrors: Record<string, string> }).validationErrors)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        : [];
      const fieldMessage = validationErrors.map(([field, detail]) => `${field}: ${detail}`).join("\n");
      if (message && fieldMessage) return `${message}\n${fieldMessage}`;
      if (message) return message;
    }
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return fallback;
}

export function isNotFoundError(error: unknown): boolean {
  return !!error && typeof error === "object" && "status" in error && (error as { status: unknown }).status === 404;
}

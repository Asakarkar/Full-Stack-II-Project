const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (configuredUrl || "http://localhost:8080/api").replace(/\/+$/, "");

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const data = "data" in error ? error.data : null;
    if (data && typeof data === "object") {
      const message = "message" in data && typeof data.message === "string" ? data.message : null;
      const fieldErrors = "fieldErrors" in data && data.fieldErrors && typeof data.fieldErrors === "object"
        ? Object.entries(data.fieldErrors).filter((entry): entry is [string, string] => typeof entry[1] === "string")
        : [];
      const fieldMessage = fieldErrors.map(([field, detail]) => `${field}: ${detail}`).join("\n");
      if (message && fieldMessage) return `${message}\n${fieldMessage}`;
      if (message) return message;
    }
    if ("message" in error && typeof error.message === "string") return error.message;
  }
  return fallback;
}

export function isNotFoundError(error: unknown) {
  return !!error && typeof error === "object" && "status" in error && error.status === 404;
}

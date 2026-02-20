import { createApiClient } from "@quicklogo/api-client";

function getBaseUrl(): string {
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    throw new Error("VITE_API_URL must be set in production");
  }
  return import.meta.env.VITE_API_URL ?? "";
}

export const api = createApiClient(getBaseUrl(), {
  init: { credentials: "include" as const },
});

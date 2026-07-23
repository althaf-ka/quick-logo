const rawApiUrl = import.meta.env.DEV
  ? "http://localhost:8787"
  : import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error("VITE_API_URL is not configured for production");
}

export const API_URL = rawApiUrl.replace(/\/+$/, "");

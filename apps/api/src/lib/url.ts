import type { Bindings } from "../types";

export function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(
  env: Pick<Bindings, "ALLOWED_ORIGINS" | "CLIENT_URL">,
): string[] {
  const origins = parseOrigins(env.ALLOWED_ORIGINS);
  if (env.CLIENT_URL && !origins.includes(env.CLIENT_URL)) {
    origins.push(env.CLIENT_URL);
  }
  return origins;
}

export function isAllowedRedirect(
  targetUrl: string,
  allowedOrigins: string[],
): boolean {
  try {
    const parsedTarget = new URL(targetUrl);

    // Prevent open redirect chaining and payload injection via query/hash
    if (parsedTarget.search || parsedTarget.hash) {
      return false;
    }

    return allowedOrigins.some((origin) => {
      try {
        const parsedAllowed = new URL(origin);
        return parsedTarget.origin === parsedAllowed.origin;
      } catch {
        return parsedTarget.hostname === origin;
      }
    });
  } catch {
    return false;
  }
}

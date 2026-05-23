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

    return allowedOrigins.some((origin) => {
      try {
        const parsedAllowed = new URL(origin);
        return parsedTarget.hostname === parsedAllowed.hostname;
      } catch {
        return parsedTarget.hostname === origin;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Sanitize raw text to prevent DoS, log forging, and XSS in raw DB viewers.
 */
export const sanitizeText = (
  value: string | undefined | null,
  maxLength = 5000,
): string | null => {
  if (!value) return null;
  let safeStr = value.substring(0, maxLength);

  safeStr = safeStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Strip ANSI escape sequences
  // eslint-disable-next-line no-control-regex
  return safeStr.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
};

/**
 * Recursively sanitize objects (like JSON context) to prevent XSS/forging
 * in any nested string values or keys.
 */
export const deepSanitize = (obj: unknown): unknown => {
  if (typeof obj === "string") return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (typeof obj === "object" && obj !== null) {
    const res: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      // If the sanitized key is empty, fallback to a safe placeholder to avoid dropping the key
      const safeKey = sanitizeText(key, 200) || "sanitized_empty_key";
      res[safeKey] = deepSanitize(val);
    }
    return res;
  }
  return obj;
};

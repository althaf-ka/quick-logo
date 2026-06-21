import { zValidator } from "@hono/zod-validator";
import { createAuth } from "@quicklogo/auth/server";
import { systemLogs } from "@quicklogo/db";
import { logReportSchema } from "@quicklogo/shared";
import { Hono } from "hono";
import { sanitizeText, deepSanitize } from "../lib/sanitize";
import { validationHook } from "../lib/validator";
import type { Bindings, Variables } from "../types";

const logsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Public endpoint to report errors from Web/Admin apps.
 * Intentionally unauthenticated to capture errors during auth flows.
 */
logsRoute.post(
  "/report",
  zValidator("json", logReportSchema, validationHook),
  async (c) => {
    const db = c.get("db");
    const { level, source, message, stack, pathname, context } =
      c.req.valid("json");

    let userId: string | null = null;
    try {
      const session = await createAuth(db, c.env).api.getSession({
        headers: c.req.raw.headers,
      });
      userId = session?.user?.id ?? null;
    } catch {
      // Ignore auth extraction failures
    }

    const serverContext = {
      userAgent: c.req.header("User-Agent") || "unknown",
      ip: c.req.header("CF-Connecting-IP") || "unknown",
    };

    let finalContext: string;
    if (context) {
      try {
        const parsed = JSON.parse(context);
        finalContext = JSON.stringify({
          ...((deepSanitize(parsed) as Record<string, unknown>) || {}),
          ...serverContext,
        });
      } catch {
        finalContext = JSON.stringify({
          raw: sanitizeText(context, 5000),
          ...serverContext,
        });
      }
    } else {
      finalContext = JSON.stringify(serverContext);
    }

    await db.insert(systemLogs).values({
      level,
      source,
      message: sanitizeText(message, 2000) || "[Stripped]",
      stack: sanitizeText(stack, 10000) ?? null,
      pathname: sanitizeText(pathname, 1000) ?? null,
      context: finalContext,
      userId,
      status: "unresolved",
    });

    return c.json({ success: true }, 201);
  },
);

export default logsRoute;

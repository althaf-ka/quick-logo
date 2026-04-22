import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { systemLogs } from "@quicklogo/db";
import { logReportSchema } from "@quicklogo/shared";
import { createAuth } from "@quicklogo/auth/server";
import type { Bindings, Variables } from "../types";
import { validationHook } from "../lib/validator";

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
        finalContext = JSON.stringify({ ...parsed, ...serverContext });
      } catch {
        finalContext = JSON.stringify({ raw: context, ...serverContext });
      }
    } else {
      finalContext = JSON.stringify(serverContext);
    }

    await db.insert(systemLogs).values({
      level,
      source,
      message,
      stack: stack ?? null,
      pathname: pathname ?? null,
      context: finalContext,
      userId,
      status: "unresolved",
    });

    return c.json({ success: true }, 201);
  },
);

export default logsRoute;

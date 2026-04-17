import { Hono } from "hono";
import { systemLogs } from "@quicklogo/db";
import { Bindings, Variables } from "../types";
import { createAuth } from "@quicklogo/auth/server";

const logsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Public endpoint to report errors from Web/Admin apps.
 * No specific auth required to ensure we catch auth-related failures too.
 */
logsRoute.post("/report", async (c) => {
  const body = await c.req.json();
  const db = c.get("db");

  const betterAuth = createAuth(db, c.env);
  const session = await betterAuth.api.getSession({
    headers: c.req.raw.headers,
  });

  const { level = "error", source, message, stack, pathname, context } = body;

  if (!source || !message) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const enrichedContext = {
    ...(typeof context === "object" ? context : { rawContext: context }),
    userAgent: c.req.header("User-Agent"),
    ip: c.req.header("CF-Connecting-IP") || "unknown",
  };

  await db.insert(systemLogs).values({
    level,
    source,
    message,
    stack,
    pathname,
    context: JSON.stringify(enrichedContext),
    userId: session?.user?.id ?? null,
    status: "unresolved",
  });

  return c.json({ success: true }, 201);
});

export default logsRoute;

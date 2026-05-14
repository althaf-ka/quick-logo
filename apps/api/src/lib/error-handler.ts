import { AppError } from "./errors";
import { HTTPException } from "hono/http-exception";
import { ERROR_CODES } from "@quicklogo/shared";
import type { Context } from "hono";
import type { Bindings, Variables } from "../types";
import { systemLogs } from "@quicklogo/db";

type ApiContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export function globalErrorHandler(err: Error, c: ApiContext) {
  // Known business error
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode as ContentfulStatusCode);
  }

  // Hono HTTPException
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // Unknown — generic 500 + log to admin dashboard
  const method = c.req.method;
  const path = c.req.path;
  const userId = safeGetUserId(c);

  console.error(`[api] Unhandled: ${method} ${path}`, err);

  persistErrorLog(c, {
    method,
    path,
    userId,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  return c.json(
    {
      error: "Something went wrong. Please try again.",
      code: ERROR_CODES.INTERNAL_ERROR,
    },
    500,
  );
}

function safeGetUserId(c: ApiContext): string | null {
  try {
    const user = c.get("user");
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function persistErrorLog(
  c: ApiContext,
  data: {
    method: string;
    path: string;
    userId: string | null;
    message: string;
    stack?: string;
  },
) {
  try {
    const db = c.get("db");
    if (!db) return; // DB middleware might not have run

    db.insert(systemLogs)
      .values({
        level: "error",
        source: "api",
        message: `[${data.method} ${data.path}] ${data.message}`,
        stack: data.stack ?? null,
        pathname: data.path,
        userId: data.userId,
        context: JSON.stringify({
          method: data.method,
          path: data.path,
          userAgent: c.req.header("User-Agent"),
        }),
        status: "unresolved",
      })
      .execute()
      .catch((e: unknown) => {
        console.error("[api] Failed to persist error log to DB:", e);
      });
  } catch (e) {
    console.error("[api] Persist log setup failed:", e);
  }
}

type ContentfulStatusCode =
  | 200
  | 201
  | 202
  | 400
  | 401
  | 402
  | 403
  | 404
  | 409
  | 500;

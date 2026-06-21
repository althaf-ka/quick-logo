import { createLogger } from "@quicklogo/server-telemetry";
import { ERROR_CODES } from "@quicklogo/shared";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Bindings, Variables } from "../types";
import { AppError } from "./errors";

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
  const db = c.get("db");

  const logger = createLogger("api", { db });
  logger.error(`Unhandled: ${method} ${path}`, err, {
    method,
    path,
    userId,
    userAgent: c.req.header("User-Agent"),
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

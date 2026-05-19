import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { dbMiddleware } from "./middleware/db";
import authRoute from "./routes/auth";
import userRoute from "./routes/user";
import uploadRoute from "./routes/upload";
import generateRoute from "./routes/generate";
import batchesRoute from "./routes/batches";
import imagesRoute from "./routes/images";
import paymentsRoute from "./routes/payments";
import projectsRoute from "./routes/projects";
import adminRoute from "./routes/admin";
import logsRoute from "./routes/logs";
import brandKitsRoute from "./routes/brand-kits";

import { Bindings, Variables } from "./types";
import { globalErrorHandler } from "./lib/error-handler";
import { ERROR_CODES } from "@quicklogo/shared";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());
app.use("*", dbMiddleware);

app.onError(globalErrorHandler);
app.notFound((c) =>
  c.json({ error: "Not found", code: ERROR_CODES.NOT_FOUND }, 404),
);

const parseOrigins = (raw: string | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
};

app.use("/api/*", async (c, next) => {
  const allowedOrigins = parseOrigins(c.env.ALLOWED_ORIGINS);
  if (c.env.CLIENT_URL && !allowedOrigins.includes(c.env.CLIENT_URL)) {
    allowedOrigins.push(c.env.CLIENT_URL);
  }
  const origin = c.req.header("Origin") || "";

  const corsMiddleware = cors({
    origin: allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "",
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.use("/api/*", async (c, next) => {
  const path = c.req.path;
  if (path === "/api/payments/webhook" || path.startsWith("/api/auth/")) {
    return next();
  }

  const allowedOrigins = parseOrigins(c.env.ALLOWED_ORIGINS);
  if (c.env.CLIENT_URL && !allowedOrigins.includes(c.env.CLIENT_URL)) {
    allowedOrigins.push(c.env.CLIENT_URL);
  }

  const csrfMiddleware = csrf({
    origin: allowedOrigins,
  });

  return csrfMiddleware(c, next);
});

const routes = app
  .route("/api/auth", authRoute)
  .route("/api/user", userRoute)
  .route("/api/upload", uploadRoute)
  .route("/api/generate", generateRoute)
  .route("/api/batches", batchesRoute)
  .route("/api/images", imagesRoute)
  .route("/api/payments", paymentsRoute)
  .route("/api/projects", projectsRoute)
  .route("/api/admin", adminRoute)
  .route("/api/logs", logsRoute)
  .route("/api/brand-kits", brandKitsRoute);

export default app;
export type AppType = typeof routes;

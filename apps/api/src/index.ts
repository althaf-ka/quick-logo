import { ERROR_CODES } from "@quicklogo/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { globalErrorHandler } from "./lib/error-handler";
import { getAllowedOrigins } from "./lib/url";
import { dbMiddleware } from "./middleware/db";
import adminRoute from "./routes/admin";
import authRoute from "./routes/auth";
import batchesRoute from "./routes/batches";
import brandKitsRoute from "./routes/brand-kits";
import canvasRoute from "./routes/canvas";
import generateRoute from "./routes/generate";
import imagesRoute from "./routes/images";
import logsRoute from "./routes/logs";
import paymentsRoute from "./routes/payments";
import projectsRoute from "./routes/projects";
import uploadRoute from "./routes/upload";
import userRoute from "./routes/user";

import type { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());
app.use("*", dbMiddleware);

app.onError(globalErrorHandler);
app.notFound((c) =>
  c.json({ error: "Not found", code: ERROR_CODES.NOT_FOUND }, 404),
);

app.use("/api/*", async (c, next) => {
  const allowedOrigins = getAllowedOrigins(c.env);
  const corsMiddleware = cors({
    origin: (origin) => {
      if (allowedOrigins.includes(origin)) return origin;
      return null;
    },
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.use("/api/*", async (c, next) => {
  const path = c.req.path;
  if (path === "/api/payments/webhook" || path.startsWith("/api/auth/")) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins(c.env);

  const csrfMiddleware = csrf({
    origin: allowedOrigins,
  });

  return csrfMiddleware(c, next);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  .route("/api/brand-kits", brandKitsRoute)
  .route("/api/canvas", canvasRoute);

export default app;
export type AppType = typeof routes;

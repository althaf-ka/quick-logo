import { Hono } from "hono";
import { cors } from "hono/cors";
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

app.use("/api/*", async (c, next) => {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim());
  const origin = c.req.header("Origin") || "";

  const corsMiddleware = cors({
    origin: allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || c.env.CLIENT_URL,
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.route("/api/auth", authRoute);
app.route("/api/user", userRoute);
app.route("/api/upload", uploadRoute);
app.route("/api/generate", generateRoute);
app.route("/api/batches", batchesRoute);
app.route("/api/images", imagesRoute);
app.route("/api/payments", paymentsRoute);
app.route("/api/projects", projectsRoute);
app.route("/api/admin", adminRoute);
app.route("/api/logs", logsRoute);

export default app;
export type AppType = typeof app;

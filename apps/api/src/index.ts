import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dbMiddleware } from "./middleware/db";
import authRoute from "./routes/auth";
import userRoute from "./routes/user";
import { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());
app.use("*", dbMiddleware);

app.use("/api/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  });
  return corsMiddleware(c, next);
});

//User Routes
app.route("/api/auth", authRoute);
app.route("/api/user", userRoute);

export default app;
export type AppType = typeof app;

import { createMiddleware } from "hono/factory";
import type { Bindings, Variables } from "../types";
import { createAuth } from "@quicklogo/auth/server";

export const requireAuth = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const session = await createAuth(c.get("db"), c.env).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.banned) return c.json({ error: "Account suspended" }, 403);

  c.set("user", session.user as Variables["user"]);
  c.set("session", session.session as Variables["session"]);
  await next();
});

export const requireAdmin = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const session = await createAuth(c.get("db"), c.env).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  c.set("user", session.user as Variables["user"]);
  c.set("session", session.session as Variables["session"]);
  await next();
});

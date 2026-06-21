import type { D1Database } from "@cloudflare/workers-types";
import { createDb } from "@quicklogo/db";
import type { Database } from "@quicklogo/db";
import { createMiddleware } from "hono/factory";

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: Database;
};

export const dbMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

import { createMiddleware } from "hono/factory";
import { createDb, type Database } from "@quicklogo/db";
import { D1Database } from "@cloudflare/workers-types";

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

import { Hono } from "hono";
import { createAuth } from "@quicklogo/auth/server";
import type { Bindings, Variables } from "../types";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.on(["GET", "POST"], "/*", async (c) => {
  return createAuth(c.get("db"), c.env).handler(c.req.raw);
});

export default auth;
export type AuthType = typeof auth;

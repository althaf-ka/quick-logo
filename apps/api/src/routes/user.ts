import { Hono } from "hono";

const user = new Hono()
  .get("/me", (c) => c.json({ id: "1", name: "Alice" }, 200))
  .get("/session", (c) => c.json({ active: true }, 200));

export default user;
export type UserType = typeof user;

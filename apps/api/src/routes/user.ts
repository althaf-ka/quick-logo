import { Hono, type Context } from "hono";
import { eq, users } from "@quicklogo/db";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";
import { UserNotFoundError } from "../lib/errors";

type UserContext = Context<{ Bindings: Bindings; Variables: Variables }>;

const getProfileHandler = async (c: UserContext) => {
  const db = c.get("db");
  const authUser = c.get("user");
  c.header("Cache-Control", "no-store");

  const [currentUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      credits: users.credits,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!currentUser) {
    throw new UserNotFoundError();
  }

  return c.json(currentUser, 200);
};

const user = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .get("/profile", requireAuth, getProfileHandler)
  .get("/me", requireAuth, getProfileHandler)
  .get("/session", requireAuth, (c) => c.json({ active: true }, 200));

export default user;
export type UserType = typeof user;

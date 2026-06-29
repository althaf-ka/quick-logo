import { users, eq, sql } from "@quicklogo/db";
import type { Database } from "@quicklogo/db";
import { InsufficientCreditsError, UserNotFoundError } from "./errors";

export async function deductCredits(
  db: Database,
  userId: string,
  cost: number,
) {
  const [updated] = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${cost}` })
    .where(sql`${users.id} = ${userId} AND ${users.credits} >= ${cost}`)
    .returning({ credits: users.credits });

  if (!updated) {
    const [existing] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) throw new UserNotFoundError();
    throw new InsufficientCreditsError(cost, existing.credits);
  }

  return updated.credits;
}

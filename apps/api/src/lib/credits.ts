import { creditRefunds, users, eq, sql } from "@quicklogo/db";
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

export async function refundCreditsOnce(
  db: Database,
  params: {
    refundId: string;
    userId: string;
    credits: number;
    reason: string;
  },
): Promise<boolean> {
  if (params.credits <= 0) return false;

  try {
    await db.batch([
      db.insert(creditRefunds).values({
        id: params.refundId,
        userId: params.userId,
        credits: params.credits,
        reason: params.reason,
      }),
      db
        .update(users)
        .set({ credits: sql`${users.credits} + ${params.credits}` })
        .where(eq(users.id, params.userId)),
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      return false;
    }
    throw error;
  }

  return true;
}

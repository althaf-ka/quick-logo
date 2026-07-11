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

  const [existing] = await db
    .select({ id: creditRefunds.id })
    .from(creditRefunds)
    .where(eq(creditRefunds.id, params.refundId))
    .limit(1);

  if (existing) return false;

  await db.batch([
    db
      .update(users)
      .set({ credits: sql`${users.credits} + ${params.credits}` })
      .where(
        sql`${users.id} = ${params.userId} AND NOT EXISTS (SELECT 1 FROM ${creditRefunds} WHERE ${creditRefunds.id} = ${params.refundId})`,
      ),
    db
      .insert(creditRefunds)
      .values({
        id: params.refundId,
        userId: params.userId,
        credits: params.credits,
        reason: params.reason,
      })
      .onConflictDoNothing(),
  ]);

  return true;
}

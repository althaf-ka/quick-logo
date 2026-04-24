import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Webhooks } from "@dodopayments/hono";
import DodoPayments from "dodopayments";
import { eq, sql, desc, lt, and } from "@quicklogo/db";
import { createId } from "@paralleldrive/cuid2";
import {
  createCheckoutRequestSchema,
  PRICING_TIERS,
  ERROR_CODES,
} from "@quicklogo/shared";
import { users, transactions } from "@quicklogo/db";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";
import { validationHook } from "../lib/validator";
import { AppError } from "../lib/errors";
import { isAllowedRedirect } from "../lib/url";

const payments = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post(
    "/checkout",
    requireAuth,
    zValidator("json", createCheckoutRequestSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { tierName, returnUrl } = c.req.valid("json");

      const allowedOrigins = (c.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((o) => o.trim());

      if (!isAllowedRedirect(returnUrl, allowedOrigins)) {
        throw new AppError(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          "The provided return URL is not allowed. Please use a trusted domain.",
        );
      }

      const tier = PRICING_TIERS.find((t) => t.name === tierName);
      if (!tier) {
        return c.json({ error: "Invalid pricing tier selected." }, 400);
      }

      const client = new DodoPayments({
        bearerToken: c.env.DODO_PAYMENTS_API_KEY,
        environment: c.env.DODO_PAYMENTS_ENVIRONMENT as
          | "test_mode"
          | "live_mode",
      });

      const txId = createId();
      try {
        await db.insert(transactions).values({
          id: txId,
          userId: user.id,
          amount: tier.priceAmount * 100,
          currency: tier.currency,
          creditsAdded: tier.credits,
          status: "pending",
          tierName: tier.name,
        });

        const session = await client.checkoutSessions.create({
          product_cart: [
            {
              product_id: tier.productId as string,
              quantity: 1,
              amount: tier.priceAmount * 100,
            },
          ],
          customer: {
            email: user.email,
            name: user.name,
          },
          billing_currency: tier.currency as any,
          return_url: returnUrl,
          metadata: {
            transaction_id: txId,
            user_id: user.id,
          },
        });

        const dodoId =
          (session as any).id || (session as any).checkout_id || null;

        if (dodoId) {
          await db
            .update(transactions)
            .set({ dodoPaymentId: dodoId })
            .where(eq(transactions.id, txId));
        }

        const redirectUrl =
          (session as any).url || (session as any).checkout_url;

        return c.json({ url: redirectUrl }, 200);
      } catch (error: any) {
        await db
          .update(transactions)
          .set({ status: "failed" })
          .where(eq(transactions.id, txId))
          .catch(() => {});

        console.error("Dodo error:", error.response?.data || error);
        throw new AppError(
          500,
          ERROR_CODES.PAYMENT_FAILED,
          "Payment processing failed. Please try again.",
        );
      }
    },
  )
  .get(
    "/transactions",
    requireAuth,
    zValidator(
      "query",
      z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(10),
      }),
      validationHook,
    ),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { cursor, limit } = c.req.valid("query");

      const conditions = [eq(transactions.userId, user.id)];
      if (cursor) {
        conditions.push(lt(transactions.createdAt, new Date(cursor)));
      }

      const list = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.createdAt))
        .limit(limit + 1);

      const hasNextPage = list.length > limit;
      const items = hasNextPage ? list.slice(0, -1) : list;
      const nextCursor = hasNextPage
        ? items[items.length - 1].createdAt.toISOString()
        : null;

      return c.json({ items, nextCursor }, 200);
    },
  )
  .post("/webhook", async (c) => {
    const webhookRunner = Webhooks({
      webhookKey: c.env.DODO_PAYMENTS_WEBHOOK_KEY,
      onPaymentSucceeded: async (payload: any) => {
        const metadata = payload.data?.metadata as
          | { transaction_id?: string; user_id?: string }
          | undefined;

        if (!metadata?.transaction_id || !metadata?.user_id) {
          console.error(
            "[Webhook] Missing metadata in payment payload. Data:",
            payload.data,
          );
          return;
        }

        try {
          const { transaction_id, user_id } = metadata;

          const { createDb } = await import("@quicklogo/db");
          const safeDb = createDb(c.env.DB);

          const [localTx] = await safeDb
            .select()
            .from(transactions)
            .where(eq(transactions.id, transaction_id))
            .limit(1);

          if (!localTx || localTx.status === "completed") {
            return;
          }

          if (localTx.userId !== user_id) {
            console.error(
              `[Webhook Security] User ID mismatch! Transaction ${transaction_id} belongs to ${localTx.userId}, but payload claimed ${user_id}`,
            );
            return;
          }

          await safeDb.batch([
            safeDb
              .update(transactions)
              .set({
                status: "completed",
                dodoPaymentId: payload.payment_id || null,
              })
              .where(eq(transactions.id, transaction_id)),

            safeDb
              .update(users)
              .set({ credits: sql`${users.credits} + ${localTx.creditsAdded}` })
              .where(eq(users.id, localTx.userId)),
          ]);

          console.log(
            `[Webhook] Success: Added ${localTx.creditsAdded} credits to user ${localTx.userId}`,
          );
        } catch (e) {
          console.error("[Webhook Processing Failed]", e);
        }
      },
      onPaymentFailed: async (payload: any) => {
        const metadata = payload.data?.metadata as
          | { transaction_id?: string; user_id?: string }
          | undefined;

        if (!metadata?.transaction_id) return;

        try {
          const { transaction_id } = metadata;
          const { createDb } = await import("@quicklogo/db");
          const safeDb = createDb(c.env.DB);

          await safeDb
            .update(transactions)
            .set({ status: "failed" })
            .where(eq(transactions.id, transaction_id));

          console.log(
            `[Webhook] Payment Failed: Transaction ${transaction_id}`,
          );
        } catch (e) {
          console.error("[Webhook Failure Processing Failed]", e);
        }
      },
    });

    return webhookRunner(c as any);
  });

export default payments;
export type PaymentsType = typeof payments;

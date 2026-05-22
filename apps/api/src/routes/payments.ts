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
import { createLogger } from "@quicklogo/server-telemetry";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";
import { validationHook } from "../lib/validator";
import { AppError, NotFoundError } from "../lib/errors";
import { isAllowedRedirect } from "../lib/url";

type WebhookMetadata = {
  transaction_id?: string;
  user_id?: string;
};

export interface DodoPayload {
  data?: {
    metadata?: WebhookMetadata;
    payment_id?: string;
    abandonment_reason?: string;
    recovered_payment_id?: string;
    [key: string]: unknown;
  };
  payment_id?: string;
  [key: string]: unknown;
}

/** Terminal statuses that should never be overwritten by this helper. */
const TERMINAL_STATUSES = new Set(["completed", "failed"]);

async function updateTransactionStatus(
  db: any,
  payload: any,
  newStatus: string,
  label: string,
  logger: ReturnType<typeof createLogger>,
): Promise<void> {
  const metadata = payload.data?.metadata as WebhookMetadata | undefined | null;

  if (!metadata?.transaction_id) {
    logger.error(`Missing transaction_id in ${label} payload`, payload.data);
    return;
  }

  const txId = metadata.transaction_id;

  try {
    const [existing] = await db
      .select({ status: transactions.status })
      .from(transactions)
      .where(eq(transactions.id, txId))
      .limit(1);

    if (!existing) {
      logger.error(`${label}: Transaction ${txId} not found`, { txId });
      return;
    }

    if (TERMINAL_STATUSES.has(existing.status)) {
      logger.info(
        `${label}: Skipped — transaction ${txId} already ${existing.status}`,
      );
      return;
    }

    await db
      .update(transactions)
      .set({
        status: newStatus,
        dodoPaymentId: payload.payment_id || null,
      })
      .where(eq(transactions.id, txId));

    logger.info(`${label}: Transaction ${txId}`);
  } catch (e) {
    logger.error(`${label} Processing Failed`, e, { txId });
  }
}

const payments = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  .post(
    "/checkout",
    requireAuth,
    zValidator("json", createCheckoutRequestSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const logger = createLogger("api", { db });
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
          billing_currency: tier.currency as "USD" | "EUR",
          return_url: returnUrl,
          // @ts-expect-error Dodo SDK types missing cancel_url
          cancel_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}payment_cancelled=true`,
          metadata: {
            transaction_id: txId,
            user_id: user.id,
          },
        });

        const dodoSession = session as {
          id?: string;
          checkout_id?: string;
          url?: string;
          checkout_url?: string;
        };

        const dodoId = dodoSession.id || dodoSession.checkout_id || null;

        if (dodoId) {
          await db
            .update(transactions)
            .set({ dodoPaymentId: dodoId })
            .where(eq(transactions.id, txId));
        }

        const redirectUrl = dodoSession.url || dodoSession.checkout_url;

        return c.json({ url: redirectUrl, transactionId: txId }, 200);
      } catch (error: any) {
        await db
          .update(transactions)
          .set({ status: "failed" })
          .where(eq(transactions.id, txId))
          .catch(() => {});

        logger.error("Dodo checkout creation error", error, {
          txId,
          responseData: error.response?.data,
        });
        throw new AppError(
          500,
          ERROR_CODES.PAYMENT_FAILED,
          "Payment processing failed. Please try again.",
        );
      }
    },
  )

  .post(
    "/cancel",
    requireAuth,
    zValidator(
      "json",
      z.object({ transaction_id: z.string().min(1) }),
      validationHook,
    ),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { transaction_id } = c.req.valid("json");

      const [tx] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, transaction_id),
            eq(transactions.userId, user.id),
          ),
        )
        .limit(1);

      if (!tx) {
        throw new NotFoundError("Transaction");
      }

      // Only cancel if still pending — don't overwrite completed/failed
      if (tx.status === "pending") {
        await db
          .update(transactions)
          .set({ status: "cancelled" })
          .where(eq(transactions.id, transaction_id));
      }

      return c.json({ status: "cancelled" }, 200);
    },
  )

  .get(
    "/verify",
    requireAuth,
    zValidator(
      "query",
      z.object({ transaction_id: z.string().min(1) }),
      validationHook,
    ),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const logger = createLogger("api", { db });
      const { transaction_id } = c.req.valid("query");

      const [tx] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, transaction_id),
            eq(transactions.userId, user.id),
          ),
        )
        .limit(1);

      if (!tx) {
        throw new NotFoundError("Transaction");
      }

      if (tx.status !== "pending" && tx.status !== "processing") {
        return c.json(
          { status: tx.status, creditsAdded: tx.creditsAdded },
          200,
        );
      }

      // Query Dodo API to reconcile if webhook hasn't arrived yet
      if (tx.dodoPaymentId) {
        try {
          const client = new DodoPayments({
            bearerToken: c.env.DODO_PAYMENTS_API_KEY,
            environment: c.env.DODO_PAYMENTS_ENVIRONMENT as
              | "test_mode"
              | "live_mode",
          });

          const payment = await client.payments.retrieve(tx.dodoPaymentId);
          const dodoStatus = payment.status as string | null;

          if (dodoStatus === "succeeded") {
            await db.batch([
              db
                .update(transactions)
                .set({ status: "completed" })
                .where(eq(transactions.id, transaction_id)),
              db
                .update(users)
                .set({
                  credits: sql`${users.credits} + ${tx.creditsAdded}`,
                })
                .where(eq(users.id, tx.userId)),
            ]);
            return c.json(
              { status: "completed", creditsAdded: tx.creditsAdded },
              200,
            );
          }

          if (dodoStatus === "failed") {
            await db
              .update(transactions)
              .set({ status: "failed" })
              .where(eq(transactions.id, transaction_id));
            return c.json({ status: "failed", creditsAdded: 0 }, 200);
          }

          if (dodoStatus === "cancelled") {
            await db
              .update(transactions)
              .set({ status: "cancelled" })
              .where(eq(transactions.id, transaction_id));
            return c.json({ status: "cancelled", creditsAdded: 0 }, 200);
          }
        } catch (e) {
          logger.error("Dodo API verification call failed", e, {
            transaction_id,
          });
        }
      }

      return c.json({ status: tx.status, creditsAdded: 0 }, 200);
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
        ? (items[items.length - 1]?.createdAt.toISOString() ?? null)
        : null;

      return c.json({ items, nextCursor }, 200);
    },
  )

  .post("/webhook", async (c) => {
    const { createDb } = await import("@quicklogo/db");
    const safeDb = createDb(c.env.DB);
    const logger = createLogger("api", { db: safeDb });

    const webhookRunner = Webhooks({
      webhookKey: c.env.DODO_PAYMENTS_WEBHOOK_KEY,

      onPaymentSucceeded: async (payload) => {
        const metadata = payload.data?.metadata as
          | WebhookMetadata
          | undefined
          | null;

        if (!metadata?.transaction_id || !metadata?.user_id) {
          logger.error("Missing metadata in payment payload", payload.data);
          return;
        }

        try {
          const { transaction_id, user_id } = metadata;

          const [localTx] = await safeDb
            .select()
            .from(transactions)
            .where(eq(transactions.id, transaction_id))
            .limit(1);

          // Idempotency: skip if already completed
          if (!localTx || localTx.status === "completed") {
            return;
          }

          if (localTx.userId !== user_id) {
            logger.error(`User ID mismatch!`, {
              transaction_id,
              expectedUserId: localTx.userId,
              payloadUserId: user_id,
            });
            return;
          }

          await safeDb.batch([
            safeDb
              .update(transactions)
              .set({
                status: "completed",
                dodoPaymentId: (
                  payload.data as unknown as Record<string, unknown>
                ).payment_id as string | null,
              })
              .where(eq(transactions.id, transaction_id)),

            safeDb
              .update(users)
              .set({ credits: sql`${users.credits} + ${localTx.creditsAdded}` })
              .where(eq(users.id, localTx.userId)),
          ]);

          logger.info(
            `Success: Added ${localTx.creditsAdded} credits to user ${localTx.userId}`,
            { transaction_id },
          );
        } catch (e) {
          logger.error("Webhook Processing Failed", e, {
            transaction_id: metadata?.transaction_id,
          });
        }
      },

      onPaymentFailed: async (payload) => {
        await updateTransactionStatus(
          safeDb,
          payload,
          "failed",
          "Payment Failed",
          logger,
        );
      },

      onPaymentCancelled: async (payload) => {
        await updateTransactionStatus(
          safeDb,
          payload,
          "cancelled",
          "Payment Cancelled",
          logger,
        );
      },

      onPaymentProcessing: async (payload) => {
        await updateTransactionStatus(
          safeDb,
          payload,
          "processing",
          "Payment Processing",
          logger,
        );
      },

      // ACR handlers — Dodo sends emails automatically, we log for observability
      onAbandonedCheckoutDetected: async (payload: DodoPayload) => {
        const data = payload.data;
        logger.info("Abandoned checkout detected", {
          paymentId: data?.payment_id,
          reason: data?.abandonment_reason,
        });
      },

      onAbandonedCheckoutRecovered: async (payload: DodoPayload) => {
        const data = payload.data;
        logger.info("Abandoned checkout recovered", {
          originalPaymentId: data?.payment_id,
          recoveredPaymentId: data?.recovered_payment_id,
        });
      },
    } as Parameters<typeof Webhooks>[0] & Record<string, unknown>);

    return webhookRunner(c);
  });

export default payments;
export type PaymentsType = typeof payments;

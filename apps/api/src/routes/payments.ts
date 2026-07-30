import { Webhooks } from "@dodopayments/hono";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { eq, sql, desc, lt, and, users, transactions } from "@quicklogo/db";
import type { Database } from "@quicklogo/db";
import { createLogger } from "@quicklogo/server-telemetry";
import {
  createCheckoutRequestSchema,
  PRICING_TIERS,
  ERROR_CODES,
} from "@quicklogo/shared";
import DodoPayments from "dodopayments";
import { Hono } from "hono";
import { z } from "zod";
import { AppError, NotFoundError } from "../lib/errors";
import { isAllowedRedirect } from "../lib/url";
import { validationHook } from "../lib/validator";
import { requireAuth } from "../middleware/require-auth";
import type { Bindings, Variables } from "../types";

type WebhookMetadata = {
  transaction_id?: string;
  user_id?: string;
};

export interface DodoPayload {
  data?: {
    metadata?: Record<string, unknown> | null;
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
  db: Database,
  payload: DodoPayload,
  newStatus: "completed" | "failed" | "pending" | "processing" | "cancelled",
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
      .where(
        and(
          eq(transactions.id, txId),
          eq(transactions.status, existing.status),
        ),
      );

    logger.info(`${label}: Transaction ${txId}`);
  } catch (e) {
    logger.error(`${label} Processing Failed`, e, { txId });
    throw e;
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

        const checkoutPayload = {
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
          cancel_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}payment_cancelled=true`,
          metadata: {
            transaction_id: txId,
            user_id: user.id,
          },
        };

        const session = await client.checkoutSessions.create(
          checkoutPayload as Parameters<
            typeof client.checkoutSessions.create
          >[0],
        );

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
      } catch (error: unknown) {
        await db
          .update(transactions)
          .set({ status: "failed" })
          .where(eq(transactions.id, txId))
          .catch(() => {});

        logger.error("Dodo checkout creation error", error, {
          txId,
          responseData: (error as { response?: { data?: unknown } })?.response
            ?.data,
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
                .update(users)
                .set({
                  credits: sql`${users.credits} + COALESCE((SELECT ${transactions.creditsAdded} FROM ${transactions} WHERE ${transactions.id} = ${transaction_id} AND ${transactions.status} = ${tx.status}), 0)`,
                })
                .where(eq(users.id, tx.userId)),
              db
                .update(transactions)
                .set({ status: "completed" })
                .where(
                  and(
                    eq(transactions.id, transaction_id),
                    eq(transactions.status, tx.status),
                  ),
                ),
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
    const db = c.get("db");
    const logger = createLogger("api", { db });

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

          const [localTx] = await db
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

          const paymentId =
            "payment_id" in payload.data &&
            typeof payload.data.payment_id === "string"
              ? payload.data.payment_id
              : null;

          await db.batch([
            db
              .update(users)
              .set({
                credits: sql`${users.credits} + COALESCE((SELECT ${transactions.creditsAdded} FROM ${transactions} WHERE ${transactions.id} = ${transaction_id} AND ${transactions.status} = ${localTx.status}), 0)`,
              })
              .where(eq(users.id, localTx.userId)),
            db
              .update(transactions)
              .set({
                status: "completed",
                dodoPaymentId: paymentId,
              })
              .where(
                and(
                  eq(transactions.id, transaction_id),
                  eq(transactions.status, localTx.status),
                ),
              ),
          ]);

          logger.info(
            `Processed Webhook for ${transaction_id}. Added credits if transaction was pending.`,
            { transaction_id },
          );
        } catch (e) {
          logger.error("Webhook Processing Failed", e, {
            transaction_id: metadata?.transaction_id,
          });
          throw e;
        }
      },

      onPaymentFailed: async (payload) => {
        await updateTransactionStatus(
          db,
          payload,
          "failed",
          "Payment Failed",
          logger,
        );
      },

      onPaymentCancelled: async (payload) => {
        await updateTransactionStatus(
          db,
          payload,
          "cancelled",
          "Payment Cancelled",
          logger,
        );
      },

      onPaymentProcessing: async (payload) => {
        await updateTransactionStatus(
          db,
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

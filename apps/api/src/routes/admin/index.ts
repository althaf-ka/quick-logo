import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { paginationSchema, adminLogsQuerySchema } from "@quicklogo/shared";
import type { Bindings, Variables } from "../../types";
import { requireAdmin } from "../../middleware/require-auth";

import {
  users,
  transactions,
  images,
  projects,
  desc,
  count,
  sum,
  eq,
  gte,
  lt,
  and,
  sql,
  systemLogs,
} from "@quicklogo/db";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use("*", requireAdmin)

  .get("/dashboard", async (c) => {
    const db = c.get("db");

    const [userCount] = await db.select({ value: count() }).from(users);
    const [revenueResult] = await db
      .select({ value: sum(transactions.amount) })
      .from(transactions)
      .where(eq(transactions.status, "completed"));
    const [transactionCount] = await db
      .select({ value: count() })
      .from(transactions);
    const [imageCount] = await db
      .select({ value: count() })
      .from(images)
      .where(eq(images.status, "completed"));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [currentMonthRevenue] = await db
      .select({ value: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, thirtyDaysAgo),
        ),
      );

    const [prevMonthRevenue] = await db
      .select({ value: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, sixtyDaysAgo),
          lt(transactions.createdAt, thirtyDaysAgo),
        ),
      );

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const revenueTrend = await db
      .select({
        day: sql<string>`date(${transactions.createdAt}, 'unixepoch')`,
        amount: sum(transactions.amount),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, fourteenDaysAgo),
        ),
      )
      .groupBy(sql`date(${transactions.createdAt}, 'unixepoch')`)
      .orderBy(sql`date(${transactions.createdAt}, 'unixepoch')`);

    const modelStats = await db
      .select({
        model: images.model,
        count: count(),
      })
      .from(images)
      .groupBy(images.model)
      .orderBy(desc(count()));

    const recentUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    const recentTransactions = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(5);

    return c.json({
      metrics: {
        totalUsers: Number(userCount?.value) || 0,
        totalRevenue: (Number(revenueResult?.value) || 0) / 100,
        totalTransactions: Number(transactionCount?.value) || 0,
        totalImages: Number(imageCount?.value) || 0,
        monthlyRevenue: (Number(currentMonthRevenue?.value) || 0) / 100,
        revenueGrowth:
          prevMonthRevenue && Number(prevMonthRevenue.value)
            ? (((Number(currentMonthRevenue?.value) || 0) -
                Number(prevMonthRevenue.value)) /
                Number(prevMonthRevenue.value)) *
              100
            : 0,
      },
      trends: {
        revenue: revenueTrend.map((t) => ({
          day: t.day as string,
          amount: (Number(t.amount) || 0) / 100,
        })),
      },
      modelStats: modelStats.map((s) => ({
        model: s.model as string,
        count: Number(s.count) || 0,
      })),
      recentUsers,
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        amount: Number(t.amount) / 100,
      })),
    });
  })

  .get("/users", zValidator("query", paginationSchema), async (c) => {
    const db = c.get("db");
    const { page } = c.req.valid("query");
    const limit = 50;
    const offset = (page - 1) * limit;

    const list = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ value: count() }).from(users);

    return c.json({
      items: list,
      metadata: {
        total: Number(total?.value) || 0,
        page,
        limit,
      },
    });
  })

  .get("/projects", zValidator("query", paginationSchema), async (c) => {
    const db = c.get("db");
    const { page } = c.req.valid("query");
    const limit = 50;
    const offset = (page - 1) * limit;

    const list = await db
      .select({
        id: projects.id,
        userId: projects.userId,
        createdAt: projects.createdAt,
        latestThumbnail: projects.latestThumbnail,
        userEmail: users.email,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ value: count() }).from(projects);

    return c.json({
      items: list,
      metadata: {
        total: Number(total?.value) || 0,
        page,
        limit,
      },
    });
  })

  .get("/transactions", zValidator("query", paginationSchema), async (c) => {
    const db = c.get("db");
    const { page } = c.req.valid("query");
    const limit = 50;
    const offset = (page - 1) * limit;

    const list = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        createdAt: transactions.createdAt,
        userEmail: users.email,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ value: count() }).from(transactions);

    return c.json({
      items: list.map((t) => ({ ...t, amount: Number(t.amount) / 100 })),
      metadata: {
        total: Number(total?.value) || 0,
        page,
        limit,
      },
    });
  })

  .get("/logs", zValidator("query", adminLogsQuerySchema), async (c) => {
    const db = c.get("db");
    const { page, level, source } = c.req.valid("query");
    const limit = 50;
    const offset = (page - 1) * limit;

    const whereClauses = [];
    if (level) whereClauses.push(eq(systemLogs.level, level));
    if (source) whereClauses.push(eq(systemLogs.source, source));

    const list = await db
      .select({
        id: systemLogs.id,
        level: systemLogs.level,
        source: systemLogs.source,
        message: systemLogs.message,
        status: systemLogs.status,
        createdAt: systemLogs.createdAt,
        pathname: systemLogs.pathname,
        userEmail: users.email,
        context: systemLogs.context,
        stack: systemLogs.stack,
      })
      .from(systemLogs)
      .leftJoin(users, eq(systemLogs.userId, users.id))
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db
      .select({ value: count() })
      .from(systemLogs)
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined);

    return c.json({
      items: list,
      metadata: {
        total: Number(total?.value) || 0,
        page,
        limit,
      },
    });
  })

  .patch("/logs/:id", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const { status } = await c.req.json();

    if (!["resolved", "ignored", "unresolved"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    await db.update(systemLogs).set({ status }).where(eq(systemLogs.id, id));

    return c.json({ success: true });
  })

  .delete("/logs/:id", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");

    await db.delete(systemLogs).where(eq(systemLogs.id, id));

    return c.json({ success: true });
  });

export default app;
export type AdminType = typeof app;

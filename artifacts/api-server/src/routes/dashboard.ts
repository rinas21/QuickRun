import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, deliveriesTable, activityTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /api/dashboard/stats
router.get("/dashboard/stats", requireAuth, async (req, res) => {
  const [orderStats] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(ordersTable);

  const activeStatuses = ["collecting_offers", "offer_selected", "driver_assigned", "picked_up"];
  const [activeOrders] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(ordersTable)
    .where(sql`status = ANY(ARRAY[${sql.raw(activeStatuses.map((s) => `'${s}'`).join(","))}]::order_status[])`);

  const [userStats] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(usersTable);

  const [sellerStats] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(usersTable)
    .where(eq(usersTable.role, "seller"));

  const [driverStats] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(usersTable)
    .where(eq(usersTable.role, "driver"));

  const [onlineDrivers] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(usersTable)
    .where(and(eq(usersTable.role, "driver"), eq(usersTable.isOnline, true)));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [deliveredToday] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(ordersTable)
    .where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.updatedAt, todayStart)));

  res.json({
    totalOrders: orderStats.total ?? 0,
    activeOrders: activeOrders.count ?? 0,
    totalUsers: userStats.total ?? 0,
    totalSellers: sellerStats.count ?? 0,
    totalDrivers: driverStats.count ?? 0,
    onlineDrivers: onlineDrivers.count ?? 0,
    deliveredToday: deliveredToday.count ?? 0,
    avgDeliveryMinutes: null,
  });
});

// GET /api/dashboard/activity
router.get("/dashboard/activity", requireAuth, async (req, res) => {
  const params = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 10) : 10;

  const activities = await db
    .select()
    .from(activityTable)
    .orderBy(sql`${activityTable.createdAt} DESC`)
    .limit(limit);

  res.json(activities);
});

// GET /api/dashboard/order-status-breakdown
router.get("/dashboard/order-status-breakdown", requireAuth, async (req, res) => {
  const rows = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  res.json(rows.map((r) => ({ status: r.status, count: r.count })));
});

export default router;

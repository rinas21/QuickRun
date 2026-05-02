import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, offersTable, deliveriesTable, activityTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { CreateOrderBody, ListOrdersQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /api/orders
router.get("/orders", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const params = ListOrdersQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = params.success ? (params.data.offset ?? 0) : 0;
  const statusFilter = params.success ? params.data.status : undefined;

  let query = db.select().from(ordersTable);
  const conditions = [];

  // Buyers see only their orders; sellers/drivers/admin see all
  if (user.role === "buyer") {
    conditions.push(eq(ordersTable.buyerId, user.id));
  }
  if (statusFilter) {
    conditions.push(eq(ordersTable.status, statusFilter));
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows.length;
  res.json({ orders: rows, total });
});

// POST /api/orders
router.post("/orders", requireAuth, requireRole("buyer", "admin"), async (req, res) => {
  const user = (req as any).user;
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const [order] = await db.insert(ordersTable).values({
    buyerId: user.id,
    ...parsed.data,
    status: "collecting_offers",
  }).returning();

  await db.insert(activityTable).values({
    type: "order_created",
    orderId: order.id,
    description: `New request: "${order.itemDescription}" from ${order.deliveryAddress}`,
  });

  res.status(201).json(order);
});

// GET /api/orders/:orderId
router.get("/orders/:orderId", requireAuth, async (req, res) => {
  const orderId = Number(req.params.orderId);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, order.buyerId));

  const rawOffers = await db
    .select()
    .from(offersTable)
    .where(eq(offersTable.orderId, orderId))
    .orderBy(offersTable.createdAt);

  const offers = await Promise.all(
    rawOffers.map(async (offer) => {
      const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, offer.sellerId));
      const { passwordHash: _, ...safeSeller } = seller;
      return { ...offer, seller: safeSeller };
    })
  );

  let delivery = null;
  const [rawDelivery] = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.orderId, orderId));
  if (rawDelivery) {
    const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, rawDelivery.driverId));
    const { passwordHash: _, ...safeDriver } = driver;
    delivery = { ...rawDelivery, driver: safeDriver };
  }

  const { passwordHash: _, ...safeBuyer } = buyer;
  res.json({ ...order, buyer: safeBuyer, offers, delivery });
});

// POST /api/orders/:orderId/cancel
router.post("/orders/:orderId/cancel", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const orderId = Number(req.params.orderId);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Only buyer (their own) or admin can cancel
  if (user.role !== "admin" && order.buyerId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (["delivered", "cancelled"].includes(order.status)) {
    res.status(400).json({ error: "Cannot cancel order in current status" });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId))
    .returning();

  await db.insert(activityTable).values({
    type: "cancelled",
    orderId: order.id,
    description: `Order #${order.id} cancelled`,
  });

  res.json(updated);
});

export default router;

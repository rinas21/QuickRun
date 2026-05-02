import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, offersTable, deliveriesTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { CreateOfferBody } from "@workspace/api-zod";

const router = Router();

// GET /api/orders/:orderId/offers
router.get("/orders/:orderId/offers", requireAuth, async (req, res) => {
  const orderId = Number(req.params.orderId);
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

  res.json(offers);
});

// POST /api/orders/:orderId/offers
router.post("/orders/:orderId/offers", requireAuth, requireRole("seller", "admin"), async (req, res) => {
  const user = (req as any).user;
  const orderId = Number(req.params.orderId);
  const parsed = CreateOfferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [offer] = await db.insert(offersTable).values({
    orderId,
    sellerId: user.id,
    ...parsed.data,
  }).returning();

  await db.insert(activityTable).values({
    type: "offer_submitted",
    orderId,
    description: `Offer submitted: LKR ${offer.price} for "${order.itemDescription}"`,
  });

  const { passwordHash: _, ...safeSeller } = user;
  res.status(201).json({ ...offer, seller: safeSeller });
});

// POST /api/offers/:offerId/select
router.post("/offers/:offerId/select", requireAuth, requireRole("buyer", "admin"), async (req, res) => {
  const user = (req as any).user;
  const offerId = Number(req.params.offerId);

  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId));
  if (!offer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, offer.orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (user.role !== "admin" && order.buyerId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Find an available driver (first online driver)
  const drivers = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "driver"))
    .limit(10);

  const availableDriver = drivers.find((d) => d.isOnline && d.isActive) || drivers[0];
  if (!availableDriver) {
    res.status(422).json({ error: "No drivers available right now" });
    return;
  }

  // Update order
  const [updatedOrder] = await db
    .update(ordersTable)
    .set({
      status: "driver_assigned",
      selectedOfferId: offerId,
      finalPrice: offer.price,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, offer.orderId))
    .returning();

  // Create delivery
  const [delivery] = await db.insert(deliveriesTable).values({
    orderId: order.id,
    driverId: availableDriver.id,
    offerId,
    status: "assigned",
  }).returning();

  await db.insert(activityTable).values({
    type: "offer_selected",
    orderId: order.id,
    description: `Offer selected — LKR ${offer.price}. Driver ${availableDriver.name} assigned.`,
  });

  await db.insert(activityTable).values({
    type: "driver_assigned",
    orderId: order.id,
    description: `Driver ${availableDriver.name} assigned for delivery`,
  });

  // Build full response
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, updatedOrder.buyerId));
  const rawOffers = await db.select().from(offersTable).where(eq(offersTable.orderId, order.id));
  const offers = await Promise.all(
    rawOffers.map(async (o) => {
      const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, o.sellerId));
      const { passwordHash: _, ...safeSeller } = seller;
      return { ...o, seller: safeSeller };
    })
  );
  const { passwordHash: _, ...safeDriver } = availableDriver;
  const { passwordHash: __, ...safeBuyer } = buyer;

  res.json({
    ...updatedOrder,
    buyer: safeBuyer,
    offers,
    delivery: { ...delivery, driver: safeDriver },
  });
});

export default router;

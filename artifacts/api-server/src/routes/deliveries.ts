import { Router } from "express";
import { db } from "@workspace/db";
import { deliveriesTable, ordersTable, offersTable, usersTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { UpdateDeliveryStatusBody, UpdateDriverLocationBody, ListDeliveriesQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /api/deliveries
router.get("/deliveries", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const params = ListDeliveriesQueryParams.safeParse(req.query);
  const statusFilter = params.success ? params.data.status : undefined;

  const conditions = [];
  if (user.role === "driver") {
    conditions.push(eq(deliveriesTable.driverId, user.id));
  }
  if (statusFilter) {
    conditions.push(eq(deliveriesTable.status, statusFilter));
  }

  const rawDeliveries = await db
    .select()
    .from(deliveriesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(deliveriesTable.createdAt);

  const deliveries = await Promise.all(
    rawDeliveries.map(async (d) => {
      const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, d.driverId));
      const { passwordHash: _, ...safeDriver } = driver;
      return { ...d, driver: safeDriver };
    })
  );

  res.json(deliveries);
});

// GET /api/deliveries/:deliveryId
router.get("/deliveries/:deliveryId", requireAuth, async (req, res) => {
  const deliveryId = Number(req.params.deliveryId);
  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, deliveryId));
  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, delivery.driverId));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, delivery.orderId));
  const rawOffer = await db.select().from(offersTable).where(eq(offersTable.id, delivery.offerId));
  const offer = rawOffer[0];

  let offerWithSeller = offer;
  if (offer) {
    const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, offer.sellerId));
    const { passwordHash: _, ...safeSeller } = seller;
    (offerWithSeller as any).seller = safeSeller;
  }

  const { passwordHash: _, ...safeDriver } = driver;
  res.json({ ...delivery, driver: safeDriver, order, offer: offerWithSeller });
});

// PATCH /api/deliveries/:deliveryId/status
router.patch("/deliveries/:deliveryId/status", requireAuth, requireRole("driver", "admin"), async (req, res) => {
  const deliveryId = Number(req.params.deliveryId);
  const parsed = UpdateDeliveryStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, deliveryId));
  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  const { status } = parsed.data;
  const updateData: Partial<typeof delivery> = { status };

  if (status === "picked_up") {
    updateData.pickedUpAt = new Date() as any;
    // Update order status too
    await db.update(ordersTable).set({ status: "picked_up", updatedAt: new Date() }).where(eq(ordersTable.id, delivery.orderId));
  }
  if (status === "delivered") {
    updateData.deliveredAt = new Date() as any;
    await db.update(ordersTable).set({ status: "delivered", updatedAt: new Date() }).where(eq(ordersTable.id, delivery.orderId));
  }

  const [updated] = await db
    .update(deliveriesTable)
    .set(updateData)
    .where(eq(deliveriesTable.id, deliveryId))
    .returning();

  const activityTypeMap: Record<string, any> = {
    picked_up: "picked_up",
    delivered: "delivered",
    heading_to_seller: "driver_assigned",
    heading_to_buyer: "driver_assigned",
  };

  if (activityTypeMap[status]) {
    await db.insert(activityTable).values({
      type: activityTypeMap[status],
      orderId: delivery.orderId,
      description: `Delivery status updated to: ${status.replace(/_/g, " ")}`,
    });
  }

  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, updated.driverId));
  const { passwordHash: _, ...safeDriver } = driver;
  res.json({ ...updated, driver: safeDriver });
});

// PATCH /api/deliveries/:deliveryId/location
router.patch("/deliveries/:deliveryId/location", requireAuth, requireRole("driver", "admin"), async (req, res) => {
  const deliveryId = Number(req.params.deliveryId);
  const parsed = UpdateDriverLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  await db
    .update(deliveriesTable)
    .set({ driverLatitude: parsed.data.latitude, driverLongitude: parsed.data.longitude })
    .where(eq(deliveriesTable.id, deliveryId));

  res.json({ message: "Location updated" });
});

export default router;

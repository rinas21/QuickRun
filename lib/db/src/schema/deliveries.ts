import { pgTable, serial, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";
import { offersTable } from "./offers";

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "assigned",
  "heading_to_seller",
  "picked_up",
  "heading_to_buyer",
  "delivered",
  "failed",
]);

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  driverId: integer("driver_id").notNull().references(() => usersTable.id),
  offerId: integer("offer_id").notNull().references(() => offersTable.id),
  status: deliveryStatusEnum("status").notNull().default("assigned"),
  driverLatitude: real("driver_latitude"),
  driverLongitude: real("driver_longitude"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({ id: true, createdAt: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;

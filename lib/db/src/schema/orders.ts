import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "collecting_offers",
  "offer_selected",
  "driver_assigned",
  "picked_up",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  itemDescription: text("item_description").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: real("delivery_latitude").notNull(),
  deliveryLongitude: real("delivery_longitude").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  selectedOfferId: integer("selected_offer_id"),
  finalPrice: real("final_price"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

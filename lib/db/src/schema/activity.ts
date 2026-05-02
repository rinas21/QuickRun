import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const activityTypeEnum = pgEnum("activity_type", [
  "order_created",
  "offer_submitted",
  "offer_selected",
  "driver_assigned",
  "picked_up",
  "delivered",
  "cancelled",
]);

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Activity = typeof activityTable.$inferSelect;

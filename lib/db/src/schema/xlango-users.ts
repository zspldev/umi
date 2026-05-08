import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const xlangoUsers = pgTable("xlango_users", {
  deviceId: text("device_id").primaryKey(),
  displayName: text("display_name").notNull().default("Unknown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertXlangoUserSchema = createInsertSchema(xlangoUsers).omit({
  createdAt: true,
  updatedAt: true,
});

export type XlangoUser = typeof xlangoUsers.$inferSelect;
export type InsertXlangoUser = z.infer<typeof insertXlangoUserSchema>;

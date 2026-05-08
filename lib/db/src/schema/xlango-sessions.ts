import { pgTable, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const xlangoSessions = pgTable("xlango_sessions", {
  id: text("id").primaryKey(),
  deviceId: text("device_id"),
  fromLang: text("from_lang").notNull(),
  toLang: text("to_lang").notNull(),
  appSource: text("app_source").notNull().default("unknown"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  totalCostUsd: doublePrecision("total_cost_usd").notNull().default(0),
});

export const insertXlangoSessionSchema = createInsertSchema(xlangoSessions).omit({
  startedAt: true,
  totalCostUsd: true,
});

export type XlangoSession = typeof xlangoSessions.$inferSelect;
export type InsertXlangoSession = z.infer<typeof insertXlangoSessionSchema>;

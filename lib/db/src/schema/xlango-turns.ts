import { pgTable, serial, text, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const xlangoTurns = pgTable("xlango_turns", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  deviceId: text("device_id"),
  model: text("model").notNull(),
  endpoint: text("endpoint").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  audioInputTokens: integer("audio_input_tokens"),
  audioOutputTokens: integer("audio_output_tokens"),
  audioSeconds: doublePrecision("audio_seconds"),
  charCount: integer("char_count"),
  costUsd: doublePrecision("cost_usd").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertXlangoTurnSchema = createInsertSchema(xlangoTurns).omit({
  id: true,
  createdAt: true,
});

export type XlangoTurn = typeof xlangoTurns.$inferSelect;
export type InsertXlangoTurn = z.infer<typeof insertXlangoTurnSchema>;

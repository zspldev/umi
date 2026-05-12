import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const xlangoFeedback = pgTable("xlango_feedback", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  deviceId: text("device_id"),
  tripCode: text("trip_code"),
  rating: integer("rating"),
  feedbackText: text("feedback_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type XlangoFeedback = typeof xlangoFeedback.$inferSelect;
export type InsertXlangoFeedback = typeof xlangoFeedback.$inferInsert;

import { db, xlangoUsers, xlangoTurns, xlangoSessions } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

/**
 * Upsert a user by device ID. No-op if deviceId is missing.
 */
export async function upsertUser(deviceId: string | undefined, displayName: string | undefined): Promise<void> {
  if (!deviceId) return;
  await db
    .insert(xlangoUsers)
    .values({ deviceId, displayName: displayName ?? "Unknown" })
    .onConflictDoUpdate({
      target: xlangoUsers.deviceId,
      set: {
        displayName: displayName ?? "Unknown",
        updatedAt: new Date(),
      },
    });
}

/**
 * Ensure a session row exists. No-op if sessionId is missing.
 */
export async function upsertSession(opts: {
  sessionId: string | undefined;
  deviceId: string | undefined;
  fromLang: string;
  toLang: string;
  appSource: string;
  tripCode?: string;
}): Promise<void> {
  if (!opts.sessionId) return;
  await db
    .insert(xlangoSessions)
    .values({
      id: opts.sessionId,
      deviceId: opts.deviceId ?? null,
      tripCode: opts.tripCode ?? null,
      fromLang: opts.fromLang,
      toLang: opts.toLang,
      appSource: opts.appSource,
    })
    .onConflictDoNothing();
}

/**
 * Record a usage turn and increment the session's total cost.
 */
export async function logTurn(turn: {
  sessionId: string | undefined;
  deviceId: string | undefined;
  model: string;
  endpoint: string;
  inputTokens?: number;
  outputTokens?: number;
  audioInputTokens?: number;
  audioOutputTokens?: number;
  audioSeconds?: number;
  charCount?: number;
  costUsd: number;
}): Promise<void> {
  await db.insert(xlangoTurns).values({
    sessionId: turn.sessionId ?? null,
    deviceId: turn.deviceId ?? null,
    model: turn.model,
    endpoint: turn.endpoint,
    inputTokens: turn.inputTokens ?? null,
    outputTokens: turn.outputTokens ?? null,
    audioInputTokens: turn.audioInputTokens ?? null,
    audioOutputTokens: turn.audioOutputTokens ?? null,
    audioSeconds: turn.audioSeconds ?? null,
    charCount: turn.charCount ?? null,
    costUsd: turn.costUsd,
  });

  if (turn.sessionId && turn.costUsd > 0) {
    await db
      .update(xlangoSessions)
      .set({ totalCostUsd: sql`${xlangoSessions.totalCostUsd} + ${turn.costUsd}` })
      .where(eq(xlangoSessions.id, turn.sessionId));
  }
}

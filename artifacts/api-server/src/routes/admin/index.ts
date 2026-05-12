import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";

function checkPin(req: import("express").Request): boolean {
  return req.headers["x-admin-pin"] === ADMIN_PIN && ADMIN_PIN.length > 0;
}

/**
 * GET /api/admin/dashboard?tripCode=XXX
 * Returns member list, session counts, and cost breakdown for a trip.
 * Requires X-Admin-Pin header.
 */
router.get("/dashboard", async (req, res) => {
  if (!checkPin(req)) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  const tripCode = (req.query.tripCode as string | undefined)?.trim();
  if (!tripCode) {
    res.status(400).json({ error: "tripCode query param required" });
    return;
  }

  try {
    const summaryRows = await db.execute(sql`
      SELECT
        COUNT(DISTINCT device_id)::int           AS member_count,
        COUNT(*)::int                            AS session_count,
        COALESCE(SUM(total_cost_usd), 0)         AS total_cost_usd
      FROM xlango_sessions
      WHERE trip_code = ${tripCode}
    `);

    const memberRows = await db.execute(sql`
      SELECT
        s.device_id,
        COALESCE(u.display_name, 'Unknown')     AS display_name,
        COUNT(s.id)::int                        AS session_count,
        COALESCE(SUM(s.total_cost_usd), 0)      AS total_cost_usd,
        MAX(s.started_at)                       AS last_active_at
      FROM xlango_sessions s
      LEFT JOIN xlango_users u ON u.device_id = s.device_id
      WHERE s.trip_code = ${tripCode}
      GROUP BY s.device_id, u.display_name
      ORDER BY total_cost_usd DESC
    `);

    const feedbackRows = await db.execute(sql`
      SELECT session_id, device_id, rating, feedback_text, created_at
      FROM xlango_feedback
      WHERE trip_code = ${tripCode}
      ORDER BY created_at DESC
    `);

    const summary = summaryRows.rows[0] ?? { member_count: 0, session_count: 0, total_cost_usd: 0 };

    res.json({
      tripCode,
      summary: {
        memberCount:  summary.member_count,
        sessionCount: summary.session_count,
        totalCostUsd: Number(summary.total_cost_usd),
      },
      members: memberRows.rows.map(r => ({
        deviceId:     r.device_id,
        displayName:  r.display_name,
        sessionCount: r.session_count,
        totalCostUsd: Number(r.total_cost_usd),
        lastActiveAt: r.last_active_at,
      })),
      feedback: feedbackRows.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/sessions?tripCode=XXX&deviceId=YYY
 * Returns sessions for a specific member in a trip.
 * Requires X-Admin-Pin header.
 */
router.get("/sessions", async (req, res) => {
  if (!checkPin(req)) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  const tripCode = (req.query.tripCode as string | undefined)?.trim();
  const deviceId = (req.query.deviceId as string | undefined)?.trim();
  if (!tripCode || !deviceId) {
    res.status(400).json({ error: "tripCode and deviceId required" });
    return;
  }

  try {
    const rows = await db.execute(sql`
      SELECT id, from_lang, to_lang, app_source, started_at, ended_at, total_cost_usd
      FROM xlango_sessions
      WHERE trip_code = ${tripCode} AND device_id = ${deviceId}
      ORDER BY started_at DESC
      LIMIT 50
    `);

    res.json({ sessions: rows.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed";
    res.status(500).json({ error: message });
  }
});

export default router;

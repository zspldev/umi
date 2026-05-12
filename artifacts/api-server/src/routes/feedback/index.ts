import { Router } from "express";
import { db, xlangoFeedback } from "@workspace/db";

const router = Router();

/**
 * POST /api/feedback
 * Body: { sessionId?, rating, feedbackText?, tripCode? }
 * No auth required — any user can submit feedback.
 */
router.post("/", async (req, res) => {
  try {
    const deviceId = req.headers["x-device-id"] as string | undefined;
    const tripCode = (req.headers["x-trip-code"] as string | undefined) ?? null;
    const { sessionId, rating, feedbackText } = req.body as {
      sessionId?: string;
      rating?: number;
      feedbackText?: string;
    };

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "rating must be 1–5" });
      return;
    }

    await db.insert(xlangoFeedback).values({
      sessionId: sessionId ?? null,
      deviceId: deviceId ?? null,
      tripCode,
      rating,
      feedbackText: feedbackText?.trim() || null,
    });

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save feedback";
    res.status(500).json({ error: message });
  }
});

export default router;

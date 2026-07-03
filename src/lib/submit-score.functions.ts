import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-side bounds per game. Any submission outside these limits is rejected.
const GAME_LIMITS: Record<string, { maxScore: number; minDurationSeconds: number; maxDurationSeconds: number }> = {
  "tic-tac-toe":     { maxScore: 1,        minDurationSeconds: 1,  maxDurationSeconds: 3600 },
  "snake":           { maxScore: 100000,   minDurationSeconds: 2,  maxDurationSeconds: 7200 },
  "2048":            { maxScore: 5000000,  minDurationSeconds: 5,  maxDurationSeconds: 14400 },
  "tetris":          { maxScore: 10000000, minDurationSeconds: 5,  maxDurationSeconds: 14400 },
  "sudoku":          { maxScore: 10000,    minDurationSeconds: 20, maxDurationSeconds: 14400 },
  "memory":          { maxScore: 10000,    minDurationSeconds: 3,  maxDurationSeconds: 3600 },
  "sliding-puzzle":  { maxScore: 10000,    minDurationSeconds: 3,  maxDurationSeconds: 7200 },
  "wordle":          { maxScore: 100,      minDurationSeconds: 3,  maxDurationSeconds: 3600 },
  "hangman":         { maxScore: 100,      minDurationSeconds: 3,  maxDurationSeconds: 3600 },
  "word-search":     { maxScore: 10000,    minDurationSeconds: 5,  maxDurationSeconds: 7200 },
};

type ScoreInput = {
  gameSlug: string;
  score: number;
  durationSeconds: number;
  won: boolean;
  metadata?: Record<string, unknown> | null;
};

function validate(input: unknown): ScoreInput {
  if (!input || typeof input !== "object") throw new Error("Invalid payload");
  const raw = input as Record<string, unknown>;
  const gameSlug = String(raw.gameSlug ?? "");
  const score = Number(raw.score);
  const durationSeconds = Number(raw.durationSeconds);
  const won = Boolean(raw.won);
  const metadata =
    raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
      ? (raw.metadata as Record<string, unknown>)
      : null;

  const limits = GAME_LIMITS[gameSlug];
  if (!limits) throw new Error("Unknown game");
  if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > limits.maxScore) {
    throw new Error("Invalid score");
  }
  if (
    !Number.isFinite(durationSeconds) ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < limits.minDurationSeconds ||
    durationSeconds > limits.maxDurationSeconds
  ) {
    throw new Error("Invalid duration");
  }
  // Restrict metadata size to prevent abuse.
  if (metadata && JSON.stringify(metadata).length > 2000) {
    throw new Error("Metadata too large");
  }
  return { gameSlug, score, durationSeconds, won, metadata };
}

export const submitScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("game_scores").insert({
      user_id: userId,
      game_slug: data.gameSlug,
      score: data.score,
      duration_seconds: data.durationSeconds,
      won: data.won,
      metadata: (data.metadata ?? null) as never,
    });
    if (error) throw new Error("Failed to save score");
    return { ok: true as const };
  });

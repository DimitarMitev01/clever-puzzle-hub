import { supabase } from "@/integrations/supabase/client";
import { submitScore } from "@/lib/submit-score.functions";

export async function saveScore(input: {
  gameSlug: string;
  score: number;
  durationSeconds: number;
  won: boolean;
  metadata?: Record<string, unknown>;
}) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return { skipped: true as const };
  try {
    await submitScore({
      data: {
        gameSlug: input.gameSlug,
        score: input.score,
        durationSeconds: input.durationSeconds,
        won: input.won,
        metadata: input.metadata ?? null,
      },
    });
    return { skipped: false as const };
  } catch (error) {
    // Silently ignore invalid/rejected submissions on the client;
    // server-side validation is the source of truth.
    console.warn("saveScore rejected:", error);
    return { skipped: true as const };
  }
}

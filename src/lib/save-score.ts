import { supabase } from "@/integrations/supabase/client";

export async function saveScore(input: {
  gameSlug: string;
  score: number;
  durationSeconds: number;
  won: boolean;
  metadata?: Record<string, unknown>;
}) {
  const { data: session } = await supabase.auth.getSession();
  const user = session.session?.user;
  if (!user) return { skipped: true as const };
  const { error } = await supabase.from("game_scores").insert({
    user_id: user.id,
    game_slug: input.gameSlug,
    score: input.score,
    duration_seconds: input.durationSeconds,
    won: input.won,
    metadata: (input.metadata ?? null) as never,
  });
  if (error) throw error;
  return { skipped: false as const };
}

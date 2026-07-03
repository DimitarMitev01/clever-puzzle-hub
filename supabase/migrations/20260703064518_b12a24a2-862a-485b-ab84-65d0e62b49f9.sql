
-- 1) Restrict game_scores SELECT to authenticated users only
DROP POLICY IF EXISTS "Scores are viewable by everyone" ON public.game_scores;
CREATE POLICY "Scores are viewable by authenticated users"
  ON public.game_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) Add sanity CHECK constraints on game_scores
ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_score_range,
  DROP CONSTRAINT IF EXISTS game_scores_duration_range;
ALTER TABLE public.game_scores
  ADD CONSTRAINT game_scores_score_range
    CHECK (score >= 0 AND score <= 100000000),
  ADD CONSTRAINT game_scores_duration_range
    CHECK (duration_seconds >= 0 AND duration_seconds <= 86400);

-- 3) Fix mutable search_path on internal email helper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

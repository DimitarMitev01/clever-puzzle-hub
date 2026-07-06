
CREATE TABLE public.moderator_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, status)
);

GRANT SELECT, INSERT ON public.moderator_requests TO authenticated;
GRANT ALL ON public.moderator_requests TO service_role;

ALTER TABLE public.moderator_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.moderator_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own requests"
  ON public.moderator_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER moderator_requests_updated_at
  BEFORE UPDATE ON public.moderator_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.community_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  title text NOT NULL,
  description text,
  topic text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_games TO authenticated;
GRANT SELECT ON public.community_games TO anon;
GRANT ALL ON public.community_games TO service_role;

ALTER TABLE public.community_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved games"
  ON public.community_games FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can create games"
  ON public.community_games FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Authors can update own pending games"
  ON public.community_games FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id AND status = 'pending')
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own games"
  ON public.community_games FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER community_games_updated_at
  BEFORE UPDATE ON public.community_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX community_games_status_idx ON public.community_games(status, created_at DESC);
CREATE INDEX community_games_author_idx ON public.community_games(author_id, created_at DESC);

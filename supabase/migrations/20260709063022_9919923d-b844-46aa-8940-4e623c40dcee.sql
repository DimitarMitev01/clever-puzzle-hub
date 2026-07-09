CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete any score" ON public.game_scores;
CREATE POLICY "Admins can delete any score" ON public.game_scores
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read site visits" ON public.site_visits;
CREATE POLICY "Admins can read site visits" ON public.site_visits
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view own requests" ON public.moderator_requests;
CREATE POLICY "Users can view own requests" ON public.moderator_requests
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public can view approved games" ON public.community_games;
CREATE POLICY "Public can view approved games" ON public.community_games
  FOR SELECT
  USING ((status = 'approved'::text) OR (auth.uid() = author_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Moderators can create games" ON public.community_games;
CREATE POLICY "Moderators can create games" ON public.community_games
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = author_id) AND (private.has_role(auth.uid(), 'moderator'::public.app_role) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

DROP POLICY IF EXISTS "Authors can delete own games" ON public.community_games;
CREATE POLICY "Authors can delete own games" ON public.community_games
  FOR DELETE TO authenticated
  USING ((auth.uid() = author_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
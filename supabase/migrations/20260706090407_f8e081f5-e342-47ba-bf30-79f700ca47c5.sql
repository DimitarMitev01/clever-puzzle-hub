ALTER TABLE public.moderator_requests
  DROP CONSTRAINT IF EXISTS moderator_requests_user_id_status_key;

CREATE UNIQUE INDEX IF NOT EXISTS moderator_requests_one_pending_per_user
  ON public.moderator_requests (user_id)
  WHERE status = 'pending';
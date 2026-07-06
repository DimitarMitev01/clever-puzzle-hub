
CREATE TABLE public.site_visits (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_visits_created_at ON public.site_visits(created_at DESC);
CREATE INDEX idx_site_visits_visitor_id ON public.site_visits(visitor_id);
GRANT ALL ON public.site_visits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.site_visits_id_seq TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
-- No policies: only accessed via service_role in server functions.

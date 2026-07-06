-- Lock down site_visits: only admins can read; only service_role writes.
CREATE POLICY "Admins can read site visits"
ON public.site_visits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages site visits"
ON public.site_visits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
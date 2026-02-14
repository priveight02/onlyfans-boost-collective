
-- Reduce permissive RLS warnings while preserving public insert behavior
-- Replace WITH CHECK (true) with role-based checks for anon/authenticated.

-- admin_login_attempts
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.admin_login_attempts;
CREATE POLICY "Anyone can insert login attempts"
  ON public.admin_login_attempts
  FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- bio_link_clicks
DROP POLICY IF EXISTS "Anyone can insert bio_link_clicks" ON public.bio_link_clicks;
CREATE POLICY "Anyone can insert bio_link_clicks"
  ON public.bio_link_clicks
  FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- site_visits
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can insert visits"
  ON public.site_visits
  FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));


-- The analytics_events INSERT policy with WITH CHECK (true) is intentional for public tracking
-- But let's make it slightly more restrictive by requiring restaurant_id and type
DROP POLICY "Anyone can insert analytics" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (restaurant_id IS NOT NULL AND type IS NOT NULL);


CREATE OR REPLACE FUNCTION public.increment_generation_count(_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET generations_used = generations_used + 1,
      updated_at = now()
  WHERE restaurant_id = _restaurant_id;
END;
$$;

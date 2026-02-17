-- Fix: allow owner to SELECT their restaurant even before the member row is created by the trigger
DROP POLICY IF EXISTS "Members can view their restaurants" ON public.restaurants;
CREATE POLICY "Members can view their restaurants"
  ON public.restaurants FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR is_restaurant_member(auth.uid(), id));
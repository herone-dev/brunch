
-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can create restaurants" ON public.restaurants;
CREATE POLICY "Authenticated users can create restaurants"
  ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Also fix SELECT to be permissive so owners can see their restaurant after insert
DROP POLICY IF EXISTS "Members can view their restaurants" ON public.restaurants;
CREATE POLICY "Members can view their restaurants"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (is_restaurant_member(auth.uid(), id));

-- Fix UPDATE
DROP POLICY IF EXISTS "Owner can update restaurant" ON public.restaurants;
CREATE POLICY "Owner can update restaurant"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (has_restaurant_role(auth.uid(), id, 'owner'));

-- Fix DELETE
DROP POLICY IF EXISTS "Owner can delete restaurant" ON public.restaurants;
CREATE POLICY "Owner can delete restaurant"
  ON public.restaurants
  FOR DELETE
  TO authenticated
  USING (has_restaurant_role(auth.uid(), id, 'owner'));

-- Same fix for restaurant_members INSERT (needed for the auto_add_owner trigger)
DROP POLICY IF EXISTS "Owner can manage members" ON public.restaurant_members;
CREATE POLICY "Owner can manage members"
  ON public.restaurant_members
  FOR INSERT
  TO authenticated
  WITH CHECK (has_restaurant_role(auth.uid(), restaurant_id, 'owner') OR user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view members" ON public.restaurant_members;
CREATE POLICY "Members can view members"
  ON public.restaurant_members
  FOR SELECT
  TO authenticated
  USING (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Owner can update members" ON public.restaurant_members;
CREATE POLICY "Owner can update members"
  ON public.restaurant_members
  FOR UPDATE
  TO authenticated
  USING (has_restaurant_role(auth.uid(), restaurant_id, 'owner'));

DROP POLICY IF EXISTS "Owner can delete members" ON public.restaurant_members;
CREATE POLICY "Owner can delete members"
  ON public.restaurant_members
  FOR DELETE
  TO authenticated
  USING (has_restaurant_role(auth.uid(), restaurant_id, 'owner'));

-- Fix menus policies
DROP POLICY IF EXISTS "Members can view menus" ON public.menus;
CREATE POLICY "Members can view menus" ON public.menus FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Editors can manage menus" ON public.menus;
CREATE POLICY "Editors can manage menus" ON public.menus FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Editors can update menus" ON public.menus;
CREATE POLICY "Editors can update menus" ON public.menus FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Owner can delete menus" ON public.menus;
CREATE POLICY "Owner can delete menus" ON public.menus FOR DELETE TO authenticated USING (has_restaurant_role(auth.uid(), restaurant_id, 'owner'));

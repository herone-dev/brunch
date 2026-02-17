
-- Fix menu_categories policies to be permissive
DROP POLICY IF EXISTS "Members can view categories" ON public.menu_categories;
CREATE POLICY "Members can view categories" ON public.menu_categories FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_menu(menu_id)));

DROP POLICY IF EXISTS "Members can insert categories" ON public.menu_categories;
CREATE POLICY "Members can insert categories" ON public.menu_categories FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), get_restaurant_id_from_menu(menu_id)));

DROP POLICY IF EXISTS "Members can update categories" ON public.menu_categories;
CREATE POLICY "Members can update categories" ON public.menu_categories FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_menu(menu_id)));

DROP POLICY IF EXISTS "Members can delete categories" ON public.menu_categories;
CREATE POLICY "Members can delete categories" ON public.menu_categories FOR DELETE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_menu(menu_id)));

-- Fix menu_category_translations
DROP POLICY IF EXISTS "Members can view category translations" ON public.menu_category_translations;
CREATE POLICY "Members can view category translations" ON public.menu_category_translations FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

DROP POLICY IF EXISTS "Members can insert category translations" ON public.menu_category_translations;
CREATE POLICY "Members can insert category translations" ON public.menu_category_translations FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

DROP POLICY IF EXISTS "Members can update category translations" ON public.menu_category_translations;
CREATE POLICY "Members can update category translations" ON public.menu_category_translations FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

DROP POLICY IF EXISTS "Members can delete category translations" ON public.menu_category_translations;
CREATE POLICY "Members can delete category translations" ON public.menu_category_translations FOR DELETE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

-- Fix menu_items
DROP POLICY IF EXISTS "Members can view items" ON public.menu_items;
CREATE POLICY "Members can view items" ON public.menu_items FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

DROP POLICY IF EXISTS "Members can insert items" ON public.menu_items;
CREATE POLICY "Members can insert items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

DROP POLICY IF EXISTS "Members can update items" ON public.menu_items;
CREATE POLICY "Members can update items" ON public.menu_items FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

DROP POLICY IF EXISTS "Members can delete items" ON public.menu_items;
CREATE POLICY "Members can delete items" ON public.menu_items FOR DELETE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_category(category_id)));

-- Fix menu_item_translations
DROP POLICY IF EXISTS "Members can view item translations" ON public.menu_item_translations;
CREATE POLICY "Members can view item translations" ON public.menu_item_translations FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can insert item translations" ON public.menu_item_translations;
CREATE POLICY "Members can insert item translations" ON public.menu_item_translations FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can update item translations" ON public.menu_item_translations;
CREATE POLICY "Members can update item translations" ON public.menu_item_translations FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can delete item translations" ON public.menu_item_translations;
CREATE POLICY "Members can delete item translations" ON public.menu_item_translations FOR DELETE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

-- Fix menu_item_media
DROP POLICY IF EXISTS "Members can view media" ON public.menu_item_media;
CREATE POLICY "Members can view media" ON public.menu_item_media FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can insert media" ON public.menu_item_media;
CREATE POLICY "Members can insert media" ON public.menu_item_media FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can update media" ON public.menu_item_media;
CREATE POLICY "Members can update media" ON public.menu_item_media FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can delete media" ON public.menu_item_media;
CREATE POLICY "Members can delete media" ON public.menu_item_media FOR DELETE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

-- Fix menu_item_models
DROP POLICY IF EXISTS "Members can view models" ON public.menu_item_models;
CREATE POLICY "Members can view models" ON public.menu_item_models FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can insert models" ON public.menu_item_models;
CREATE POLICY "Members can insert models" ON public.menu_item_models FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

DROP POLICY IF EXISTS "Members can update models" ON public.menu_item_models;
CREATE POLICY "Members can update models" ON public.menu_item_models FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), get_restaurant_id_from_item(item_id)));

-- Fix menu_import_jobs
DROP POLICY IF EXISTS "Members can view import jobs" ON public.menu_import_jobs;
CREATE POLICY "Members can view import jobs" ON public.menu_import_jobs FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Members can create import jobs" ON public.menu_import_jobs;
CREATE POLICY "Members can create import jobs" ON public.menu_import_jobs FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Members can update import jobs" ON public.menu_import_jobs;
CREATE POLICY "Members can update import jobs" ON public.menu_import_jobs FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

-- Fix model_jobs
DROP POLICY IF EXISTS "Members can view model jobs" ON public.model_jobs;
CREATE POLICY "Members can view model jobs" ON public.model_jobs FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Members can create model jobs" ON public.model_jobs;
CREATE POLICY "Members can create model jobs" ON public.model_jobs FOR INSERT TO authenticated WITH CHECK (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Members can update model jobs" ON public.model_jobs;
CREATE POLICY "Members can update model jobs" ON public.model_jobs FOR UPDATE TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

-- Fix analytics_events
DROP POLICY IF EXISTS "Members can view analytics" ON public.analytics_events;
CREATE POLICY "Members can view analytics" ON public.analytics_events FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics" ON public.analytics_events FOR INSERT TO public WITH CHECK (restaurant_id IS NOT NULL AND type IS NOT NULL);

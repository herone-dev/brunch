
-- ============================================
-- BRUNCH V1 — Full Schema
-- ============================================

-- Role enum for restaurant members
CREATE TYPE public.app_role AS ENUM ('owner', 'editor', 'viewer');

-- Menu status
CREATE TYPE public.menu_status AS ENUM ('draft', 'published');

-- Job status
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Model status
CREATE TYPE public.model_status AS ENUM ('none', 'pending', 'processing', 'ready', 'failed');

-- Media type
CREATE TYPE public.media_type AS ENUM ('image', 'video');

-- ============================================
-- 1. RESTAURANTS
-- ============================================
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  slug TEXT NOT NULL UNIQUE,
  default_lang TEXT NOT NULL DEFAULT 'fr',
  supported_langs TEXT[] NOT NULL DEFAULT ARRAY['fr'],
  logo_path TEXT,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. RESTAURANT MEMBERS
-- ============================================
CREATE TABLE public.restaurant_members (
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, user_id)
);

ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. MENUS
-- ============================================
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Menu Principal',
  status public.menu_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. MENU CATEGORIES
-- ============================================
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. MENU CATEGORY TRANSLATIONS
-- ============================================
CREATE TABLE public.menu_category_translations (
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (category_id, lang)
);

ALTER TABLE public.menu_category_translations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. MENU ITEMS
-- ============================================
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  price_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_available BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. MENU ITEM TRANSLATIONS
-- ============================================
CREATE TABLE public.menu_item_translations (
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (item_id, lang)
);

ALTER TABLE public.menu_item_translations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. MENU ITEM MEDIA
-- ============================================
CREATE TABLE public.menu_item_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  type public.media_type NOT NULL DEFAULT 'image',
  storage_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_item_media ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. MENU ITEM MODELS (3D)
-- ============================================
CREATE TABLE public.menu_item_models (
  item_id UUID PRIMARY KEY REFERENCES public.menu_items(id) ON DELETE CASCADE,
  status public.model_status NOT NULL DEFAULT 'none',
  glb_path TEXT,
  usdz_path TEXT,
  preview_image_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_item_models ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. MENU IMPORT JOBS
-- ============================================
CREATE TABLE public.menu_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  status public.job_status NOT NULL DEFAULT 'pending',
  result_json JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_import_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. MODEL JOBS
-- ============================================
CREATE TABLE public.model_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  status public.job_status NOT NULL DEFAULT 'pending',
  input_paths JSONB,
  outputs JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.model_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. ANALYTICS EVENTS
-- ============================================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  menu_id UUID REFERENCES public.menus(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================

-- Check if user is member of a restaurant
CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id
  )
$$;

-- Check if user has specific role in restaurant
CREATE OR REPLACE FUNCTION public.has_restaurant_role(_user_id UUID, _restaurant_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND role = _role
  )
$$;

-- Get restaurant_id from menu_id
CREATE OR REPLACE FUNCTION public.get_restaurant_id_from_menu(_menu_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.menus WHERE id = _menu_id
$$;

-- Get restaurant_id from category_id
CREATE OR REPLACE FUNCTION public.get_restaurant_id_from_category(_category_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.restaurant_id FROM public.menu_categories mc
  JOIN public.menus m ON m.id = mc.menu_id
  WHERE mc.id = _category_id
$$;

-- Get restaurant_id from item_id
CREATE OR REPLACE FUNCTION public.get_restaurant_id_from_item(_item_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.restaurant_id FROM public.menu_items mi
  JOIN public.menu_categories mc ON mc.id = mi.category_id
  JOIN public.menus m ON m.id = mc.menu_id
  WHERE mi.id = _item_id
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- RESTAURANTS
CREATE POLICY "Members can view their restaurants"
  ON public.restaurants FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), id));

CREATE POLICY "Owner can update restaurant"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), id, 'owner'));

CREATE POLICY "Authenticated users can create restaurants"
  ON public.restaurants FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owner can delete restaurant"
  ON public.restaurants FOR DELETE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), id, 'owner'));

-- RESTAURANT MEMBERS
CREATE POLICY "Members can view members"
  ON public.restaurant_members FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Owner can manage members"
  ON public.restaurant_members FOR INSERT TO authenticated
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, 'owner') OR user_id = auth.uid());

CREATE POLICY "Owner can update members"
  ON public.restaurant_members FOR UPDATE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, 'owner'));

CREATE POLICY "Owner can delete members"
  ON public.restaurant_members FOR DELETE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, 'owner'));

-- MENUS
CREATE POLICY "Members can view menus"
  ON public.menus FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Editors can manage menus"
  ON public.menus FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Editors can update menus"
  ON public.menus FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Owner can delete menus"
  ON public.menus FOR DELETE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, 'owner'));

-- MENU CATEGORIES
CREATE POLICY "Members can view categories"
  ON public.menu_categories FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_menu(menu_id)));

CREATE POLICY "Members can insert categories"
  ON public.menu_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_menu(menu_id)));

CREATE POLICY "Members can update categories"
  ON public.menu_categories FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_menu(menu_id)));

CREATE POLICY "Members can delete categories"
  ON public.menu_categories FOR DELETE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_menu(menu_id)));

-- MENU CATEGORY TRANSLATIONS
CREATE POLICY "Members can view category translations"
  ON public.menu_category_translations FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

CREATE POLICY "Members can insert category translations"
  ON public.menu_category_translations FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

CREATE POLICY "Members can update category translations"
  ON public.menu_category_translations FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

CREATE POLICY "Members can delete category translations"
  ON public.menu_category_translations FOR DELETE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

-- MENU ITEMS
CREATE POLICY "Members can view items"
  ON public.menu_items FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

CREATE POLICY "Members can insert items"
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

CREATE POLICY "Members can update items"
  ON public.menu_items FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

CREATE POLICY "Members can delete items"
  ON public.menu_items FOR DELETE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_category(category_id)));

-- MENU ITEM TRANSLATIONS
CREATE POLICY "Members can view item translations"
  ON public.menu_item_translations FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can insert item translations"
  ON public.menu_item_translations FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can update item translations"
  ON public.menu_item_translations FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can delete item translations"
  ON public.menu_item_translations FOR DELETE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

-- MENU ITEM MEDIA
CREATE POLICY "Members can view media"
  ON public.menu_item_media FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can insert media"
  ON public.menu_item_media FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can update media"
  ON public.menu_item_media FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can delete media"
  ON public.menu_item_media FOR DELETE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

-- MENU ITEM MODELS
CREATE POLICY "Members can view models"
  ON public.menu_item_models FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can insert models"
  ON public.menu_item_models FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

CREATE POLICY "Members can update models"
  ON public.menu_item_models FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), public.get_restaurant_id_from_item(item_id)));

-- MENU IMPORT JOBS
CREATE POLICY "Members can view import jobs"
  ON public.menu_import_jobs FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members can create import jobs"
  ON public.menu_import_jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members can update import jobs"
  ON public.menu_import_jobs FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

-- MODEL JOBS
CREATE POLICY "Members can view model jobs"
  ON public.model_jobs FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members can create model jobs"
  ON public.model_jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members can update model jobs"
  ON public.model_jobs FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

-- ANALYTICS EVENTS (public insert, members can read)
CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Members can view analytics"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_item_models_updated_at BEFORE UPDATE ON public.menu_item_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_import_jobs_updated_at BEFORE UPDATE ON public.menu_import_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_model_jobs_updated_at BEFORE UPDATE ON public.model_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS (private)
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-imports', 'menu-imports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-media', 'menu-media', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('models', 'models', false);

-- Storage policies for menu-media
CREATE POLICY "Members can upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-media');

CREATE POLICY "Members can view media files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'menu-media');

CREATE POLICY "Members can delete media files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu-media');

-- Storage policies for menu-imports
CREATE POLICY "Members can upload imports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-imports');

CREATE POLICY "Members can view imports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'menu-imports');

-- Storage policies for models
CREATE POLICY "Anyone can view models" ON storage.objects FOR SELECT
  USING (bucket_id = 'models');

CREATE POLICY "Service can upload models" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'models');

-- ============================================
-- AUTO-CREATE RESTAURANT MEMBER ON RESTAURANT INSERT
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_add_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_add_owner_on_restaurant_create
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_owner_member();

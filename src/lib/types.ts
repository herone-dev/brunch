import type { Database } from '@/integrations/supabase/types';

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type Menu = Database['public']['Tables']['menus']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type MenuCategoryTranslation = Database['public']['Tables']['menu_category_translations']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuItemTranslation = Database['public']['Tables']['menu_item_translations']['Row'];
export type MenuItemMedia = Database['public']['Tables']['menu_item_media']['Row'];
export type MenuItemModel = Database['public']['Tables']['menu_item_models']['Row'];
export type MenuImportJob = Database['public']['Tables']['menu_import_jobs']['Row'];
export type ModelJob = Database['public']['Tables']['model_jobs']['Row'];
export type RestaurantMember = Database['public']['Tables']['restaurant_members']['Row'];

export type MenuStatus = Database['public']['Enums']['menu_status'];
export type JobStatus = Database['public']['Enums']['job_status'];
export type ModelStatus = Database['public']['Enums']['model_status'];
export type MediaType = Database['public']['Enums']['media_type'];
export type AppRole = Database['public']['Enums']['app_role'];

// Enriched types for client display
export interface CategoryWithItems extends MenuCategory {
  translations: MenuCategoryTranslation[];
  items: ItemWithDetails[];
}

export interface ItemWithDetails extends MenuItem {
  translations: MenuItemTranslation[];
  media: MenuItemMedia[];
  model?: MenuItemModel | null;
}

export interface MenuWithCategories extends Menu {
  categories: CategoryWithItems[];
}

export interface RestaurantWithMenu extends Restaurant {
  menu?: MenuWithCategories | null;
}

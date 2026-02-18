import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Restaurant, Menu, ModelJob } from '@/lib/types';
import type { ItemWithDetails, CategoryWithItems } from '@/lib/types';

export function useMyRestaurant() {
  return useQuery({
    queryKey: ['my-restaurant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: members } = await supabase
        .from('restaurant_members')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!members?.length) return null;

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', members[0].restaurant_id)
        .single();

      if (error) throw error;
      return data as Restaurant;
    },
  });
}

export function useRestaurantMenus(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant-menus', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Menu[];
    },
  });
}

export function useRestaurantItems(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant-items', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      // Get all menus for this restaurant
      const { data: menus } = await supabase
        .from('menus')
        .select('id')
        .eq('restaurant_id', restaurantId!);

      if (!menus?.length) return [];

      const menuIds = menus.map(m => m.id);
      const { data: categories } = await supabase
        .from('menu_categories')
        .select('*')
        .in('menu_id', menuIds);

      if (!categories?.length) return [];

      const catIds = categories.map(c => c.id);
      const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .in('category_id', catIds)
        .order('sort_order');

      if (!items?.length) return [];

      const itemIds = items.map(i => i.id);
      const [transRes, mediaRes, modelsRes] = await Promise.all([
        supabase.from('menu_item_translations').select('*').in('item_id', itemIds),
        supabase.from('menu_item_media').select('*').in('item_id', itemIds),
        supabase.from('menu_item_models').select('*').in('item_id', itemIds),
      ]);

      return items.map((item): ItemWithDetails => ({
        ...item,
        translations: (transRes.data ?? []).filter(t => t.item_id === item.id),
        media: (mediaRes.data ?? []).filter(m => m.item_id === item.id),
        model: (modelsRes.data ?? []).find(m => m.item_id === item.id) ?? null,
      }));
    },
  });
}

export function useModelJobs(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['model-jobs', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_jobs')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ModelJob[];
    },
  });
}

export function useQrScanCount(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['qr-scan-count', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId!)
        .eq('type', 'qr_scan');

      if (error) throw error;
      return count ?? 0;
    },
  });
}

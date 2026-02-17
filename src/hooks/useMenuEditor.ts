import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MenuWithCategories, CategoryWithItems, ItemWithDetails } from '@/lib/types';

export function useMenuByRestaurant(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['menu', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<MenuWithCategories | null> => {
      const { data: menu, error } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!menu) return null;

      const { data: categories } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('menu_id', menu.id)
        .order('sort_order');

      const catIds = categories?.map(c => c.id) ?? [];

      const [catTransRes, itemsRes] = await Promise.all([
        catIds.length
          ? supabase.from('menu_category_translations').select('*').in('category_id', catIds)
          : { data: [] as any[] },
        catIds.length
          ? supabase.from('menu_items').select('*').in('category_id', catIds).order('sort_order')
          : { data: [] as any[] },
      ]);

      const itemIds = (itemsRes.data ?? []).map((i: any) => i.id);

      const [itemTransRes, mediaRes, modelsRes] = await Promise.all([
        itemIds.length
          ? supabase.from('menu_item_translations').select('*').in('item_id', itemIds)
          : { data: [] as any[] },
        itemIds.length
          ? supabase.from('menu_item_media').select('*').in('item_id', itemIds).order('sort_order')
          : { data: [] as any[] },
        itemIds.length
          ? supabase.from('menu_item_models').select('*').in('item_id', itemIds)
          : { data: [] as any[] },
      ]);

      const catTrans = catTransRes.data ?? [];
      const items = itemsRes.data ?? [];
      const itemTrans = itemTransRes.data ?? [];
      const media = mediaRes.data ?? [];
      const models = modelsRes.data ?? [];

      const enrichedCategories: CategoryWithItems[] = (categories ?? []).map(cat => ({
        ...cat,
        translations: catTrans.filter((t: any) => t.category_id === cat.id),
        items: items
          .filter((i: any) => i.category_id === cat.id)
          .map((item: any): ItemWithDetails => ({
            ...item,
            translations: itemTrans.filter((t: any) => t.item_id === item.id),
            media: media.filter((m: any) => m.item_id === item.id),
            model: models.find((m: any) => m.item_id === item.id) ?? null,
          })),
      }));

      return { ...menu, categories: enrichedCategories };
    },
  });
}

export function useAddCategory(menuId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { names: Record<string, string>; sortOrder: number }) => {
      const { data: cat, error } = await supabase
        .from('menu_categories')
        .insert({ menu_id: menuId, sort_order: input.sortOrder })
        .select()
        .single();
      if (error) throw error;

      const translations = Object.entries(input.names).map(([lang, name]) => ({
        category_id: cat.id,
        lang,
        name,
      }));
      await supabase.from('menu_category_translations').insert(translations);
      return cat;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useAddItem(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      names: Record<string, string>;
      descriptions: Record<string, string>;
      priceCents: number;
      tags: string[];
      allergens: string[];
      sortOrder: number;
    }) => {
      const { data: item, error } = await supabase
        .from('menu_items')
        .insert({
          category_id: categoryId,
          sort_order: input.sortOrder,
          price_cents: input.priceCents,
          tags: input.tags,
          allergens: input.allergens,
        })
        .select()
        .single();
      if (error) throw error;

      const translations = Object.entries(input.names).map(([lang, name]) => ({
        item_id: item.id,
        lang,
        name,
        description: input.descriptions[lang] || '',
      }));
      await supabase.from('menu_item_translations').insert(translations);
      return item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      priceCents?: number;
      tags?: string[];
      allergens?: string[];
      isAvailable?: boolean;
      translations?: { lang: string; name: string; description: string }[];
    }) => {
      const updates: Record<string, any> = {};
      if (input.priceCents !== undefined) updates.price_cents = input.priceCents;
      if (input.tags !== undefined) updates.tags = input.tags;
      if (input.allergens !== undefined) updates.allergens = input.allergens;
      if (input.isAvailable !== undefined) updates.is_available = input.isAvailable;

      if (Object.keys(updates).length > 0) {
        await supabase.from('menu_items').update(updates).eq('id', input.itemId);
      }

      if (input.translations) {
        for (const tr of input.translations) {
          await supabase
            .from('menu_item_translations')
            .upsert({ item_id: input.itemId, lang: tr.lang, name: tr.name, description: tr.description });
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      categoryId: string;
      isVisible?: boolean;
      translations?: { lang: string; name: string }[];
    }) => {
      if (input.isVisible !== undefined) {
        await supabase.from('menu_categories').update({ is_visible: input.isVisible }).eq('id', input.categoryId);
      }
      if (input.translations) {
        for (const tr of input.translations) {
          await supabase
            .from('menu_category_translations')
            .upsert({ category_id: input.categoryId, lang: tr.lang, name: tr.name });
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      await supabase.from('menu_categories').delete().eq('id', categoryId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await supabase.from('menu_items').delete().eq('id', itemId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function usePublishMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (menuId: string) => {
      await supabase
        .from('menus')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', menuId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useUnpublishMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (menuId: string) => {
      await supabase
        .from('menus')
        .update({ status: 'draft', published_at: null })
        .eq('id', menuId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ImportedMenuData } from '@/lib/menu-import-types';

/**
 * Hook to import analyzed menu data into a real menu.
 * Creates categories and items from the AI-extracted data.
 */
export function useImportMenuFromPhoto(menuId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (menuData: ImportedMenuData) => {
      const lang = menuData.language_detected || 'fr';

      for (const cat of menuData.categories) {
        // Create category
        const { data: dbCat, error: catErr } = await supabase
          .from('menu_categories')
          .insert({ menu_id: menuId, sort_order: cat.position })
          .select()
          .single();
        if (catErr) throw catErr;

        // Category translation
        await supabase.from('menu_category_translations').insert({
          category_id: dbCat.id,
          lang,
          name: cat.name,
        });

        // Create items
        for (const item of cat.items) {
          const priceCents = item.price != null ? Math.round(item.price * 100) : 0;

          const { data: dbItem, error: itemErr } = await supabase
            .from('menu_items')
            .insert({
              category_id: dbCat.id,
              sort_order: item.position,
              price_cents: priceCents,
              is_available: item.available,
              tags: item.tags || [],
              allergens: item.allergens || [],
            })
            .select()
            .single();
          if (itemErr) throw itemErr;

          await supabase.from('menu_item_translations').insert({
            item_id: dbItem.id,
            lang,
            name: item.name,
            description: item.description || '',
          });
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

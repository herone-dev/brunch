import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RestaurantWithMenu, CategoryWithItems, ItemWithDetails } from '@/lib/types';

export function usePublicMenu(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-menu', slug],
    enabled: !!slug,
    queryFn: async (): Promise<RestaurantWithMenu | null> => {
      // Get restaurant by slug (public read via edge function or direct if we allow anon)
      // For V1, we query directly. RLS won't allow anon to read restaurants table.
      // So we use the public_get_menu edge function approach.
      // For now, let's use a simple approach: query via service-role in edge function
      // But since we need this to work client-side, let's add a public read policy
      // Actually, let's call the edge function
      const { data, error } = await supabase.functions.invoke('public_get_menu', {
        body: { slug },
      });

      if (error) throw error;
      return data as RestaurantWithMenu;
    },
    staleTime: 5 * 60 * 1000,
  });
}

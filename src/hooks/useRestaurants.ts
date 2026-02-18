import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Restaurant } from '@/lib/types';

export function useMyRestaurants() {
  return useQuery({
    queryKey: ['my-restaurants'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: members } = await supabase
        .from('restaurant_members')
        .select('restaurant_id')
        .eq('user_id', user.id);

      if (!members?.length) return [] as Restaurant[];

      const ids = members.map(m => m.restaurant_id);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .in('id', ids);

      if (error) throw error;
      return data as Restaurant[];
    },
  });
}

export function useCreateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; city: string; slug: string; supported_langs: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          name: input.name,
          city: input.city,
          slug: input.slug,
          supported_langs: input.supported_langs,
          default_lang: input.supported_langs[0] || 'fr',
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create a default menu
      await supabase.from('menus').insert({
        restaurant_id: data.id,
        name: 'Menu Principal',
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-restaurants'] });
      qc.invalidateQueries({ queryKey: ['my-restaurant'] });
    },
  });
}

export function useCreateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { restaurantId: string; name: string }) => {
      const { data, error } = await supabase
        .from('menus')
        .insert({
          restaurant_id: input.restaurantId,
          name: input.name,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['restaurant-menus', vars.restaurantId] });
    },
  });
}

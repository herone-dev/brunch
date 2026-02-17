import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, lang } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get restaurant
    const { data: restaurant, error: rError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (rError || !restaurant) {
      return new Response(JSON.stringify({ error: 'Restaurant not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get published menu
    const { data: menu } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'published')
      .limit(1)
      .maybeSingle();

    if (!menu) {
      return new Response(JSON.stringify({ ...restaurant, menu: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get categories
    const { data: categories } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('menu_id', menu.id)
      .eq('is_visible', true)
      .order('sort_order');

    const catIds = (categories ?? []).map((c: any) => c.id);

    // Get translations and items
    const [catTransRes, itemsRes] = await Promise.all([
      catIds.length
        ? supabase.from('menu_category_translations').select('*').in('category_id', catIds)
        : { data: [] },
      catIds.length
        ? supabase.from('menu_items').select('*').in('category_id', catIds).eq('is_available', true).order('sort_order')
        : { data: [] },
    ]);

    const itemIds = (itemsRes.data ?? []).map((i: any) => i.id);

    const [itemTransRes, mediaRes, modelsRes] = await Promise.all([
      itemIds.length
        ? supabase.from('menu_item_translations').select('*').in('item_id', itemIds)
        : { data: [] },
      itemIds.length
        ? supabase.from('menu_item_media').select('*').in('item_id', itemIds).order('sort_order')
        : { data: [] },
      itemIds.length
        ? supabase.from('menu_item_models').select('*').in('item_id', itemIds).eq('status', 'ready')
        : { data: [] },
    ]);

    // Generate signed URLs for media
    const mediaWithUrls = await Promise.all(
      (mediaRes.data ?? []).map(async (m: any) => {
        const { data: signed } = await supabase.storage
          .from('menu-media')
          .createSignedUrl(m.storage_path, 3600);
        return { ...m, signed_url: signed?.signedUrl ?? null };
      })
    );

    // Build response
    const enrichedCategories = (categories ?? []).map((cat: any) => ({
      ...cat,
      translations: (catTransRes.data ?? []).filter((t: any) => t.category_id === cat.id),
      items: (itemsRes.data ?? [])
        .filter((i: any) => i.category_id === cat.id)
        .map((item: any) => ({
          ...item,
          translations: (itemTransRes.data ?? []).filter((t: any) => t.item_id === item.id),
          media: mediaWithUrls.filter((m: any) => m.item_id === item.id),
          model: (modelsRes.data ?? []).find((m: any) => m.item_id === item.id) ?? null,
        })),
    }));

    // Track analytics
    await supabase.from('analytics_events').insert({
      restaurant_id: restaurant.id,
      menu_id: menu.id,
      type: 'menu_view',
      meta: { lang: lang || restaurant.default_lang },
    });

    const result = {
      ...restaurant,
      menu: {
        ...menu,
        categories: enrichedCategories,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

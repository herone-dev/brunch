import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

function resolveActiveMenu(menus: any[], timezone?: string): any | null {
  if (!menus.length) return null;
  if (menus.length === 1) return menus[0];

  // Check for a global menu first
  const globalMenu = menus.find((m: any) => m.is_global);

  const now = new Date();
  // Use simple UTC offset approach; timezone param can be added later
  const currentDay = DAY_MAP[now.getUTCDay()];
  const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:00`;

  // Find scheduled menu matching current day + time
  const scheduled = menus.find((m: any) => {
    if (m.is_global) return false;
    if (!m.schedule_start || !m.schedule_end) return false;
    const days: string[] = m.schedule_days ?? ['mon','tue','wed','thu','fri','sat','sun'];
    if (!days.includes(currentDay)) return false;
    return currentTime >= m.schedule_start && currentTime <= m.schedule_end;
  });

  if (scheduled) return scheduled;

  // Fallback to default menu
  const defaultMenu = menus.find((m: any) => m.is_default && !m.is_global);
  if (defaultMenu) return defaultMenu;

  // If global exists, use it as final fallback
  if (globalMenu) return globalMenu;

  // Last resort: first published menu
  return menus[0];
}

async function buildMenuResponse(supabase: any, menu: any, restaurant: any, lang?: string, isGlobal = false, allMenus?: any[]) {
  let menuIds = [menu.id];
  
  // For global menu, gather ALL published menu ids
  if (isGlobal && allMenus) {
    menuIds = allMenus.filter((m: any) => !m.is_global).map((m: any) => m.id);
    if (menuIds.length === 0) menuIds = [menu.id];
  }

  // Get categories from all relevant menus
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .in('menu_id', menuIds)
    .eq('is_visible', true)
    .order('sort_order');

  const catIds = (categories ?? []).map((c: any) => c.id);

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

  const mediaWithUrls = await Promise.all(
    (mediaRes.data ?? []).map(async (m: any) => {
      const { data: signed } = await supabase.storage
        .from('menu-media')
        .createSignedUrl(m.storage_path, 3600);
      return { ...m, signed_url: signed?.signedUrl ?? null };
    })
  );

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

  return {
    ...menu,
    categories: enrichedCategories,
  };
}

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

    // Get ALL published menus for this restaurant
    const { data: allMenus } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'published')
      .order('created_at');

    if (!allMenus?.length) {
      return new Response(JSON.stringify({ ...restaurant, menu: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve active menu based on schedule
    const activeMenu = resolveActiveMenu(allMenus);
    const isGlobal = activeMenu?.is_global ?? false;

    const menuData = await buildMenuResponse(supabase, activeMenu, restaurant, lang, isGlobal, allMenus);

    // Track analytics
    await supabase.from('analytics_events').insert({
      restaurant_id: restaurant.id,
      menu_id: activeMenu.id,
      type: 'menu_view',
      meta: { lang: lang || restaurant.default_lang },
    });

    const result = {
      ...restaurant,
      menu: menuData,
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

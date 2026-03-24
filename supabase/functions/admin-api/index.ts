import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No auth");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is platform admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: adminRow } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!adminRow) throw new Error("Not a platform admin");

    const { pathname } = new URL(req.url);
    const action = pathname.split("/").pop();
    const body = req.method === "POST" ? await req.json() : {};

    switch (action) {
      case "overview": {
        // Get all restaurants with their subscriptions
        const { data: restaurants } = await supabaseAdmin
          .from("restaurants")
          .select("id, name, slug, city, created_at, owner_user_id")
          .order("created_at", { ascending: false });

        const { data: subscriptions } = await supabaseAdmin
          .from("subscriptions")
          .select("*");

        const { data: members } = await supabaseAdmin
          .from("restaurant_members")
          .select("restaurant_id, user_id, role");

        // Count items, models, scans per restaurant
        const { data: itemCounts } = await supabaseAdmin
          .from("menu_items")
          .select("id, category_id");

        const { data: categories } = await supabaseAdmin
          .from("menu_categories")
          .select("id, menu_id");

        const { data: menus } = await supabaseAdmin
          .from("menus")
          .select("id, restaurant_id");

        const { data: models } = await supabaseAdmin
          .from("menu_item_models")
          .select("item_id, status");

        const { data: scanEvents } = await supabaseAdmin
          .from("analytics_events")
          .select("restaurant_id, created_at")
          .eq("type", "qr_scan");

        // Get user emails from auth
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const userMap = new Map(authUsers?.map(u => [u.id, u.email]) || []);

        // Build menu->restaurant map
        const menuRestMap = new Map(menus?.map(m => [m.id, m.restaurant_id]) || []);
        // Build category->menu map
        const catMenuMap = new Map(categories?.map(c => [c.id, c.menu_id]) || []);

        // Count items per restaurant
        const itemsByRestaurant = new Map<string, number>();
        itemCounts?.forEach(item => {
          const menuId = catMenuMap.get(item.category_id);
          const restId = menuId ? menuRestMap.get(menuId) : null;
          if (restId) itemsByRestaurant.set(restId, (itemsByRestaurant.get(restId) || 0) + 1);
        });

        // Count models by status per restaurant
        const modelsByRestaurant = new Map<string, { ready: number; total: number }>();
        models?.forEach(m => {
          // Find restaurant from item
          const item = itemCounts?.find(i => i.id === m.item_id);
          if (!item) return;
          const menuId = catMenuMap.get(item.category_id);
          const restId = menuId ? menuRestMap.get(menuId) : null;
          if (!restId) return;
          const cur = modelsByRestaurant.get(restId) || { ready: 0, total: 0 };
          cur.total++;
          if (m.status === "ready") cur.ready++;
          modelsByRestaurant.set(restId, cur);
        });

        // Scans per restaurant
        const scansByRestaurant = new Map<string, number>();
        scanEvents?.forEach(e => {
          if (e.restaurant_id) scansByRestaurant.set(e.restaurant_id, (scansByRestaurant.get(e.restaurant_id) || 0) + 1);
        });

        const subMap = new Map(subscriptions?.map(s => [s.restaurant_id, s]) || []);

        const enriched = restaurants?.map(r => ({
          ...r,
          owner_email: userMap.get(r.owner_user_id) || "?",
          subscription: subMap.get(r.id) || null,
          item_count: itemsByRestaurant.get(r.id) || 0,
          models_ready: modelsByRestaurant.get(r.id)?.ready || 0,
          models_total: modelsByRestaurant.get(r.id)?.total || 0,
          scan_count: scansByRestaurant.get(r.id) || 0,
        }));

        // Global stats
        const totalRestaurants = restaurants?.length || 0;
        const totalItems = itemCounts?.length || 0;
        const totalModelsReady = models?.filter(m => m.status === "ready").length || 0;
        const totalScans = scanEvents?.length || 0;
        const totalUsers = authUsers?.length || 0;
        const planCounts = { free: 0, starter: 0, premium: 0 };
        subscriptions?.forEach(s => {
          if (s.plan in planCounts) planCounts[s.plan as keyof typeof planCounts]++;
        });

        return new Response(JSON.stringify({
          restaurants: enriched,
          stats: { totalRestaurants, totalItems, totalModelsReady, totalScans, totalUsers, planCounts },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update-plan": {
        const { restaurantId, plan, generationsLimit } = body;
        const limits: Record<string, number> = { free: 3, starter: 999999, premium: 999999 };
        const limit = generationsLimit ?? limits[plan] ?? 3;

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({ plan, generations_limit: limit, updated_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId);

        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete-restaurant": {
        const { restaurantId } = body;
        const { error } = await supabaseAdmin
          .from("restaurants")
          .delete()
          .eq("id", restaurantId);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    const status = err.message === "Not a platform admin" ? 403 : 500;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

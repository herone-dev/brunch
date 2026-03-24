import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Stripe sends webhook events here after checkout, subscription updates, etc.
// Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in secrets.

const PLAN_MAP: Record<string, { plan: string; limit: number }> = {
  // Map your Stripe Price IDs to plan names
  price_STARTER_MONTHLY_TODO: { plan: "starter", limit: 999999 },
  price_STARTER_6M_TODO: { plan: "starter", limit: 999999 },
  price_STARTER_12M_TODO: { plan: "starter", limit: 999999 },
  price_PREMIUM_MONTHLY_TODO: { plan: "premium", limit: 999999 },
  price_PREMIUM_6M_TODO: { plan: "premium", limit: 999999 },
  price_PREMIUM_12M_TODO: { plan: "premium", limit: 999999 },
};

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      return new Response("Stripe not configured", { status: 503 });
    }

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // For now, skip signature verification (add crypto verification when ready)
    // In production, verify the webhook signature!
    const event = JSON.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const restaurantId = session.metadata?.restaurant_id;
        if (!restaurantId) break;

        // Get subscription details from Stripe
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${session.subscription}`,
          { headers: { Authorization: `Bearer ${stripeKey}` } }
        );
        const sub = await subRes.json();
        const priceId = sub.items?.data?.[0]?.price?.id;
        const planInfo = PLAN_MAP[priceId] || { plan: "starter", limit: 999999 };

        await supabase
          .from("subscriptions")
          .update({
            plan: planInfo.plan,
            generations_limit: planInfo.limit,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            stripe_price_id: priceId,
            status: "active",
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("restaurant_id", restaurantId);

        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const planInfo = PLAN_MAP[priceId] || { plan: "starter", limit: 999999 };

        await supabase
          .from("subscriptions")
          .update({
            plan: planInfo.plan,
            generations_limit: planInfo.limit,
            status: sub.status === "active" ? "active" : "inactive",
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        // Downgrade back to free
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            generations_limit: 3,
            status: "cancelled",
            stripe_subscription_id: null,
            stripe_price_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

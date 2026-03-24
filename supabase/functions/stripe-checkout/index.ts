import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// This edge function creates a Stripe Checkout session.
// It requires STRIPE_SECRET_KEY to be set in secrets.
// Products/prices must be created in Stripe dashboard first.

const PRICE_MAP: Record<string, string> = {
  // Fill these with your actual Stripe Price IDs when ready
  starter_monthly: "price_STARTER_MONTHLY_TODO",
  starter_6months: "price_STARTER_6M_TODO",
  starter_12months: "price_STARTER_12M_TODO",
  premium_monthly: "price_PREMIUM_MONTHLY_TODO",
  premium_6months: "price_PREMIUM_6M_TODO",
  premium_12months: "price_PREMIUM_12M_TODO",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured yet" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { priceKey, restaurantId, successUrl, cancelUrl } = await req.json();

    const priceId = PRICE_MAP[priceKey];
    if (!priceId || priceId.includes("TODO")) {
      return new Response(
        JSON.stringify({ error: "Price not configured yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Checkout Session via Stripe API
    const body = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: successUrl || `${req.headers.get("origin")}/app?checkout=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/app?checkout=cancel`,
      "metadata[restaurant_id]": restaurantId,
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      throw new Error(session.error?.message || "Stripe error");
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

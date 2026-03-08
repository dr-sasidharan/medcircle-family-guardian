import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_MAP: Record<string, { price_id: string; mode: "payment" | "subscription"; plan_value: string }> = {
  one_time: { price_id: "price_1T8dfg2OpOsnuUgRmyBoVKgt", mode: "payment", plan_value: "family" },
  family: { price_id: "price_1T8dgE2OpOsnuUgR1FJPeRkR", mode: "subscription", plan_value: "family" },
  pro: { price_id: "price_1T8dgk2OpOsnuUgR6GlD1cpY", mode: "subscription", plan_value: "pro" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan_key, patient_profile_id } = await req.json();
    const config = PRICE_MAP[plan_key];
    if (!config) throw new Error("Invalid plan");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: config.price_id, quantity: 1 }],
      mode: config.mode,
      success_url: `${origin}/paywall?success=true&plan=${config.plan_value}&patient_profile_id=${patient_profile_id}`,
      cancel_url: `${origin}/paywall?canceled=true`,
      metadata: { patient_profile_id, plan_value: config.plan_value },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, plan, patient_profile_id } = await req.json();

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      console.error("Missing Razorpay credentials. KEY_ID exists:", !!keyId, "KEY_SECRET exists:", !!keySecret);
      return new Response(JSON.stringify({ error: "Payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Creating Razorpay order:", { amount, plan, keyIdPrefix: keyId.substring(0, 8) });

    const auth = btoa(`${keyId}:${keySecret}`);

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: `medcircle_${plan}_${Date.now()}`,
        notes: { plan, patient_profile_id },
      }),
    });

    const order = await orderRes.json();
    console.log("Razorpay response status:", orderRes.status, "body:", JSON.stringify(order));

    if (!orderRes.ok) {
      throw new Error(order.error?.description || "Authentication failed — check your Razorpay API keys");
    }

    return new Response(JSON.stringify({ order_id: order.id, key_id: keyId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

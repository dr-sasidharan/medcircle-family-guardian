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
    const { amount, plan, patient_profile_id, customer_name, customer_email, customer_phone } = await req.json();

    const appId = Deno.env.get("CASHFREE_APP_ID");
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");

    if (!appId || !secretKey) {
      console.error("Missing Cashfree credentials");
      return new Response(JSON.stringify({ error: "Payment gateway not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = `medcircle_${plan}_${Date.now()}`;

    const orderRes = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: patient_profile_id || `cust_${Date.now()}`,
          customer_name: customer_name || "MedCircle User",
          customer_email: customer_email || "user@medcircle.app",
          customer_phone: customer_phone || "9999999999",
        },
        order_meta: {
          return_url: `${req.headers.get("origin") || "https://medcircle-family-guardian.lovable.app"}/paywall?order_id=${orderId}&plan=${plan}&patient_profile_id=${patient_profile_id}`,
        },
        order_note: `MedCircle ${plan} plan`,
      }),
    });

    const order = await orderRes.json();
    console.log("Cashfree response:", orderRes.status, JSON.stringify(order));

    if (!orderRes.ok) {
      throw new Error(order.message || "Failed to create Cashfree order");
    }

    return new Response(JSON.stringify({
      order_id: order.order_id,
      payment_session_id: order.payment_session_id,
      order_status: order.order_status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

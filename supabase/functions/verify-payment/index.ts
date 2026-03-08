import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, plan, amount, patient_profile_id } = await req.json();

    const appId = Deno.env.get("CASHFREE_APP_ID")!;
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY")!;

    // Verify order with Cashfree
    const orderRes = await fetch(`https://api.cashfree.com/pg/orders/${order_id}`, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
    });
    const order = await orderRes.json();

    if (!orderRes.ok || order.order_status !== "PAID") {
      throw new Error(`Payment not verified. Status: ${order.order_status || "unknown"}`);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Save payment record
    await supabase.from("payments").insert({
      patient_profile_id,
      amount,
      plan,
      razorpay_payment_id: order_id,
      razorpay_order_id: order.cf_order_id?.toString() || order_id,
      status: "success",
    });

    // Update patient plan
    await supabase
      .from("patient_profiles")
      .update({ plan })
      .eq("id", patient_profile_id);

    return new Response(JSON.stringify({ success: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

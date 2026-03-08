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
    const { razorpay_payment_id, razorpay_order_id, plan, amount, patient_profile_id } = await req.json();

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const auth = btoa(`${keyId}:${keySecret}`);

    // Verify payment with Razorpay
    const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const payment = await paymentRes.json();

    if (!paymentRes.ok || payment.status !== "captured") {
      throw new Error("Payment not verified");
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
      razorpay_payment_id,
      razorpay_order_id,
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

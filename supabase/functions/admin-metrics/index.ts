import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_PASSWORD = "medcircle2026";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password, action, paymentId, paymentPlan, patientProfileId } = await req.json();
    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle payment approve/reject action
    if (action === "approve" || action === "reject") {
      const newStatus = action === "approve" ? "success" : "failed";
      await supabaseAdmin.from("payments").update({ status: newStatus }).eq("id", paymentId);
      
      if (action === "approve") {
        await supabaseAdmin.from("patient_profiles").update({ plan: paymentPlan }).eq("id", patientProfileId);
      } else {
        await supabaseAdmin.from("patient_profiles").update({ plan: "free" }).eq("id", patientProfileId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: fetch all data
    const [profilesRes, paymentsRes] = await Promise.all([
      supabaseAdmin
        .from("patient_profiles")
        .select("id, name, plan, created_at, last_active_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    return new Response(
      JSON.stringify({
        profiles: profilesRes.data || [],
        payments: paymentsRes.data || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

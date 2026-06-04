import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, paymentId, paymentPlan, patientProfileId } = body || {};

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

    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const authUsers = authData?.users || [];

    const totalRegisteredUsers = authUsers.length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsers30d = authUsers.filter(
      (u) => u.last_sign_in_at && u.last_sign_in_at > thirtyDaysAgo
    ).length;

    return new Response(
      JSON.stringify({
        profiles: profilesRes.data || [],
        payments: paymentsRes.data || [],
        totalRegisteredUsers,
        activeUsers30d,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

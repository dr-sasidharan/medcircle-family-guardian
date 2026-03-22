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

    // Default: fetch all data including auth.users for accurate counts
    const [profilesRes, paymentsRes, authUsersRes] = await Promise.all([
      supabaseAdmin
        .from("patient_profiles")
        .select("id, name, plan, created_at, last_active_at, user_id")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    // Build auth users data with last_sign_in_at
    const authUsers = authUsersRes.data?.users || [];
    const profiles = profilesRes.data || [];

    // Merge: use auth.users as source of truth for total count and last sign in
    const authMap = new Map(authUsers.map(u => [u.id, u]));
    
    // Enrich profiles with auth last_sign_in_at
    const enrichedProfiles = profiles.map(p => {
      const authUser = p.user_id ? authMap.get(p.user_id) : null;
      return {
        ...p,
        // Use the most recent of last_active_at or last_sign_in_at
        last_active_at: getLatest(p.last_active_at, authUser?.last_sign_in_at),
      };
    });

    // Count auth users without profiles (registered but no profile yet)
    const profileUserIds = new Set(profiles.map(p => p.user_id).filter(Boolean));
    const orphanAuthUsers = authUsers.filter(u => !profileUserIds.has(u.id));

    return new Response(
      JSON.stringify({
        profiles: enrichedProfiles,
        payments: paymentsRes.data || [],
        totalAuthUsers: authUsers.length,
        activeAuthUsers30d: authUsers.filter(u => {
          if (!u.last_sign_in_at) return false;
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return new Date(u.last_sign_in_at) > thirtyDaysAgo;
        }).length,
        orphanCount: orphanAuthUsers.length,
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

function getLatest(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a && !b) return null;
  if (!a) return b as string;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

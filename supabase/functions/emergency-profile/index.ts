import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch patient profile by emergency_token
    const { data: profile, error: profileError } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("emergency_token", token)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch caretakers
    const { data: caretakers } = await supabase
      .from("caretakers")
      .select("name, relationship, phone")
      .eq("patient_profile_id", profile.id)
      .eq("is_active", true);

    // Fetch active medicines
    const { data: medicines } = await supabase
      .from("medicines")
      .select("name, dosage, timing, food_instruction, purpose")
      .eq("is_active", true);

    // Fetch recent hospital visits
    const { data: visits } = await supabase
      .from("hospital_visits")
      .select("hospital_name, visit_date, doctor_name, diagnosis")
      .eq("patient_profile_id", profile.id)
      .order("visit_date", { ascending: false })
      .limit(5);

    const emergencyData = {
      name: profile.name,
      age: profile.age,
      blood_group: profile.blood_group,
      allergies: profile.allergies,
      chronic_conditions: profile.chronic_conditions,
      emergency_contact: profile.emergency_contact,
      emergency_notes: profile.emergency_notes,
      caretakers: caretakers || [],
      medicines: medicines || [],
      hospital_visits: visits || [],
      last_updated: profile.updated_at,
    };

    return new Response(JSON.stringify(emergencyData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

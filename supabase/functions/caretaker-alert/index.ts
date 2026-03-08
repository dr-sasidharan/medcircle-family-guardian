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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { type, details } = await req.json();
    // type: "missed_dose" | "symptom"
    // details: { medicine_name, timing } or { symptom, urgency }

    // Get patient profile
    const { data: profile } = await supabase
      .from("patient_profiles")
      .select("id, name")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Get active caretakers
    const { data: caretakers } = await supabase
      .from("caretakers")
      .select("name, phone")
      .eq("patient_profile_id", profile.id)
      .eq("is_active", true);

    if (!caretakers?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No caretakers to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message
    let message = "";
    if (type === "missed_dose") {
      message = `⚠️ MedCircle Alert: ${profile.name} missed their ${details.timing} dose of ${details.medicine_name}. Please check on them.`;
    } else if (type === "symptom") {
      message = `🏥 MedCircle Alert: ${profile.name} reported a symptom - "${details.symptom}" (Urgency: ${details.urgency}). Please check on them.`;
    } else {
      throw new Error("Invalid alert type");
    }

    // Send SMS via Twilio
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    const results = [];
    for (const caretaker of caretakers) {
      // Clean phone number
      const phone = caretaker.phone.replace(/\s/g, "");
      try {
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            },
            body: new URLSearchParams({
              To: phone,
              From: fromPhone,
              Body: message,
            }),
          }
        );

        if (!twilioRes.ok) {
          const err = await twilioRes.json();
          console.error(`Twilio error for ${caretaker.name}:`, err);
          results.push({ name: caretaker.name, sent: false, error: err.message });
        } else {
          results.push({ name: caretaker.name, sent: true });
        }
      } catch (e) {
        console.error(`Failed to send to ${caretaker.name}:`, e);
        results.push({ name: caretaker.name, sent: false, error: e.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("caretaker-alert error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send alerts" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

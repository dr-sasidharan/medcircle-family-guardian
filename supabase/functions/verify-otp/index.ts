import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function randomSecret() {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Phone and OTP required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("otp", otp)
      .eq("verified", false)
      .single();

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP expired. Please request a new one." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark OTP as verified
    await supabase.from("phone_otps").update({ verified: true }).eq("phone", phone);

    const phoneEmail = `${phone.replace("+", "")}@phone.medcircle.local`;

    // Find existing user by synthetic email or phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.phone === phone || u.email === phoneEmail
    );

    // Generate a fresh random password for this sign-in (rotated every login)
    const ephemeralPassword = randomSecret();

    if (existingUser) {
      // Rotate password to a fresh random secret, then sign in
      const { error: updErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: ephemeralPassword,
      });
      if (updErr) throw updErr;

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: ephemeralPassword,
      });
      if (signInError) throw signInError;

      return new Response(
        JSON.stringify({ success: true, session: signInData.session, is_new_user: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Create new user with random password (never derived from UUID)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: phoneEmail,
        phone: phone,
        password: ephemeralPassword,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone_signup: true, phone: phone },
      });
      if (createError) throw createError;

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: ephemeralPassword,
      });
      if (signInError) throw signInError;

      return new Response(
        JSON.stringify({ success: true, session: signInData.session, is_new_user: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("verify-otp error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

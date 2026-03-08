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

    // Check if user exists with this phone as email (phone@medcircle.local)
    const phoneEmail = `${phone.replace("+", "")}@phone.medcircle.local`;
    const tempPassword = `mc_${phone}_${Date.now()}`;

    // Try to find existing user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.phone === phone || u.email === phoneEmail
    );

    if (existingUser) {
      // Sign in existing user by generating a magic link session
      const { data: session, error: signInError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: phoneEmail,
      });

      if (signInError) throw signInError;

      // Get session tokens
      const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
        type: "magiclink", 
        email: phoneEmail,
      });

      // Use admin to create session
      const { data: signInData, error: adminSignInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: existingUser.id, // We'll set this as password
      });

      // If password login fails, update password and retry
      if (adminSignInError) {
        await supabase.auth.admin.updateUserById(existingUser.id, { password: existingUser.id });
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: phoneEmail,
          password: existingUser.id,
        });
        if (retryError) throw retryError;
        return new Response(JSON.stringify({ 
          success: true, 
          session: retryData.session,
          is_new_user: false 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        session: signInData.session,
        is_new_user: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Create new user
      const userId = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: phoneEmail,
        phone: phone,
        password: userId,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone_signup: true, phone: phone },
      });

      if (createError) throw createError;

      // Sign in the new user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: newUser.user.id,
      });

      if (signInError) throw signInError;

      return new Response(JSON.stringify({ 
        success: true, 
        session: signInData.session,
        is_new_user: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("verify-otp error:", error);
    return new Response(JSON.stringify({ error: error.message || "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

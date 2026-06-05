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
    const { phone } = await req.json();
    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use format +91XXXXXXXXXX" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP in database with expiry (5 minutes)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 3 OTP requests per phone per hour using a sliding window per row
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: existing } = await supabase
      .from("phone_otps")
      .select("send_count, window_started_at")
      .eq("phone", phone)
      .maybeSingle();

    let sendCount = 1;
    let windowStartedAt = now.toISOString();
    if (existing) {
      if (existing.window_started_at && new Date(existing.window_started_at) > oneHourAgo) {
        if ((existing.send_count ?? 0) >= 3) {
          return new Response(
            JSON.stringify({ error: "Too many OTP requests. Please try again in an hour." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        sendCount = (existing.send_count ?? 0) + 1;
        windowStartedAt = existing.window_started_at as string;
      }
    }

    await supabase.from("phone_otps").upsert(
      {
        phone,
        otp,
        expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        verified: false,
        send_count: sendCount,
        window_started_at: windowStartedAt,
      },
      { onConflict: "phone" }
    );

    // Send via Twilio
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: fromPhone,
          Body: `Your MedCircle verification code is: ${otp}. Valid for 5 minutes.`,
        }),
      }
    );

    if (!twilioRes.ok) {
      const err = await twilioRes.json();
      console.error("Twilio error:", err);
      throw new Error(err.message || "Failed to send SMS");
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-otp error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to send OTP" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

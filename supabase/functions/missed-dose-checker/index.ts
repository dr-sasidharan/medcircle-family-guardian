import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIMING_HOURS: Record<string, number> = {
  morning: 8,
  afternoon: 14,
  night: 21,
};

// Grace period in minutes after scheduled time before marking as missed
const GRACE_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentHour = now.getUTCHours() + 5; // IST offset (UTC+5:30)
    const currentMinute = now.getUTCMinutes() + 30;
    const totalMinutes = (currentHour * 60) + currentMinute;

    // Get all active medicines
    const { data: medicines, error: medErr } = await supabase
      .from("medicines")
      .select("id, name, dosage, timing, user_id")
      .eq("is_active", true);

    if (medErr) throw medErr;
    if (!medicines?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No active medicines", checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let missedCount = 0;
    let alertsSent = 0;

    for (const med of medicines) {
      if (!med.user_id) continue;

      const targetHour = TIMING_HOURS[med.timing];
      if (targetHour === undefined) continue;

      const targetMinutes = targetHour * 60;
      
      // Only check if we're past the grace period
      if (totalMinutes < targetMinutes + GRACE_MINUTES) continue;

      // Check if dose already exists for today
      const { data: existingDose } = await supabase
        .from("doses")
        .select("id, taken, missed")
        .eq("medicine_id", med.id)
        .eq("scheduled_date", today)
        .eq("scheduled_time", med.timing)
        .maybeSingle();

      // If already taken or already missed+notified, skip
      if (existingDose?.taken) continue;
      if (existingDose?.missed) continue;

      // Mark as missed
      if (existingDose) {
        await supabase
          .from("doses")
          .update({ missed: true })
          .eq("id", existingDose.id);
      } else {
        await supabase.from("doses").insert({
          medicine_id: med.id,
          user_id: med.user_id,
          scheduled_date: today,
          scheduled_time: med.timing,
          taken: false,
          missed: true,
        });
      }
      missedCount++;

      // Get patient profile
      const { data: profile } = await supabase
        .from("patient_profiles")
        .select("id, name")
        .eq("user_id", med.user_id)
        .single();

      if (!profile) continue;

      // Get active caretakers
      const { data: caretakers } = await supabase
        .from("caretakers")
        .select("name, phone")
        .eq("patient_profile_id", profile.id)
        .eq("is_active", true);

      if (!caretakers?.length) continue;

      // Send WhatsApp + SMS to each caretaker
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (!accountSid || !authToken || !fromPhone) {
        console.error("Twilio credentials missing");
        continue;
      }

      const timingTamil: Record<string, string> = {
        morning: "காலை",
        afternoon: "மதியம்",
        night: "இரவு",
      };

      const whatsappMessage = `⚠️ MedCircle பராமரிப்பாளர் எச்சரிக்கை

${profile.name} அவர்கள் ${timingTamil[med.timing] || med.timing} மருந்தை எடுக்கவில்லை:
💊 ${med.name} - ${med.dosage}

தயவுசெய்து அவர்களை சரிபார்க்கவும்.

— MedCircle Family Guardian`;

      const smsMessage = `⚠️ MedCircle Alert: ${profile.name} missed their ${med.timing} dose of ${med.name} (${med.dosage}). Please check on them.`;

      for (const caretaker of caretakers) {
        const phone = caretaker.phone.replace(/\s/g, "");
        
        // Send WhatsApp message
        try {
          const waRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              },
              body: new URLSearchParams({
                To: `whatsapp:${phone}`,
                From: `whatsapp:${fromPhone}`,
                Body: whatsappMessage,
              }),
            }
          );

          if (waRes.ok) {
            alertsSent++;
            console.log(`WhatsApp alert sent to ${caretaker.name} for ${med.name}`);
          } else {
            const err = await waRes.json();
            console.error(`WhatsApp error for ${caretaker.name}:`, err);
            
            // Fallback to SMS if WhatsApp fails
            const smsRes = await fetch(
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
                  Body: smsMessage,
                }),
              }
            );
            if (smsRes.ok) {
              alertsSent++;
              console.log(`SMS fallback sent to ${caretaker.name}`);
            }
          }
        } catch (e) {
          console.error(`Failed to send to ${caretaker.name}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, missedCount, alertsSent, checked: medicines.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("missed-dose-checker error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

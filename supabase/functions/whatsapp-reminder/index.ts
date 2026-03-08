import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tamil medicine reminder template
const buildReminderMessage = (name: string, medicineName: string, dosage: string, timing: string) => {
  const timingTamil: Record<string, string> = {
    morning: "காலை",
    afternoon: "மதியம்",
    night: "இரவு",
  };
  return `💊 MedCircle நினைவூட்டல்

வணக்கம் ${name}!

உங்கள் ${timingTamil[timing] || timing} மருந்து நேரம்:
💊 ${medicineName} - ${dosage}

மருந்து எடுத்தீர்களா?
✅ ஆம் என பதில் அனுப்புங்கள்
❌ இல்லை என பதில் அனுப்புங்கள்

— MedCircle Family Guardian`;
};

const buildFollowupMessage = (name: string, medicineName: string) => {
  return `⏰ MedCircle தொடர்நடவடிக்கை

${name}, நீங்கள் ${medicineName} மருந்து எடுத்தீர்களா?

30 நிமிடம் ஆகிவிட்டது. தயவுசெய்து பதில் அனுப்புங்கள்:
✅ ஆம் - மருந்து எடுத்தேன்
❌ இல்லை - மருந்து எடுக்கவில்லை

— MedCircle Family Guardian`;
};

const buildCaretakerAlert = (patientName: string, medicineName: string, dosage: string, timing: string) => {
  const timingTamil: Record<string, string> = {
    morning: "காலை",
    afternoon: "மதியம்",
    night: "இரவு",
  };
  return `⚠️ MedCircle பராமரிப்பாளர் எச்சரிக்கை

${patientName} அவர்கள் ${timingTamil[timing] || timing} மருந்தை எடுக்கவில்லை:
💊 ${medicineName} - ${dosage}

நினைவூட்டலுக்கு பதில் "இல்லை" என்று கூறியுள்ளார்.
தயவுசெய்து அவர்களை சரிபார்க்கவும்.

— MedCircle Family Guardian`;
};

async function sendWhatsApp(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${from}`,
        Body: body,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    console.error("Twilio WhatsApp error:", data);
    throw new Error(data.message || "WhatsApp send failed");
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    const { action } = await req.json();

    if (action === "send_reminders") {
      // Get all active medicines with user phone numbers
      const { data: medicines } = await supabase
        .from("medicines")
        .select("id, name, dosage, timing, user_id")
        .eq("is_active", true);

      if (!medicines?.length) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const currentHour = now.getUTCHours() + 5.5; // IST offset
      const today = now.toISOString().split("T")[0];

      // Determine which timing slot we're in
      let currentTiming = "";
      if (currentHour >= 7 && currentHour < 10) currentTiming = "morning";
      else if (currentHour >= 13 && currentHour < 15) currentTiming = "afternoon";
      else if (currentHour >= 20 && currentHour < 22) currentTiming = "night";

      if (!currentTiming) {
        return new Response(JSON.stringify({ sent: 0, reason: "Not a medicine time" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const relevantMeds = medicines.filter((m) => m.timing === currentTiming);
      let sent = 0;

      for (const med of relevantMeds) {
        // Get patient profile & phone
        const { data: profile } = await supabase
          .from("patient_profiles")
          .select("name, emergency_contact")
          .eq("user_id", med.user_id)
          .single();

        if (!profile?.emergency_contact) continue;

        // Check if already sent today
        const { data: existing } = await supabase
          .from("whatsapp_reminders")
          .select("id")
          .eq("medicine_id", med.id)
          .eq("scheduled_date", today)
          .limit(1);

        if (existing?.length) continue;

        const phone = profile.emergency_contact.replace(/\s/g, "");
        const message = buildReminderMessage(profile.name, med.name, med.dosage, med.timing);

        await sendWhatsApp(accountSid, authToken, fromPhone, phone, message);

        // Record the reminder
        await supabase.from("whatsapp_reminders").insert({
          user_id: med.user_id,
          medicine_id: med.id,
          medicine_name: med.name,
          dosage: med.dosage,
          timing: med.timing,
          scheduled_date: today,
          sent_at: new Date().toISOString(),
          phone,
        } as any);

        sent++;
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_followups") {
      const today = new Date().toISOString().split("T")[0];

      // Find reminders sent 30+ mins ago with no response
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: pending } = await supabase
        .from("whatsapp_reminders")
        .select("*")
        .eq("scheduled_date", today)
        .is("response", null)
        .is("followup_sent_at", null)
        .lt("sent_at", thirtyMinsAgo);

      let sent = 0;
      for (const reminder of pending || []) {
        const { data: profile } = await supabase
          .from("patient_profiles")
          .select("name")
          .eq("user_id", reminder.user_id)
          .single();

        if (!profile) continue;

        const message = buildFollowupMessage(profile.name, reminder.medicine_name);
        await sendWhatsApp(accountSid, authToken, fromPhone, reminder.phone, message);

        await supabase
          .from("whatsapp_reminders")
          .update({ followup_sent_at: new Date().toISOString() } as any)
          .eq("id", reminder.id);

        sent++;
      }

      return new Response(JSON.stringify({ followups_sent: sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "notify_caretaker_missed") {
      const today = new Date().toISOString().split("T")[0];

      // Find reminders where user said "இல்லை" and caretaker not yet notified
      const { data: missed } = await supabase
        .from("whatsapp_reminders")
        .select("*")
        .eq("scheduled_date", today)
        .eq("response", "illai")
        .eq("caretaker_notified", false);

      let notified = 0;
      for (const reminder of missed || []) {
        const { data: profile } = await supabase
          .from("patient_profiles")
          .select("id, name")
          .eq("user_id", reminder.user_id)
          .single();
        if (!profile) continue;

        const { data: caretakers } = await supabase
          .from("caretakers")
          .select("name, phone")
          .eq("patient_profile_id", profile.id)
          .eq("is_active", true);

        if (!caretakers?.length) continue;

        const alertMsg = buildCaretakerAlert(profile.name, reminder.medicine_name, reminder.dosage, reminder.timing);

        for (const ct of caretakers) {
          const ctPhone = ct.phone.replace(/\s/g, "");
          await sendWhatsApp(accountSid, authToken, fromPhone, ctPhone, alertMsg);
        }

        await supabase
          .from("whatsapp_reminders")
          .update({ caretaker_notified: true } as any)
          .eq("id", reminder.id);

        notified++;
      }

      return new Response(JSON.stringify({ caretakers_notified: notified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("whatsapp-reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

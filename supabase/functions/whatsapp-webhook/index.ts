import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This webhook receives incoming WhatsApp messages from Twilio
// Configure in Twilio: POST https://<project>.supabase.co/functions/v1/whatsapp-webhook
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

    // Twilio sends form-urlencoded data
    const formData = await req.formData();
    const incomingBody = (formData.get("Body") as string || "").trim().toLowerCase();
    const fromNumber = (formData.get("From") as string || "").replace("whatsapp:", "");

    console.log(`WhatsApp reply from ${fromNumber}: "${incomingBody}"`);

    // Normalize response — accept Tamil and English
    let response: string | null = null;
    const yesVariants = ["aam", "ஆம்", "ஆம", "yes", "ha", "haan", "taken", "1", "✅"];
    const noVariants = ["illai", "இல்லை", "no", "illa", "vendam", "0", "❌"];

    if (yesVariants.some((v) => incomingBody.includes(v))) {
      response = "aam";
    } else if (noVariants.some((v) => incomingBody.includes(v))) {
      response = "illai";
    }

    if (!response) {
      // Unknown reply — send help message
      const helpMsg = `🤖 MedCircle: புரியவில்லை. தயவுசெய்து பதிலளிக்கவும்:\n✅ ஆம் — மருந்து எடுத்தேன்\n❌ இல்லை — மருந்து எடுக்கவில்லை`;
      await sendTwilioReply(accountSid, authToken, fromPhone, fromNumber, helpMsg);
      return new Response("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const phone = fromNumber.replace(/\s/g, "");

    // Find the most recent pending reminder for this phone
    const { data: reminder } = await supabase
      .from("whatsapp_reminders")
      .select("*")
      .eq("phone", phone)
      .eq("scheduled_date", today)
      .is("response", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reminder) {
      const noReminder = `🤖 MedCircle: தற்போது நிலுவையில் நினைவூட்டல் இல்லை. நன்றி! 🙏`;
      await sendTwilioReply(accountSid, authToken, fromPhone, fromNumber, noReminder);
      return new Response("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Update the reminder with the response
    await supabase
      .from("whatsapp_reminders")
      .update({
        response,
        response_at: new Date().toISOString(),
      } as any)
      .eq("id", reminder.id);

    if (response === "aam") {
      // Mark dose as taken
      const { data: existingDose } = await supabase
        .from("doses")
        .select("id")
        .eq("medicine_id", reminder.medicine_id)
        .eq("scheduled_date", today)
        .maybeSingle();

      if (existingDose) {
        await supabase.from("doses").update({
          taken: true,
          missed: false,
          taken_at: new Date().toISOString(),
        }).eq("id", existingDose.id);
      } else {
        await supabase.from("doses").insert({
          medicine_id: reminder.medicine_id,
          user_id: reminder.user_id,
          scheduled_date: today,
          scheduled_time: reminder.timing,
          taken: true,
          taken_at: new Date().toISOString(),
          missed: false,
        });
      }

      const ackMsg = `✅ நன்றி! ${reminder.medicine_name} மருந்து எடுத்ததாக பதிவு செய்யப்பட்டது. நல்ல ஆரோக்கியம் வாழ்த்துக்கள்! 🙏`;
      await sendTwilioReply(accountSid, authToken, fromPhone, fromNumber, ackMsg);
    } else {
      // User said "இல்லை" — notify caretakers
      const { data: profile } = await supabase
        .from("patient_profiles")
        .select("id, name")
        .eq("user_id", reminder.user_id)
        .single();

      if (profile) {
        const { data: caretakers } = await supabase
          .from("caretakers")
          .select("name, phone")
          .eq("patient_profile_id", profile.id)
          .eq("is_active", true);

        if (caretakers?.length) {
          const timingTamil: Record<string, string> = { morning: "காலை", afternoon: "மதியம்", night: "இரவு" };
          const alertMsg = `⚠️ MedCircle எச்சரிக்கை\n\n${profile.name} அவர்கள் ${timingTamil[reminder.timing] || reminder.timing} மருந்தை எடுக்கவில்லை:\n💊 ${reminder.medicine_name} - ${reminder.dosage}\n\nதயவுசெய்து அவர்களை சரிபார்க்கவும். 🙏\n\n— MedCircle Family Guardian`;

          for (const ct of caretakers) {
            const ctPhone = ct.phone.replace(/\s/g, "");
            await sendTwilioReply(accountSid, authToken, fromPhone, ctPhone, alertMsg);
          }
        }
      }

      await supabase
        .from("whatsapp_reminders")
        .update({ caretaker_notified: true } as any)
        .eq("id", reminder.id);

      // Mark dose as missed
      const { data: existingDose } = await supabase
        .from("doses")
        .select("id")
        .eq("medicine_id", reminder.medicine_id)
        .eq("scheduled_date", today)
        .maybeSingle();

      if (existingDose) {
        await supabase.from("doses").update({ missed: true }).eq("id", existingDose.id);
      }

      const missedAck = `📝 பதிவு செய்யப்பட்டது. உங்கள் பராமரிப்பாளருக்கு தெரிவிக்கப்பட்டுள்ளது. தயவுசெய்து விரைவில் மருந்தை எடுக்கவும். 🙏`;
      await sendTwilioReply(accountSid, authToken, fromPhone, fromNumber, missedAck);
    }

    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("whatsapp-webhook error:", error);
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
});

async function sendTwilioReply(accountSid: string, authToken: string, from: string, to: string, body: string) {
  await fetch(
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
}

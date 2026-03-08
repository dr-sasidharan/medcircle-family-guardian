import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, age, medicines, missedDoses, allergies, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const langInstruction = language === "ta" ? "Write in Tamil." : language === "hi" ? "Write in Hindi." : "Write in English.";
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const medList = medicines.map((m: any) => `${m.name} ${m.dosage} (${m.timing})`).join(", ");
    const missedList = missedDoses.length > 0 ? missedDoses.join(", ") : "None this week";
    const allergyList = allergies?.length > 0 ? allergies.join(", ") : "None reported";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a medical summary assistant. Generate concise, professional doctor visit summaries. ${langInstruction} Return plain text, under 400 words.`
          },
          {
            role: "user",
            content: `Generate a doctor visit summary for:
Patient: ${name}, Age: ${age}
Current Medicines: ${medList}
Missed Doses This Week: ${missedList}
Known Allergies: ${allergyList}

Include: 1) Current medicine list with dosages, 2) Adherence summary this week, 3) Potential interaction warnings, 4) 3-4 suggested questions for the doctor. Keep it under 400 words, plain text format, professional but warm.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Unable to generate summary.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("doctor-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symptom, medicines, age, patientName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const medicineList = medicines
      .map((m: { name: string; dosage: string; timing: string; food_instruction: string }) =>
        `${m.name} ${m.dosage} (${m.timing}, ${m.food_instruction})`)
      .join(", ");

    const systemPrompt = `You are a medical safety assistant for elderly Indian patients.
You have access to the patient's current medicine list.
Check if the reported symptom could be a side effect of any medicine.
Be cautious and always err on the side of safety.
Never diagnose. Always recommend consulting a doctor for serious symptoms.

IMPORTANT: You must respond with a valid JSON object only, no markdown, no code fences. The JSON must have these fields:
- is_side_effect: boolean
- likely_medicine: string (name of the medicine most likely causing it, or "None identified")
- urgency: one of "EMERGENCY", "URGENT", "MONITOR", "NORMAL"
- urgency_color: one of "red", "orange", "yellow", "green"
- what_to_do: array of exactly 3 short action strings
- tamil_explanation: string (a brief explanation in Tamil language)
- summary: string (one sentence summary in English)`;

    const userPrompt = `Patient medicines: ${medicineList || "No medicines recorded"}.
Patient age: ${age}. Reported symptom: ${symptom}.

1. Could this be a side effect of any of their medicines?
2. Which medicine is most likely causing it?
3. Is this an emergency or can it wait for a doctor visit?
4. What should the patient do right now?

Return ONLY the JSON object.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response, handling possible markdown fences
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = {
        is_side_effect: false,
        likely_medicine: "Unable to determine",
        urgency: "MONITOR",
        urgency_color: "yellow",
        what_to_do: ["Consult your doctor", "Monitor symptoms for 24 hours", "Stay hydrated and rest"],
        tamil_explanation: "மருத்துவரை அணுகவும்",
        summary: "Unable to fully analyze. Please consult your doctor.",
      };
    }

    return new Response(JSON.stringify({ ...parsed, patient_name: patientName }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("symptom-checker error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MedicineInfo = {
  purpose: string;
  how_to_take: string;
  side_effects: string[];
  foods_to_avoid: string[];
  drug_interactions: string;
};

const KNOWN_MEDICINES: Record<string, MedicineInfo> = {
  metformin: {
    purpose: "Metformin helps lower blood sugar in Type 2 diabetes by improving insulin sensitivity and reducing glucose production in the liver.",
    how_to_take: "Take with or after meals to reduce stomach upset. Swallow with water at the same time each day.",
    side_effects: ["Nausea", "Loose stools", "Stomach discomfort", "Metallic taste", "Reduced appetite"],
    foods_to_avoid: ["Excess alcohol", "Sugary drinks", "Very high-sugar desserts"],
    drug_interactions: "Use caution with contrast dye scans and heavy alcohol intake due to lactic acidosis risk. Tell your doctor if you use kidney-related medicines.",
  },
  amlodipine: {
    purpose: "Amlodipine is a calcium channel blocker used to lower blood pressure and reduce chest pain (angina).",
    how_to_take: "Take once daily at the same time, with or without food. Do not stop suddenly without medical advice.",
    side_effects: ["Ankle swelling", "Flushing", "Dizziness", "Headache", "Fatigue"],
    foods_to_avoid: ["Large amounts of grapefruit juice", "Very salty packaged foods"],
    drug_interactions: "Blood pressure may drop too much when combined with other antihypertensives. Monitor dizziness when standing.",
  },
  thyronorm: {
    purpose: "Thyronorm (levothyroxine) replaces thyroid hormone in hypothyroidism and supports metabolism, energy, and heart function.",
    how_to_take: "Take on an empty stomach, typically 30–60 minutes before breakfast, with water. Keep timing consistent daily.",
    side_effects: ["Palpitations", "Tremor", "Nervousness", "Sweating", "Sleep disturbance"],
    foods_to_avoid: ["Soy-heavy meals near dose time", "Calcium/iron supplements near dose time", "High-fiber meals immediately with dose"],
    drug_interactions: "Calcium, iron, and antacids reduce absorption if taken too close. Keep a 4-hour gap from these products.",
  },
  ecosprin: {
    purpose: "Ecosprin (low-dose aspirin) helps prevent blood clots, reducing risk of heart attack and stroke in selected patients.",
    how_to_take: "Take after food with water unless your doctor advised otherwise. Do not crush enteric-coated tablets.",
    side_effects: ["Stomach irritation", "Acidity", "Easy bruising", "Minor bleeding", "Nausea"],
    foods_to_avoid: ["Alcohol", "Frequent NSAID painkillers unless advised", "Very spicy meals if gastritis-prone"],
    drug_interactions: "Bleeding risk increases with anticoagulants, NSAIDs, and some supplements. Inform doctors before surgery or dental procedures.",
  },
  "calcium sandoz": {
    purpose: "Calcium Sandoz supports bone health and treats/prevents calcium deficiency.",
    how_to_take: "Take after meals as directed. Keep a time gap from thyroid tablets and some antibiotics.",
    side_effects: ["Constipation", "Bloating", "Nausea", "Mild abdominal discomfort"],
    foods_to_avoid: ["Very high-oxalate foods around dose", "Excessive caffeine", "Excess sodium intake"],
    drug_interactions: "Calcium can reduce absorption of levothyroxine, iron, and some antibiotics. Separate by at least 2–4 hours.",
  },
  "vitamin d3": {
    purpose: "Vitamin D3 improves calcium absorption and supports bone, muscle, and immune health.",
    how_to_take: "Take as prescribed, often with a meal containing fat for better absorption.",
    side_effects: ["Nausea", "Constipation", "Weakness", "Dry mouth", "Rare high-calcium symptoms"],
    foods_to_avoid: ["Unsupervised extra high-dose calcium", "Unnecessary duplicate vitamin D supplements"],
    drug_interactions: "Use caution with thiazide diuretics and high calcium intake due to hypercalcemia risk. Monitor doses if you have kidney disease.",
  },
};

const normalizeName = (name: string) => name.trim().toLowerCase();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medicine_name, dosage, language } = await req.json();
    const normalizedName = normalizeName(medicine_name || "");
    const langMap: Record<string, string> = { ta: "Tamil", hi: "Hindi", ml: "Malayalam" };
    const langInstruction = langMap[language] ? `Respond in ${langMap[language]}.` : "Respond in English.";

    // High-confidence local profiles for known medicines
    if (KNOWN_MEDICINES[normalizedName]) {
      return new Response(JSON.stringify(KNOWN_MEDICINES[normalizedName]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            content:
              `You are a pharmacist assistant. Only provide medicine-specific information for the exact medicine name provided. Avoid generic copy and avoid mixing with other drugs. Always return structured data via tool calls. ${langInstruction}`,
          },
          {
            role: "user",
            content: `Provide patient-friendly details for medicine: ${medicine_name} (dosage: ${dosage}). Include purpose, how to take, common side effects, foods/substances to avoid, and key interactions.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_medicine_info",
              description: "Return detailed medicine information",
              parameters: {
                type: "object",
                properties: {
                  purpose: { type: "string" },
                  how_to_take: { type: "string" },
                  side_effects: { type: "array", items: { type: "string" } },
                  foods_to_avoid: { type: "array", items: { type: "string" } },
                  drug_interactions: { type: "string" }
                },
                required: ["purpose", "how_to_take", "side_effects", "foods_to_avoid", "drug_interactions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_medicine_info" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("medicine-info error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


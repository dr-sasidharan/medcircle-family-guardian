import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medicine_name, dosage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a pharmacist assistant. Provide accurate, patient-friendly medicine information. Always return structured data via tool calls."
          },
          {
            role: "user",
            content: `Provide detailed information about the medicine "${medicine_name}" (dosage: ${dosage}). Include: purpose/what it treats, how to take it, common side effects, foods to avoid, and any important drug interactions or warnings.`
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
                  purpose: { type: "string", description: "2-3 sentences explaining what the medicine does and what condition it treats" },
                  how_to_take: { type: "string", description: "Clear instructions on how to take the medicine" },
                  side_effects: { type: "array", items: { type: "string" }, description: "List of 4-6 common side effects" },
                  foods_to_avoid: { type: "array", items: { type: "string" }, description: "List of 3-5 foods or substances to avoid" },
                  drug_interactions: { type: "string", description: "Important drug interaction warnings in 2-3 sentences" }
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

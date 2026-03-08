import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medicines, age, name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const medicineList = medicines.map((m: any) => `${m.name} ${m.dosage} (${m.timing}, ${m.food_instruction})`).join(", ");

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
            content: "You are a health tips assistant for elderly patients. Always return valid JSON only, no markdown."
          },
          {
            role: "user",
            content: `Patient ${name}, age ${age}, takes: ${medicineList}. Generate 3 health tips: one food interaction warning, one timing tip, one lifestyle tip. Max 2 sentences each. Warm simple language. Return JSON: {"tips":[{"type":"food"|"timing"|"lifestyle","title":"short title","content":"english tip","tamil_content":"tamil tip"}]}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_health_tips",
              description: "Return 3 health tips for the patient",
              parameters: {
                type: "object",
                properties: {
                  tips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["food", "timing", "lifestyle"] },
                        title: { type: "string" },
                        content: { type: "string" },
                        tamil_content: { type: "string" }
                      },
                      required: ["type", "title", "content", "tamil_content"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["tips"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_health_tips" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const tips = toolCall ? JSON.parse(toolCall.function.arguments) : { tips: [] };

    return new Response(JSON.stringify(tips), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("health-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

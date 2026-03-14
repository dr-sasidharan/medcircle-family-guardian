import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Layer 1: Convert drug name to RxCUI
async function getRxCUI(drugName: string): Promise<string | null> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const ids = data?.idGroup?.rxnormId;
    return ids && ids.length > 0 ? ids[0] : null;
  } catch (e) {
    console.error(`RxCUI lookup failed for ${drugName}:`, e);
    return null;
  }
}

// Layer 2: Check interactions via RxNorm
interface RxNormInteraction {
  severity: string;
  description: string;
  source: string;
}

async function getRxNormInteractions(rxcui1: string, rxcui2: string): Promise<RxNormInteraction[]> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcui1}+${rxcui2}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const interactions: RxNormInteraction[] = [];
    const pairs = data?.fullInteractionTypeGroup;
    if (!pairs) return [];

    for (const group of pairs) {
      for (const type of group.fullInteractionType || []) {
        for (const pair of type.interactionPair || []) {
          interactions.push({
            severity: pair.severity || "N/A",
            description: pair.description || "",
            source: group.sourceName || "RxNorm",
          });
        }
      }
    }
    return interactions;
  } catch (e) {
    console.error("RxNorm interaction check failed:", e);
    return [];
  }
}

// Map RxNorm severity to our verdict
function mapSeverity(rxnormInteractions: RxNormInteraction[]): "SAFE" | "CAUTION" | "DANGER" {
  const severities = rxnormInteractions.map(i => i.severity?.toLowerCase() || "");
  if (severities.some(s => s === "high" || s.includes("contraindic"))) return "DANGER";
  if (severities.length > 0) return "CAUTION";
  return "SAFE";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medicine1, medicine2, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user_id from auth header
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch { /* non-critical */ }

    // ===== LAYER 1: RxCUI Lookup =====
    const [rxcui1, rxcui2] = await Promise.all([
      getRxCUI(medicine1),
      getRxCUI(medicine2),
    ]);

    let rxnormInteractions: RxNormInteraction[] = [];
    let source = "ai";
    let verdict: "SAFE" | "CAUTION" | "DANGER" = "SAFE";
    let rxnormFound = false;

    // ===== LAYER 2: RxNorm Interaction Check =====
    if (rxcui1 && rxcui2) {
      rxnormInteractions = await getRxNormInteractions(rxcui1, rxcui2);
      if (rxnormInteractions.length > 0) {
        rxnormFound = true;
        source = "rxnorm";
        verdict = mapSeverity(rxnormInteractions);
      }
    }

    // ===== LAYER 3: AI Explanation =====
    const langLabel = language === "ta" ? "Tamil" : language === "hi" ? "Hindi" : language === "ml" ? "Malayalam" : "English";

    let aiPrompt: string;
    if (rxnormFound) {
      // AI only explains verified RxNorm data
      const interactionSummary = rxnormInteractions.map(i =>
        `Severity: ${i.severity}, Source: ${i.source}, Description: ${i.description}`
      ).join("\n");

      aiPrompt = `The following VERIFIED drug interaction data was found from the FDA/RxNorm database for ${medicine1} and ${medicine2}:

${interactionSummary}

Based ONLY on this verified data (do NOT invent any new interaction data or contradict what is stated above):
1. Explain this interaction in simple ${langLabel} that a family caretaker can understand
2. Add one practical clinical tip for the family
3. List symptoms the patient should watch for
4. Assign severity label based on the data: the RxNorm verdict is "${verdict}"`;
    } else {
      // No RxNorm data — AI provides cautious assessment
      aiPrompt = `RxNorm/FDA database did not find verified interaction data for ${medicine1} and ${medicine2}. 
${!rxcui1 ? `Note: "${medicine1}" was not found in RxNorm database.` : ""}
${!rxcui2 ? `Note: "${medicine2}" was not found in RxNorm database.` : ""}

Please provide a CAUTIOUS assessment:
1. State clearly that NO verified FDA interaction data was found
2. If you have medical knowledge of potential concerns, mention them with clear caveats
3. Explain in simple ${langLabel}
4. Add one practical tip for the family
5. List any symptoms to watch for
6. Be conservative — when in doubt, recommend consulting a doctor`;
    }

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
            content: "You are a medical information assistant. You MUST NOT invent drug interaction data. You can only explain and translate verified data. If no verified data exists, be cautious and always recommend consulting a doctor."
          },
          { role: "user", content: aiPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_interaction_result",
              description: "Return drug interaction check result",
              parameters: {
                type: "object",
                properties: {
                  verdict: { type: "string", enum: ["SAFE", "CAUTION", "DANGER"] },
                  explanation: { type: "string", description: "Plain English explanation" },
                  localized_explanation: { type: "string", description: `Explanation in ${langLabel}` },
                  clinical_tip: { type: "string", description: "One practical tip for the family" },
                  symptoms_to_watch: { type: "array", items: { type: "string" } },
                },
                required: ["verdict", "explanation", "localized_explanation", "clinical_tip", "symptoms_to_watch"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_interaction_result" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const aiResult = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    // If RxNorm found data, force the verdict from RxNorm (AI cannot override)
    if (rxnormFound) {
      aiResult.verdict = verdict;
    }

    // Build final result
    const finalResult = {
      verdict: rxnormFound ? verdict : (aiResult.verdict || "CAUTION"),
      explanation: aiResult.explanation || "",
      localized_explanation: aiResult.localized_explanation || "",
      clinical_tip: aiResult.clinical_tip || "",
      symptoms_to_watch: aiResult.symptoms_to_watch || [],
      source: rxnormFound ? "rxnorm" : "ai",
      rxcui1: rxcui1 || null,
      rxcui2: rxcui2 || null,
      rxnorm_interactions: rxnormFound ? rxnormInteractions : [],
    };

    // Log to interaction_cache
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceKey);
        await adminClient.from("interaction_cache").insert({
          user_id: userId,
          drug1: medicine1,
          drug2: medicine2,
          severity: finalResult.verdict,
          source: finalResult.source,
          rxcui1: rxcui1,
          rxcui2: rxcui2,
          interaction_data: finalResult,
        });
      } catch (e) {
        console.error("Failed to log interaction:", e);
      }
    }

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("drug-interaction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

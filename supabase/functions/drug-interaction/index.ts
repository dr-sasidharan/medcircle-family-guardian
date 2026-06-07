import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ASSISTANT_SYSTEM_PROMPT,
  ASSISTANT_TOOL_SCHEMA,
  FALLBACK_RESPONSE,
  langInstructionFor,
  type AssistantResponse,
} from "../_shared/assistant.ts";
import { loadPatientContext, summarizeContext } from "../_shared/context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== Layer 1: RxCUI =====
async function getRxCUI(drugName: string): Promise<string | null> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(
      drugName,
    )}&search=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const ids = data?.idGroup?.rxnormId;
    return ids && ids.length > 0 ? ids[0] : null;
  } catch {
    return null;
  }
}

interface RxNormInteraction {
  severity: string;
  description: string;
  source: string;
}

async function getRxNormInteractions(
  rxcui1: string,
  rxcui2: string,
): Promise<RxNormInteraction[]> {
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
  } catch {
    return [];
  }
}

function mapSeverity(
  rxs: RxNormInteraction[],
): "SAFE" | "CAUTION" | "DANGER" {
  const severities = rxs.map((i) => i.severity?.toLowerCase() || "");
  if (severities.some((s) => s === "high" || s.includes("contraindic")))
    return "DANGER";
  if (severities.length > 0) return "CAUTION";
  return "SAFE";
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { medicine1, medicine2, language, followup_prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.user.id;
    const ctx = await loadPatientContext(userId);

    const [rxcui1, rxcui2] = await Promise.all([
      getRxCUI(medicine1),
      getRxCUI(medicine2),
    ]);

    let rxnormInteractions: RxNormInteraction[] = [];
    let verdict: "SAFE" | "CAUTION" | "DANGER" = "SAFE";
    let rxnormFound = false;

    if (rxcui1 && rxcui2) {
      rxnormInteractions = await getRxNormInteractions(rxcui1, rxcui2);
      if (rxnormInteractions.length > 0) {
        rxnormFound = true;
        verdict = mapSeverity(rxnormInteractions);
      }
    }

    const langInstruction = langInstructionFor(language);
    const interactionEvidence = rxnormFound
      ? `VERIFIED RxNorm data for ${medicine1} + ${medicine2}:
${rxnormInteractions
  .map((i) => `- Severity: ${i.severity}. Source: ${i.source}. ${i.description}`)
  .join("\n")}
The verified verdict is: ${verdict}.`
      : `RxNorm has NO verified interaction data for ${medicine1} + ${medicine2}. Be cautious and recommend their doctor.`;

    const userPrompt = followup_prompt
      ? `Patient context: ${summarizeContext(ctx)}

${interactionEvidence}

Their follow-up question: "${followup_prompt}". Answer in 2-3 cards.`
      : `Patient context: ${summarizeContext(ctx)}

The patient asked whether they can take ${medicine1} together with ${medicine2}.

${interactionEvidence}

Use this card sequence:
1. hero card with emoji ${verdict === "DANGER" ? '"⚠"' : verdict === "CAUTION" ? '"🟡"' : '"✓"'}, title = "${medicine1} + ${medicine2}", subtitle = one-line plain summary, badges = ["${verdict}"${rxnormFound ? ', "FDA Verified"' : ', "AI Assessment"'}].
2. severity card titled "Interaction risk", severity = ${verdict === "DANGER" ? '"high"' : verdict === "CAUTION" ? '"moderate"' : '"low"'}, what_to_do = one short action sentence.
3. summary card titled "What this means for you" with tone matching severity — 1-2 sentences referencing the patient's situation.
4. bullets card titled "Watch for" listing 2-4 symptoms they should report if they occur. Skip if SAFE.

Then 3 followups like "Why?", "How long should I avoid?", "Alternative advice", "Tell my doctor".

NEVER invent interaction facts beyond the verified data.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `${ASSISTANT_SYSTEM_PROMPT}\n\n${langInstruction}\n\nYou MUST NOT invent drug interaction data. Only explain the verified evidence provided.`,
          },
          { role: "user", content: userPrompt },
        ],
        tools: [ASSISTANT_TOOL_SCHEMA],
        tool_choice: {
          type: "function",
          function: { name: "return_assistant_cards" },
        },
      }),
    });

    if (!r.ok) {
      const status = r.status;
      if (status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error("AI gateway error");
    }

    const aiData = await r.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let assistant: AssistantResponse = FALLBACK_RESPONSE;
    try {
      if (toolCall) assistant = JSON.parse(toolCall.function.arguments);
    } catch {}

    const summaryCard = assistant.cards.find(
      (c) => c.kind === "summary" || c.kind === "hero",
    ) as any;
    const watchCard = assistant.cards.find(
      (c) => c.kind === "bullets" && /watch/i.test((c as any).title),
    ) as any;

    const finalResult = {
      verdict,
      assistant,
      explanation:
        summaryCard?.body ||
        summaryCard?.subtitle ||
        `These medicines were checked against the RxNorm database.`,
      localized_explanation:
        summaryCard?.body || summaryCard?.subtitle || "",
      clinical_tip:
        (assistant.cards.find((c) => c.kind === "severity") as any)?.what_to_do ||
        "",
      symptoms_to_watch: watchCard?.items || [],
      source: rxnormFound ? "rxnorm" : "ai",
      rxcui1: rxcui1 || null,
      rxcui2: rxcui2 || null,
      rxnorm_interactions: rxnormFound ? rxnormInteractions : [],
    };

    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await adminClient.from("interaction_cache").insert({
        user_id: userId,
        drug1: medicine1,
        drug2: medicine2,
        severity: verdict,
        source: finalResult.source,
        rxcui1,
        rxcui2,
        interaction_data: finalResult,
      });
    } catch (e) {
      console.error("Failed to log interaction:", e);
    }

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("drug-interaction error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

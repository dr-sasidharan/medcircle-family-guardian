import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAssistant,
  langInstructionFor,
  type AssistantResponse,
} from "../_shared/assistant.ts";
import { loadPatientContext, summarizeContext } from "../_shared/context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Derive legacy fields from the assistant cards so existing dashboard heuristics still work.
function deriveLegacyFromAssistant(
  assistant: AssistantResponse,
  medicineName: string,
) {
  const findCard = (title: RegExp) =>
    assistant.cards.find(
      (c) => "title" in c && typeof c.title === "string" && title.test(c.title),
    );
  const heroOrSummary = assistant.cards.find(
    (c) => c.kind === "hero" || c.kind === "summary",
  );
  const purpose =
    (heroOrSummary as any)?.subtitle ||
    (heroOrSummary as any)?.body ||
    `Information about ${medicineName}.`;
  const howToCard = findCard(/how to take|take it|important|timing/i);
  const how_to_take =
    (howToCard as any)?.body ||
    (howToCard && "items" in howToCard ? (howToCard as any).items.join(". ") : "") ||
    "Take as your doctor advised.";
  const sideCard = findCard(/side effect|watch for|symptoms/i);
  const side_effects =
    (sideCard && "items" in sideCard ? (sideCard as any).items : []) || [];
  const foodCard = findCard(/food|avoid|diet/i);
  const foods_to_avoid =
    (foodCard && "items" in foodCard ? (foodCard as any).items : []) || [];
  const severityCard = assistant.cards.find((c) => c.kind === "severity");
  const drug_interactions =
    (severityCard as any)?.what_to_do ||
    (findCard(/interaction|warning|safety/i) as any)?.body ||
    "No major interactions flagged.";
  return {
    purpose,
    how_to_take,
    side_effects,
    foods_to_avoid,
    drug_interactions,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const user = await requireUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { medicine_name, dosage, language, followup_prompt } = body || {};
    if (!medicine_name) {
      return new Response(JSON.stringify({ error: "medicine_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = await loadPatientContext(user.id);
    const langInstruction = langInstructionFor(language);

    const userPrompt = followup_prompt
      ? `Patient context: ${summarizeContext(ctx)}

The patient is reading about ${medicine_name} ${dosage || ""}.
Their follow-up question: "${followup_prompt}".

Answer as their clinical pharmacist using 2-4 cards. End with 2-3 next follow-up chips.`
      : `Patient context: ${summarizeContext(ctx)}

Introduce the medicine "${medicine_name}" ${dosage ? `(${dosage})` : ""} to them as their clinical pharmacist.

Use this card sequence:
1. hero card with emoji "💊", title = the medicine name, subtitle = one short personalized "why you take it" line (reference their conditions if relevant)
2. summary card titled "For you" with tone "info" — 1-2 sentences on the personal benefit
3. bullets card titled "Important" with 2-4 short rules (timing, food, key warning) — items under 8 words
4. severity card ONLY IF there is a real interaction with their current medicines or allergies; severity = low/moderate/high; what_to_do = one short action sentence

Then 3-4 followups such as: "How to take it", "Side effects", "Foods to avoid", "Why my doctor prescribed it".`;

    const assistant = await callAssistant(userPrompt, langInstruction);
    const legacy = deriveLegacyFromAssistant(assistant, medicine_name);

    return new Response(JSON.stringify({ ...legacy, assistant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("medicine-info error:", e);
    const status = (e as any).status || 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

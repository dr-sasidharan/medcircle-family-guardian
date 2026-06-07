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

function deriveUrgency(assistant: AssistantResponse): {
  urgency: "EMERGENCY" | "URGENT" | "MONITOR" | "NORMAL";
  urgency_color: "red" | "orange" | "yellow" | "green";
  likely_medicine: string;
  is_side_effect: boolean;
  summary: string;
} {
  const severityCard = assistant.cards.find((c) => c.kind === "severity") as
    | { kind: "severity"; severity: string; what_to_do: string; title: string }
    | undefined;
  const sev = severityCard?.severity || "low";
  const map = {
    critical: { urgency: "EMERGENCY", urgency_color: "red" },
    high: { urgency: "URGENT", urgency_color: "orange" },
    moderate: { urgency: "MONITOR", urgency_color: "yellow" },
    low: { urgency: "NORMAL", urgency_color: "green" },
  } as const;
  const m = (map as any)[sev] || map.low;
  const heroOrSummary = assistant.cards.find(
    (c) => c.kind === "summary" || c.kind === "hero",
  );
  const summary =
    (heroOrSummary as any)?.body ||
    (heroOrSummary as any)?.subtitle ||
    "Review the guidance below.";
  // Try to extract likely medicine from a bullets/summary card mentioning "likely"
  const causeCard = assistant.cards.find(
    (c) =>
      "title" in c &&
      typeof (c as any).title === "string" &&
      /likely|cause|suspect/i.test((c as any).title),
  );
  const likely_medicine =
    (causeCard as any)?.body?.split(/[.,]/)[0] ||
    (causeCard && "items" in causeCard ? (causeCard as any).items[0] : "") ||
    "None identified";
  return {
    ...m,
    likely_medicine,
    is_side_effect: !!causeCard,
    summary,
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
    const { symptom, language, followup_prompt } = await req.json();
    if (!symptom) {
      return new Response(JSON.stringify({ error: "symptom required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ctx = await loadPatientContext(user.id);
    const langInstruction = langInstructionFor(language);

    const userPrompt = followup_prompt
      ? `Patient context: ${summarizeContext(ctx)}

They are checking the symptom "${symptom}" and now ask: "${followup_prompt}".

Answer as their clinical pharmacist using 2-4 cards.`
      : `Patient context: ${summarizeContext(ctx)}

They report this symptom right now: "${symptom}".

Use this card sequence:
1. summary card with tone matching severity — one personalized sentence ("You take Telmisartan and reported dizziness…")
2. severity card — severity (low/moderate/high/critical) and a single short what_to_do action. critical = call emergency. high = call doctor today. moderate = monitor 24h. low = likely safe.
3. bullets card titled "Likely cause" listing 1-3 of their current medicines that could explain this, OR a short non-medicine reason. Skip if no plausible cause.
4. steps card titled "What to do now" with 2-3 short numbered actions.

Then 3 followups like "Review my medicines", "When to call doctor", "Track this symptom".`;

    const assistant = await callAssistant(userPrompt, langInstruction);
    const derived = deriveUrgency(assistant);

    return new Response(
      JSON.stringify({
        assistant,
        ...derived,
        what_to_do:
          (assistant.cards.find((c) => c.kind === "steps") as any)?.steps || [],
        tamil_explanation: "",
        patient_name: ctx.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("symptom-checker error:", e);
    const status = (e as any).status || 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

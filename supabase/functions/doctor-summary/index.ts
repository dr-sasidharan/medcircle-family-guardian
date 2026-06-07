import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAssistant, langInstructionFor } from "../_shared/assistant.ts";
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

function assistantToMarkdown(assistant: any, name: string): string {
  const lines: string[] = [`# Doctor Visit Summary — ${name}`, ""];
  if (assistant.greeting) lines.push(assistant.greeting, "");
  for (const c of assistant.cards || []) {
    if (c.title) lines.push(`## ${c.emoji ? c.emoji + " " : ""}${c.title}`);
    if (c.subtitle) lines.push(`_${c.subtitle}_`);
    if (c.body) lines.push(c.body);
    if (c.items?.length) {
      for (const it of c.items) lines.push(`- ${it}`);
    }
    if (c.steps?.length) {
      c.steps.forEach((s: string, i: number) => lines.push(`${i + 1}. ${s}`));
    }
    if (c.severity) lines.push(`**Severity:** ${c.severity}`);
    if (c.what_to_do) lines.push(`**Action:** ${c.what_to_do}`);
    if (c.label && c.value) lines.push(`**${c.label}:** ${c.value}`);
    lines.push("");
  }
  if (assistant.disclaimer) lines.push("---", assistant.disclaimer);
  return lines.join("\n").trim();
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
    const { language, followup_prompt } = await req.json().catch(() => ({}));
    const ctx = await loadPatientContext(user.id);
    const langInstruction = langInstructionFor(language);

    const userPrompt = followup_prompt
      ? `Patient context: ${summarizeContext(ctx)}

Their follow-up question for the doctor visit: "${followup_prompt}". Answer in 2-3 cards.`
      : `Patient context: ${summarizeContext(ctx)}

Generate a concise doctor-visit briefing for them as their clinical pharmacist.

Use this card sequence:
1. hero card with emoji "🩺", title "Visit Brief", subtitle = "For ${ctx.name}, age ${ctx.age ?? "?"}".
2. bullets card titled "Current medicines" — list each active medicine on one short line with dosage and timing.
3. summary card titled "Adherence" with tone matching performance — 1 short sentence about last 7 days (mention missed dose count).
4. bullets card titled "Ask your doctor" — 3-4 short questions tailored to their meds and conditions.

Then 2-3 followups like "Add another question", "Print friendly version", "Email this summary".`;

    const assistant = await callAssistant(userPrompt, langInstruction);
    const summary = assistantToMarkdown(assistant, ctx.name);

    return new Response(JSON.stringify({ summary, assistant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("doctor-summary error:", e);
    const status = (e as any).status || 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

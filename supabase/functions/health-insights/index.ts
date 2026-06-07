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

Their follow-up question: "${followup_prompt}". Answer as their AI health coach in 2-3 cards.`
      : `Patient context: ${summarizeContext(ctx)}

Generate today's proactive health coaching for them as their AI health coach.

Use this card sequence:
1. summary card titled "Good morning ${ctx.name}" (or appropriate time) — 1 short sentence highlighting today's key thing for them.
2. severity card ONLY IF something needs attention (missed doses, risky food/medicine interaction in their list, no recent symptom check) — severity low/moderate/high, what_to_do = 1 short action.
3. bullets card titled "Today's tips" — 2-3 personalized tips that reference their specific medicines or conditions (timing tip, food tip, lifestyle tip). Each under 8 words.

Then 3 followups like "Log blood pressure", "Review my medicines", "What's my next dose".`;

    const assistant = await callAssistant(userPrompt, langInstruction);

    // Legacy: keep `tips` array so older callers still render something.
    const bullets = assistant.cards.find((c) => c.kind === "bullets") as any;
    const tips = (bullets?.items || []).slice(0, 3).map(
      (item: string, i: number) => ({
        type: ["food", "timing", "lifestyle"][i] || "lifestyle",
        title: item.split(":")[0]?.slice(0, 40) || `Tip ${i + 1}`,
        content: item,
        tamil_content: item,
      }),
    );

    return new Response(JSON.stringify({ assistant, tips }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("health-insights error:", e);
    const status = (e as any).status || 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

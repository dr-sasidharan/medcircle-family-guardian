// Family AI Health Companion — uses full family context (members, meds, adherence, refills, alerts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  ASSISTANT_SYSTEM_PROMPT,
  ASSISTANT_TOOL_SCHEMA,
  FALLBACK_RESPONSE,
  langInstructionFor,
} from "../_shared/assistant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const message: string = (body.message || "").toString().slice(0, 2000);
    const history: { role: string; content: string }[] = Array.isArray(body.history)
      ? body.history.slice(-8).map((m: any) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: String(m.content || "").slice(0, 4000),
        }))
      : [];
    const language: string | undefined = body.language;
    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Build family context ----
    const today = new Date().toISOString().split("T")[0];
    const { data: overview } = await supabase.rpc("get_family_overview");
    const profileIds = (overview || []).map((p: any) => p.profile_id);

    let meds: any[] = [];
    let refills: any[] = [];
    let recentDoses: any[] = [];
    let alerts: any[] = [];

    if (profileIds.length > 0) {
      const [mRes, rRes, dRes, aRes] = await Promise.all([
        supabase.from("medicines").select("id, name, dosage, timing, family_profile_id, tablets_per_dose")
          .eq("is_active", true).in("family_profile_id", profileIds),
        supabase.from("medicine_refills").select("medicine_id, tablets_remaining, family_profile_id")
          .in("family_profile_id", profileIds),
        supabase.from("doses").select("medicine_id, scheduled_date, scheduled_time, taken, missed, family_profile_id")
          .in("family_profile_id", profileIds)
          .gte("scheduled_date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0])
          .order("scheduled_date", { ascending: false }).limit(200),
        supabase.from("caregiver_notifications").select("profile_id, category, severity, message, created_at")
          .eq("caregiver_id", user.id).eq("is_read", false)
          .order("created_at", { ascending: false }).limit(20),
      ]);
      meds = mRes.data || [];
      refills = rRes.data || [];
      recentDoses = dRes.data || [];
      alerts = aRes.data || [];
    }

    const byProfile = (overview || []).map((p: any) => {
      const pm = meds.filter((m) => m.family_profile_id === p.profile_id);
      const pr = refills.filter((r) => r.family_profile_id === p.profile_id);
      const lowRefill = pm
        .map((m) => {
          const r = pr.find((x) => x.medicine_id === m.id);
          const daily = (m.timing || "").split(",").length * (m.tablets_per_dose || 1);
          const days = r ? Math.floor(r.tablets_remaining / Math.max(daily, 1)) : null;
          return { name: m.name, days_left: days };
        })
        .filter((x) => x.days_left !== null && x.days_left! <= 7);
      const weekDoses = recentDoses.filter((d) => d.family_profile_id === p.profile_id);
      const wkTaken = weekDoses.filter((d) => d.taken).length;
      const wkMissed = weekDoses.filter((d) => d.missed && !d.taken).length;
      return {
        name: p.name,
        relationship: p.relationship,
        is_self: p.is_self,
        conditions: p.conditions || [],
        status: p.status,
        today: p.status,
        medications: pm.map((m) => ({ name: m.name, dosage: m.dosage, timing: m.timing })),
        low_refills: lowRefill,
        week_taken: wkTaken,
        week_missed: wkMissed,
      };
    });

    const familyContext = JSON.stringify({
      today,
      family: byProfile,
      unread_alerts: alerts.map((a) => ({
        member: (overview || []).find((p: any) => p.profile_id === a.profile_id)?.name,
        category: a.category, severity: a.severity, message: a.message,
      })),
    });

    const langInstruction = langInstructionFor(language);
    const familySystem = `You are also the FAMILY HEALTHCARE COMPANION for this caregiver.
You understand every family member, their medicines, conditions, adherence, refills and alerts.
Always reference members by name and relationship. Be proactive — surface who needs attention.
When the user asks open questions like "who needs attention?", scan the context and answer
concretely (e.g. "Mother — missed evening dose. Grandmother — refill in 2 days.").
Use severity cards for warnings and steps cards for what to do next.

FAMILY CONTEXT JSON:
${familyContext}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `${ASSISTANT_SYSTEM_PROMPT}\n\n${langInstruction}\n\n${familySystem}` },
          ...history,
          { role: "user", content: message },
        ],
        tools: [ASSISTANT_TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "return_assistant_cards" } },
      }),
    });

    if (!r.ok) {
      const status = r.status === 429 || r.status === 402 ? r.status : 500;
      return new Response(JSON.stringify({
        error: r.status === 429 ? "Rate limit exceeded" : r.status === 402 ? "AI credits exhausted" : "AI error",
      }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    let payload = FALLBACK_RESPONSE;
    if (tc) { try { payload = JSON.parse(tc.function.arguments); } catch { /* keep fallback */ } }

    return new Response(JSON.stringify(payload), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("family-ai error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

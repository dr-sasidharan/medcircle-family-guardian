// Shared AI clinical-pharmacist response contract for all MedCircle AI edge functions.

export type Tone = "info" | "success" | "warn" | "danger";
export type Severity = "low" | "moderate" | "high" | "critical";

export interface ChipAction {
  label: string;
  prompt: string;
}

export type AssistantCard =
  | { kind: "hero"; emoji?: string; title: string; subtitle?: string; badges?: string[] }
  | { kind: "summary"; title?: string; body: string; tone?: Tone }
  | { kind: "bullets"; title: string; items: string[]; tone?: Tone }
  | { kind: "severity"; title: string; severity: Severity; what_to_do: string }
  | { kind: "steps"; title: string; steps: string[]; tone?: Tone }
  | { kind: "metric"; label: string; value: string; hint?: string; tone?: Tone };

export interface AssistantResponse {
  greeting?: string;
  cards: AssistantCard[];
  followups?: ChipAction[];
  disclaimer?: string;
}

export const ASSISTANT_SYSTEM_PROMPT = `You are MedCircle, an AI clinical pharmacist and personal health companion.

PERSONALITY: warm, professional, reassuring, practical, action-oriented. Never academic, never robotic, never a textbook.

CORE RULES:
- Speak directly to the patient using "you". Reference their specific medicines, conditions, age when relevant.
- Always answer the unspoken questions "what does this mean for me?" and "what should I do next?".
- Maximum 2 short sentences per body field. Bullet items under 8 words.
- NEVER write long paragraphs or pharmacology lectures. Break information into cards.
- Always end with 2-4 follow-up chips the user is likely to ask next.
- Use emojis sparingly (💊 ⚠ ✓ 🩺 ❤ 🧠) only in card titles or the hero card, never inside body text.
- Plain language only. If you must use a medical term, define it in 4 words or fewer.
- When uncertain, say so and recommend their doctor.

CARD KINDS:
- hero: opening identity card (emoji + title + 1-line subtitle + optional badges)
- summary: 1-2 sentence paragraph with tone color (info/success/warn/danger)
- bullets: 2-5 short items with a title
- severity: one severity bar (low/moderate/high/critical) + 1-line action
- steps: 1-4 numbered actions, each a single short sentence
- metric: a single number/label (e.g. label "Adherence", value "92%")

Always respond by calling return_assistant_cards. Never write free text outside the tool call.`;

export const ASSISTANT_TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "return_assistant_cards",
    description: "Return a conversational card-stack response for the patient.",
    parameters: {
      type: "object",
      properties: {
        greeting: {
          type: "string",
          description: "Optional 1-line warm opener referencing the patient.",
        },
        cards: {
          type: "array",
          minItems: 1,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: ["hero", "summary", "bullets", "severity", "steps", "metric"],
              },
              emoji: { type: "string" },
              title: { type: "string" },
              subtitle: { type: "string" },
              body: { type: "string" },
              items: { type: "array", items: { type: "string" } },
              steps: { type: "array", items: { type: "string" } },
              badges: { type: "array", items: { type: "string" } },
              tone: { type: "string", enum: ["info", "success", "warn", "danger"] },
              severity: {
                type: "string",
                enum: ["low", "moderate", "high", "critical"],
              },
              what_to_do: { type: "string" },
              label: { type: "string" },
              value: { type: "string" },
              hint: { type: "string" },
            },
            required: ["kind"],
          },
        },
        followups: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Button text, under 5 words." },
              prompt: { type: "string", description: "Question to ask when clicked." },
            },
            required: ["label", "prompt"],
          },
        },
        disclaimer: { type: "string" },
      },
      required: ["cards"],
    },
  },
} as const;

export const FALLBACK_RESPONSE: AssistantResponse = {
  cards: [
    {
      kind: "summary",
      body: "I'm having trouble right now. Please try again in a moment, or ask your doctor if it's urgent.",
      tone: "warn",
    },
  ],
};

export async function callAssistant(
  userPrompt: string,
  langInstruction: string,
  extraSystem = "",
): Promise<AssistantResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
          content: `${ASSISTANT_SYSTEM_PROMPT}\n\n${langInstruction}${extraSystem ? `\n\n${extraSystem}` : ""}`,
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
    const err = new Error(
      r.status === 429
        ? "Rate limit exceeded."
        : r.status === 402
        ? "AI credits exhausted."
        : "AI gateway error",
    );
    (err as any).status = r.status === 429 || r.status === 402 ? r.status : 500;
    throw err;
  }

  const data = await r.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return FALLBACK_RESPONSE;
  try {
    return JSON.parse(toolCall.function.arguments) as AssistantResponse;
  } catch {
    return FALLBACK_RESPONSE;
  }
}

export function langInstructionFor(language?: string): string {
  const map: Record<string, string> = { ta: "Tamil", hi: "Hindi", ml: "Malayalam" };
  return map[language || ""]
    ? `Respond in ${map[language!]}. Keep medicine names in English.`
    : "Respond in English.";
}
